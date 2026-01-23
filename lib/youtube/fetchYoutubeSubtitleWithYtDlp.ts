import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, unlink, mkdtemp, readdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseYoutubeSubtitle } from './parseYoutubeSubtitle'
import { YoutubeSubtitleItem } from '~/utils/reduceSubtitleTimestamp'
import { isDev } from '~/utils/env'

const execAsync = promisify(exec)

/**
 * 使用yt-dlp提取YouTube字幕
 */
export async function fetchYoutubeSubtitleWithYtDlp(
  videoId: string,
  shouldShowTimestamp?: boolean,
): Promise<{
  title: string
  subtitlesArray: YoutubeSubtitleItem[] | null
  descriptionText?: string
  duration?: number
}> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const tempDir = await mkdtemp(join(tmpdir(), 'bibi-gpt-youtube-subtitle-'))

  try {
    // 检查yt-dlp是否安装
    try {
      await execAsync('yt-dlp --version')
    } catch {
      throw new Error('yt-dlp 未安装')
    }

    isDev && console.log('开始使用 yt-dlp 提取YouTube字幕...', { videoId, tempDir })

    // 获取视频信息（标题和时长）
    let title = videoId
    let duration: number | undefined = undefined

    try {
      const infoCommand = `yt-dlp --get-title --get-duration --no-playlist "${videoUrl}"`
      const infoResult = await execAsync(infoCommand, { timeout: 30000 })
      const infoLines = infoResult.stdout
        .trim()
        .split('\n')
        .filter((line) => line.trim())
      if (infoLines.length > 0) {
        title = infoLines[0].trim()
      }
      if (infoLines.length > 1) {
        // 时长格式: HH:MM:SS 或 MM:SS 或 秒数
        const durationStr = infoLines[1].trim()
        const durationParts = durationStr.split(':')
        if (durationParts.length === 3) {
          // HH:MM:SS
          duration =
            parseInt(durationParts[0], 10) * 3600 + parseInt(durationParts[1], 10) * 60 + parseFloat(durationParts[2])
        } else if (durationParts.length === 2) {
          // MM:SS
          duration = parseInt(durationParts[0], 10) * 60 + parseFloat(durationParts[1])
        } else {
          // 纯秒数
          duration = parseFloat(durationStr)
        }
      }
    } catch (error) {
      isDev && console.warn('获取视频信息失败，使用默认值:', error)
    }

    // 构建yt-dlp命令提取字幕
    // 优先选择中文字幕，其次英文，最后自动生成字幕
    const subtitlePath = join(tempDir, 'subtitle.%(ext)s').replace(/\\/g, '/')
    const subtitlePathQuoted = subtitlePath.includes(' ') ? `"${subtitlePath}"` : subtitlePath
    const videoUrlQuoted = videoUrl.includes(' ') ? `"${videoUrl.replace(/"/g, '\\"')}"` : videoUrl

    // 尝试提取字幕（优先vtt格式，因为解析更简单）
    // 语言优先级: zh, zh-Hans, zh-Hant, en, 自动生成
    const command = `yt-dlp --write-subs --write-auto-subs --sub-lang zh,zh-Hans,zh-Hant,en --skip-download --sub-format vtt/best --output ${subtitlePathQuoted} --no-playlist ${videoUrlQuoted}`

    isDev && console.log('执行yt-dlp命令:', command)

    try {
      const result = await execAsync(command, {
        timeout: 60000, // 60秒超时
        maxBuffer: 10 * 1024 * 1024, // 10MB缓冲区
      })

      if (result.stderr && !result.stderr.includes('WARNING')) {
        isDev && console.warn('yt-dlp警告:', result.stderr.slice(0, 500))
      }
    } catch (error: any) {
      // 检查是否是"没有字幕"的错误
      const errorOutput = error.stderr || error.stdout || error.message || ''
      if (
        errorOutput.includes('subtitles not available') ||
        errorOutput.includes('No subtitles') ||
        errorOutput.includes('没有字幕')
      ) {
        isDev && console.log('该视频没有字幕')
        return { title, subtitlesArray: null, descriptionText: undefined, duration }
      }
      throw error
    }

    // 查找生成的字幕文件
    const files = await readdir(tempDir)
    const subtitleFiles = files.filter(
      (file) => file.includes('subtitle') && (file.endsWith('.vtt') || file.endsWith('.srt') || file.endsWith('.json')),
    )

    if (subtitleFiles.length === 0) {
      isDev && console.warn('未找到字幕文件')
      return { title, subtitlesArray: null, descriptionText: undefined, duration }
    }

    // 优先选择中文字幕文件
    let selectedFile = subtitleFiles.find(
      (file) => file.includes('.zh') || file.includes('zh-Hans') || file.includes('zh-Hant'),
    )
    if (!selectedFile) {
      // 其次选择英文
      selectedFile = subtitleFiles.find((file) => file.includes('.en'))
    }
    if (!selectedFile) {
      // 最后选择第一个可用文件
      selectedFile = subtitleFiles[0]
    }

    const subtitleFilePath = join(tempDir, selectedFile)
    isDev && console.log('选择字幕文件:', subtitleFilePath)

    // 读取字幕文件
    const subtitleContent = await readFile(subtitleFilePath, 'utf-8')

    // 根据文件扩展名确定格式
    const fileExt = selectedFile.split('.').pop()?.toLowerCase() || 'vtt'
    const subtitleItems = parseYoutubeSubtitle(subtitleContent, fileExt)

    if (subtitleItems.length === 0) {
      isDev && console.warn('字幕解析结果为空')
      return { title, subtitlesArray: null, descriptionText: undefined, duration }
    }

    isDev && console.log(`成功提取${subtitleItems.length}条字幕`)

    // 清理临时文件
    try {
      for (const file of files) {
        await unlink(join(tempDir, file))
      }
    } catch (cleanupError) {
      isDev && console.warn('清理临时文件失败:', cleanupError)
    }

    return {
      title,
      subtitlesArray: subtitleItems,
      descriptionText: undefined,
      duration,
    }
  } catch (error: any) {
    isDev && console.error('使用yt-dlp提取YouTube字幕失败:', error)

    // 清理临时文件
    try {
      const files = await readdir(tempDir)
      for (const file of files) {
        await unlink(join(tempDir, file))
      }
    } catch (cleanupError) {
      // 忽略清理错误
    }

    throw error
  }
}
