import { CommonSubtitleItem } from '~/lib/types'
import { isDev } from '~/utils/env'

/**
 * 提取播客音频字幕
 * 播客通常不提供字幕，主要依赖音频转文字
 */
export async function fetchPodcastSubtitle(
  videoId: string,
  shouldShowTimestamp?: boolean,
): Promise<{
  title: string
  subtitlesArray?: null | Array<CommonSubtitleItem>
  descriptionText?: string
  duration?: number
}> {
  try {
    // 播客音频通常没有字幕
    // 返回空结果，让 fetchSubtitle.ts 处理音频转文字回退
    isDev && console.log('播客音频不支持字幕提取，将回退到音频转文字')

    return {
      title: videoId,
      subtitlesArray: null,
      descriptionText: undefined,
      duration: undefined,
    }
  } catch (error) {
    console.error('Error fetching Podcast subtitle:', error)
    return {
      title: videoId,
      subtitlesArray: null,
      descriptionText: undefined,
      duration: undefined,
    }
  }
}

/**
 * 从播客URL中提取videoId
 * 播客URL格式多样，支持常见的RSS/音频链接格式
 * 例如: https://example.com/episode/123 或直接音频URL
 */
export function extractPodcastId(url: string): string | null {
  // 尝试匹配标准格式: https://example.com/episode/123
  const episodeMatch = url.match(/\/episode\/([^\/\?#]+)/)
  if (episodeMatch) {
    return episodeMatch[1]
  }

  // 尝试匹配ID格式: https://example.com/podcast?id=123
  const idMatch = url.match(/[?&]id=([^&#]+)/)
  if (idMatch) {
    return idMatch[1]
  }

  // 尝试匹配数字ID
  const numericMatch = url.match(/\/(\d{6,})(\/|\.|$)/)
  if (numericMatch) {
    return numericMatch[1]
  }

  // 如果URL本身就是音频文件，返回URL作为标识
  if (url.match(/\.(mp3|mp4|wav|ogg|m4a)$/i)) {
    return url
  }

  return null
}
