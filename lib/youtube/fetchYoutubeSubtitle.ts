import { YoutubeSubtitleItem, reduceYoutubeSubtitleTimestamp } from '~/utils/reduceSubtitleTimestamp'
import { CommonSubtitleItem } from '~/lib/types'
import { fetchYoutubeSubtitleWithYtDlp } from './fetchYoutubeSubtitleWithYtDlp'
import { fetchYoutubeSubtitleWithSavesubs } from './fetchYoutubeSubtitleWithSavesubs'
import { checkAudioExtractionSupport } from '~/lib/audio/fetchAudioUrl'
import { isDev } from '~/utils/env'

/**
 * 提取YouTube视频字幕
 * 实现多层级回退机制：
 * 1. 优先使用yt-dlp（如果已安装）
 * 2. 回退到savesubs.com服务（如果配置了API token）
 * 3. 最后回退到音频转文字（由fetchSubtitle.ts处理）
 */
export async function fetchYoutubeSubtitle(
  videoId: string,
  shouldShowTimestamp?: boolean,
): Promise<{
  title: string
  subtitlesArray?: null | Array<CommonSubtitleItem>
  descriptionText?: string
  duration?: number
}> {
  // 方法1: 尝试使用yt-dlp提取字幕
  const hasYtDlp = await checkAudioExtractionSupport()
  if (hasYtDlp) {
    try {
      isDev && console.log('尝试使用yt-dlp提取YouTube字幕...')
      const result = await fetchYoutubeSubtitleWithYtDlp(videoId, shouldShowTimestamp)
      if (result.subtitlesArray && result.subtitlesArray.length > 0) {
        isDev && console.log('✓ 使用yt-dlp成功提取字幕')
        // 转换为CommonSubtitleItem格式
        const subtitlesArray = reduceYoutubeSubtitleTimestamp(result.subtitlesArray, shouldShowTimestamp)
        return {
          title: result.title,
          subtitlesArray,
          descriptionText: result.descriptionText,
          duration: result.duration,
        }
      }
      isDev && console.log('yt-dlp未找到字幕，尝试其他方法...')
    } catch (error: any) {
      isDev && console.warn('yt-dlp提取字幕失败:', error.message || error)
      // 继续尝试其他方法
    }
  } else {
    isDev && console.log('yt-dlp未安装，跳过yt-dlp方法')
  }

  // 方法2: 尝试使用savesubs.com服务
  if (process.env.SAVESUBS_X_AUTH_TOKEN) {
    try {
      isDev && console.log('尝试使用savesubs.com提取YouTube字幕...')
      const result = await fetchYoutubeSubtitleWithSavesubs(videoId, shouldShowTimestamp)
      if (result.subtitlesArray && result.subtitlesArray.length > 0) {
        isDev && console.log('✓ 使用savesubs.com成功提取字幕')
        // 转换为CommonSubtitleItem格式
        const subtitlesArray = reduceYoutubeSubtitleTimestamp(result.subtitlesArray, shouldShowTimestamp)
        return {
          title: result.title,
          subtitlesArray,
          descriptionText: result.descriptionText,
          duration: result.duration,
        }
      }
      isDev && console.log('savesubs.com未找到字幕，尝试其他方法...')
    } catch (error: any) {
      isDev && console.warn('savesubs.com提取字幕失败:', error.message || error)
      // 继续尝试其他方法
    }
  } else {
    isDev && console.log('SAVESUBS_X_AUTH_TOKEN未配置，跳过savesubs.com方法')
  }

  // 方法3: 返回空结果，让fetchSubtitle.ts处理音频转文字回退
  isDev && console.log('所有字幕提取方法都失败，将回退到音频转文字')
  return {
    title: videoId,
    subtitlesArray: null,
    descriptionText: undefined,
    duration: undefined,
  }
}
