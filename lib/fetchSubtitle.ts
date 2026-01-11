import { fetchBilibiliSubtitle } from './bilibili/fetchBilibiliSubtitle'
import { CommonSubtitleItem, VideoConfig, VideoService } from './types'
import { fetchYoutubeSubtitle } from './youtube/fetchYoutubeSubtitle'
import { fetchAudio, checkAudioExtractionSupport } from './audio/fetchAudioUrl'
import { transcribeVideoAudio } from './audio/transcribeAudio'
import { isDev } from '~/utils/env'

/**
 * 从视频提取字幕，如果字幕不存在则尝试音频转文字
 */
export async function fetchSubtitle(
  videoConfig: VideoConfig,
  shouldShowTimestamp?: boolean,
  userKey?: string,
  enableAudioTranscription: boolean = true, // 默认启用音频转文字回退
): Promise<{
  title: string
  subtitlesArray?: null | Array<CommonSubtitleItem>
  descriptionText?: string
  duration?: number // 视频时长（秒数）
  source?: 'subtitle' | 'audio' // 标注内容来源
}> {
  const { service, videoId, pageNumber } = videoConfig
  console.log('video: ', videoConfig)

  let result: {
    title: string
    subtitlesArray?: null | Array<CommonSubtitleItem>
    descriptionText?: string
    duration?: number
    source?: 'subtitle' | 'audio'
  }

  // 首先尝试提取字幕
  if (service === VideoService.Youtube) {
    result = await fetchYoutubeSubtitle(videoId, shouldShowTimestamp)
  } else {
    result = await fetchBilibiliSubtitle(videoId, pageNumber, shouldShowTimestamp)
  }

  result.source = 'subtitle'

  // 如果字幕提取成功，直接返回
  if (result.subtitlesArray && result.subtitlesArray.length > 0) {
    return result
  }

  // 如果只有描述文本，也返回（不进行音频转文字）
  if (result.descriptionText) {
    return result
  }

  // 字幕提取失败，尝试音频转文字（如果启用）
  if (!enableAudioTranscription) {
    isDev && console.log('音频转文字未启用，跳过音频提取')
    return result
  }

  // 检查 service 是否存在
  if (!service) {
    isDev && console.warn('视频服务类型未指定，无法进行音频转文字')
    return result
  }

  try {
    // 检查是否支持音频提取
    const isSupported = await checkAudioExtractionSupport()
    if (!isSupported) {
      isDev && console.warn('yt-dlp 未安装，无法进行音频转文字')
      return result
    }

    isDev && console.log('字幕提取失败，尝试使用音频转文字...')

    // 使用 yt-dlp 直接下载音频文件
    const { audioBuffer, title, duration } = await fetchAudio(service, videoId, pageNumber)

    // 使用 Whisper API 转录音频
    const { subtitlesArray, duration: audioDuration } = await transcribeVideoAudio(
      audioBuffer,
      videoConfig,
      userKey,
      shouldShowTimestamp,
    )

    isDev && console.log('音频转文字成功，获得', subtitlesArray.length, '条字幕')

    return {
      title: title || result.title,
      subtitlesArray,
      descriptionText: result.descriptionText,
      duration: audioDuration || duration || result.duration,
      source: 'audio',
    }
  } catch (error: any) {
    console.error('音频转文字失败:', error)
    // 如果音频转文字失败，返回原始结果（无字幕）
    return result
  }
}
