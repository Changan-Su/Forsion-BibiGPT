import { CommonSubtitleItem } from '~/lib/types'
import { isDev } from '~/utils/env'

/**
 * 提取会议录制字幕
 * 会议录制通常不提供字幕，主要依赖音频转文字
 */
export async function fetchMeetingSubtitle(
  videoId: string,
  shouldShowTimestamp?: boolean,
): Promise<{
  title: string
  subtitlesArray?: null | Array<CommonSubtitleItem>
  descriptionText?: string
  duration?: number
}> {
  try {
    // 会议录制通常没有字幕
    // 返回空结果，让 fetchSubtitle.ts 处理音频转文字回退
    isDev && console.log('会议录制不支持字幕提取，将回退到音频转文字')

    return {
      title: videoId,
      subtitlesArray: null,
      descriptionText: undefined,
      duration: undefined,
    }
  } catch (error) {
    console.error('Error fetching Meeting subtitle:', error)
    return {
      title: videoId,
      subtitlesArray: null,
      descriptionText: undefined,
      duration: undefined,
    }
  }
}

/**
 * 从会议URL中提取videoId
 * 会议URL格式多样，支持常见的Zoom/Teams/会议平台格式
 * 例如: https://zoom.us/recording/123 或直接视频URL
 */
export function extractMeetingId(url: string): string | null {
  // 尝试匹配Zoom格式: https://zoom.us/recording/123
  const zoomMatch = url.match(/zoom\.us\/rec\/([^\/\?#]+)/)
  if (zoomMatch) {
    return zoomMatch[1]
  }

  // 尝试匹配Teams格式: https://teams.microsoft.com/xxx/meetingId
  const teamsMatch = url.match(/teams\.microsoft\.com\/[^\/]+\/([^\/\?#]+)/)
  if (teamsMatch) {
    return teamsMatch[1]
  }

  // 尝试匹配ID格式: https://example.com/meeting?id=123
  const idMatch = url.match(/[?&]id=([^&#]+)/)
  if (idMatch) {
    return idMatch[1]
  }

  // 尝试匹配数字ID
  const numericMatch = url.match(/\/(\d{6,})(\/|\.|$)/)
  if (numericMatch) {
    return numericMatch[1]
  }

  // 如果URL本身就是视频文件，返回URL作为标识
  if (url.match(/\.(mp4|webm|mov|avi)$/i)) {
    return url
  }

  return null
}
