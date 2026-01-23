import { fetchYoutubeSubtitleUrls } from './fetchYoutubeSubtitleUrls'
import { parseYoutubeSubtitle } from './parseYoutubeSubtitle'
import { YoutubeSubtitleItem } from '~/utils/reduceSubtitleTimestamp'
import { isDev } from '~/utils/env'

/**
 * 使用savesubs.com服务提取YouTube字幕
 */
export async function fetchYoutubeSubtitleWithSavesubs(
  videoId: string,
  shouldShowTimestamp?: boolean,
): Promise<{
  title: string
  subtitlesArray: YoutubeSubtitleItem[] | null
  descriptionText?: string
  duration?: number
}> {
  try {
    // 检查是否配置了API token
    if (!process.env.SAVESUBS_X_AUTH_TOKEN) {
      throw new Error('SAVESUBS_X_AUTH_TOKEN 未配置')
    }

    isDev && console.log('使用savesubs.com提取YouTube字幕...', { videoId })

    // 获取字幕URL列表
    const { title, subtitleList } = await fetchYoutubeSubtitleUrls(videoId)

    if (!subtitleList || subtitleList.length === 0) {
      isDev && console.warn('savesubs.com未返回字幕列表')
      return { title: title || videoId, subtitlesArray: null, descriptionText: undefined }
    }

    // 优先选择中文字幕，其次英文，最后选择第一个可用
    let selectedSubtitle: any = null

    // 查找中文字幕
    selectedSubtitle =
      subtitleList.find(
        (sub: any) =>
          sub.lang === 'zh' ||
          sub.lang === 'zh-Hans' ||
          sub.lang === 'zh-Hant' ||
          sub.lang === 'zh-CN' ||
          sub.lang === 'zh-TW',
      ) || null

    // 如果没有中文，查找英文
    if (!selectedSubtitle) {
      selectedSubtitle = subtitleList.find((sub: any) => sub.lang === 'en' || sub.lang === 'en-US') || null
    }

    // 如果还没有，选择第一个
    if (!selectedSubtitle) {
      selectedSubtitle = subtitleList[0]
    }

    if (!selectedSubtitle || !selectedSubtitle.url) {
      isDev && console.warn('未找到可用的字幕URL')
      return { title: title || videoId, subtitlesArray: null, descriptionText: undefined }
    }

    isDev && console.log('选择字幕:', { lang: selectedSubtitle.lang, url: selectedSubtitle.url })

    // 下载字幕文件
    const subtitleUrl = selectedSubtitle.url.startsWith('//')
      ? `https:${selectedSubtitle.url}`
      : selectedSubtitle.url.startsWith('http')
      ? selectedSubtitle.url
      : `https://savesubs.com${selectedSubtitle.url}`

    const response = await fetch(subtitleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`下载字幕文件失败: ${response.status} ${response.statusText}`)
    }

    const subtitleContent = await response.text()

    // 根据URL或格式确定字幕格式
    let format: string | undefined = undefined
    if (subtitleUrl.includes('.srt')) {
      format = 'srt'
    } else if (subtitleUrl.includes('.vtt') || subtitleUrl.includes('.webvtt')) {
      format = 'vtt'
    } else if (subtitleUrl.includes('.json')) {
      format = 'json'
    } else if (selectedSubtitle.format) {
      format = selectedSubtitle.format.toLowerCase()
    }

    // 解析字幕
    const subtitleItems = parseYoutubeSubtitle(subtitleContent, format)

    if (subtitleItems.length === 0) {
      isDev && console.warn('字幕解析结果为空')
      return { title: title || videoId, subtitlesArray: null, descriptionText: undefined }
    }

    isDev && console.log(`成功提取${subtitleItems.length}条字幕`)

    // 尝试从subtitleList中提取时长信息
    let duration: number | undefined = undefined
    if (selectedSubtitle.duration) {
      // 处理时长字符串格式
      const durationStr = String(selectedSubtitle.duration)
      const durationParts = durationStr.split(':')
      if (durationParts.length === 3) {
        duration =
          parseInt(durationParts[0], 10) * 3600 + parseInt(durationParts[1], 10) * 60 + parseFloat(durationParts[2])
      } else if (durationParts.length === 2) {
        duration = parseInt(durationParts[0], 10) * 60 + parseFloat(durationParts[1])
      } else {
        duration = parseFloat(durationStr)
      }
    }

    return {
      title: title || videoId,
      subtitlesArray: subtitleItems,
      descriptionText: undefined,
      duration,
    }
  } catch (error: any) {
    isDev && console.error('使用savesubs.com提取YouTube字幕失败:', error)
    throw error
  }
}
