import { YoutubeSubtitleItem } from '~/utils/reduceSubtitleTimestamp'
import { isDev } from '~/utils/env'

/**
 * 解析SRT格式字幕
 */
function parseSRT(content: string): YoutubeSubtitleItem[] {
  const items: YoutubeSubtitleItem[] = []
  const blocks = content.trim().split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // 跳过序号行，找到时间戳行
    const timeLine = lines.find((line) => line.includes('-->'))
    if (!timeLine) continue

    // 解析时间戳: 00:00:00,000 --> 00:00:05,000
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
    if (!timeMatch) continue

    const startHours = parseInt(timeMatch[1], 10)
    const startMinutes = parseInt(timeMatch[2], 10)
    const startSeconds = parseInt(timeMatch[3], 10)
    const startMs = parseInt(timeMatch[4], 10)
    const start = startHours * 3600 + startMinutes * 60 + startSeconds + startMs / 1000

    // 获取文本内容（时间戳行之后的所有行）
    const textLines: string[] = []
    let foundTimeLine = false
    for (const line of lines) {
      if (foundTimeLine) {
        textLines.push(line.trim())
      } else if (line.includes('-->')) {
        foundTimeLine = true
      }
    }

    if (textLines.length > 0) {
      items.push({
        start,
        lines: textLines,
      })
    }
  }

  return items
}

/**
 * 解析VTT格式字幕
 */
function parseVTT(content: string): YoutubeSubtitleItem[] {
  const items: YoutubeSubtitleItem[] = []
  const lines = content.split('\n')
  let currentItem: { start: number; lines: string[] } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 跳过VTT头部和样式信息
    if (line.startsWith('WEBVTT') || line.startsWith('STYLE') || line.startsWith('NOTE') || !line) {
      continue
    }

    // 匹配时间戳: 00:00:00.000 --> 00:00:05.000
    const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/)
    if (timeMatch) {
      // 保存上一个item
      if (currentItem && currentItem.lines.length > 0) {
        items.push(currentItem)
      }

      const startHours = parseInt(timeMatch[1], 10)
      const startMinutes = parseInt(timeMatch[2], 10)
      const startSeconds = parseInt(timeMatch[3], 10)
      const startMs = parseInt(timeMatch[4], 10)
      const start = startHours * 3600 + startMinutes * 60 + startSeconds + startMs / 1000

      currentItem = {
        start,
        lines: [],
      }
      continue
    }

    // 如果是文本行，添加到当前item
    if (currentItem && line) {
      // 移除VTT标签（如<v>, <c>等）
      const cleanLine = line.replace(/<[^>]+>/g, '').trim()
      if (cleanLine) {
        currentItem.lines.push(cleanLine)
      }
    }
  }

  // 添加最后一个item
  if (currentItem && currentItem.lines.length > 0) {
    items.push(currentItem)
  }

  return items
}

/**
 * 解析JSON格式字幕（YouTube API格式）
 */
function parseJSON(content: string): YoutubeSubtitleItem[] {
  try {
    const data = JSON.parse(content)
    const items: YoutubeSubtitleItem[] = []

    // 处理不同的JSON格式
    if (Array.isArray(data)) {
      // 格式: [{ start: number, duration: number, text: string }]
      for (const item of data) {
        if (item.start !== undefined && item.text) {
          items.push({
            start: item.start,
            lines: [item.text],
          })
        } else if (item.startTime !== undefined && item.text) {
          // 格式: [{ startTime: string, text: string }]
          const startMatch = item.startTime.match(/(\d+):(\d+):(\d+)[.,](\d+)/)
          if (startMatch) {
            const hours = parseInt(startMatch[1], 10)
            const minutes = parseInt(startMatch[2], 10)
            const seconds = parseInt(startMatch[3], 10)
            const ms = parseInt(startMatch[4], 10)
            const start = hours * 3600 + minutes * 60 + seconds + ms / 1000
            items.push({
              start,
              lines: [item.text],
            })
          }
        }
      }
    } else if (data.events) {
      // YouTube字幕JSON格式: { events: [{ segs: [{ utf8: string }], tStartMs: number }] }
      for (const event of data.events) {
        if (event.segs && event.tStartMs !== undefined) {
          const text = event.segs
            .map((seg: any) => seg.utf8 || '')
            .join('')
            .trim()
          if (text) {
            items.push({
              start: event.tStartMs / 1000,
              lines: [text],
            })
          }
        }
      }
    }

    return items
  } catch (error) {
    isDev && console.error('解析JSON字幕失败:', error)
    return []
  }
}

/**
 * 根据文件扩展名和内容自动解析字幕文件
 */
export function parseYoutubeSubtitle(content: string, format?: string): YoutubeSubtitleItem[] {
  // 如果指定了格式，直接使用对应解析器
  if (format) {
    const lowerFormat = format.toLowerCase()
    if (lowerFormat === 'srt') {
      return parseSRT(content)
    } else if (lowerFormat === 'vtt' || lowerFormat === 'webvtt') {
      return parseVTT(content)
    } else if (lowerFormat === 'json') {
      return parseJSON(content)
    }
  }

  // 自动检测格式
  const trimmedContent = content.trim()

  // 检查是否是JSON格式
  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
    return parseJSON(content)
  }

  // 检查是否是VTT格式
  if (trimmedContent.startsWith('WEBVTT')) {
    return parseVTT(content)
  }

  // 检查是否是SRT格式（包含序号和时间戳）
  if (trimmedContent.match(/^\d+\s*\n\d{2}:\d{2}:\d{2}/)) {
    return parseSRT(content)
  }

  // 默认尝试SRT格式
  isDev && console.warn('无法自动识别字幕格式，尝试SRT格式解析')
  return parseSRT(content)
}
