import { useVideoHistory, VideoHistory } from '~/hooks/useVideoHistory'
import { useUserPreferences } from '~/hooks/useUserPreferences'
import { VideoConfigSchema } from '~/utils/schemas/video'

export interface Recommendation {
  config: VideoConfigSchema
  confidence: number // 0-1, 推荐置信度
  reason: string // 推荐理由
}

export function useSmartRecommendation() {
  const { history } = useVideoHistory()
  const { preferences, getMostUsedConfig } = useUserPreferences()

  // 分析历史记录，推荐配置
  const recommendConfig = (): Recommendation | null => {
    // 1. 优先使用最常用的配置
    const mostUsed = getMostUsedConfig()
    if (mostUsed) {
      return {
        config: mostUsed,
        confidence: 0.9,
        reason: '根据您最常用的配置推荐',
      }
    }

    // 2. 分析历史记录中的配置模式
    if (history.length === 0) {
      return null
    }

    // 统计配置使用频率
    const configStats: {
      detailLevel: Record<number, number>
      sentenceNumber: Record<number, number>
      outlineLevel: Record<number, number>
      outputLanguage: Record<string, number>
      showTimestamp: Record<boolean, number>
      showEmoji: Record<boolean, number>
    } = {
      detailLevel: {},
      sentenceNumber: {},
      outlineLevel: {},
      outputLanguage: {},
      showTimestamp: {},
      showEmoji: {},
    }

    // 从历史记录中提取配置（如果历史记录中保存了配置信息）
    // 注意：当前 VideoHistory 接口中没有保存配置信息，这里使用偏好设置作为备选
    const recommendedConfig: VideoConfigSchema = {
      detailLevel: preferences.defaultDetailLevel || 600,
      sentenceNumber: preferences.defaultSentenceNumber || 5,
      outlineLevel: preferences.defaultOutlineLevel || 1,
      outputLanguage: preferences.defaultOutputLanguage || '中文',
      showTimestamp: preferences.defaultShowTimestamp || false,
      showEmoji: preferences.defaultShowEmoji || true,
      enableStream: preferences.defaultEnableStream ?? true,
    }

    // 如果历史记录足够多，可以基于历史记录推荐
    if (history.length >= 3) {
      return {
        config: recommendedConfig,
        confidence: 0.7,
        reason: `基于您最近 ${history.length} 条历史记录的推荐`,
      }
    }

    // 使用默认偏好设置
    return {
      config: recommendedConfig,
      confidence: 0.5,
      reason: '基于您的偏好设置推荐',
    }
  }

  // 根据视频类型推荐配置
  const recommendConfigByVideoType = (videoService?: string): Recommendation | null => {
    const baseRecommendation = recommendConfig()
    if (!baseRecommendation) {
      return null
    }

    // 根据视频平台调整推荐
    if (videoService === 'bilibili') {
      return {
        ...baseRecommendation,
        config: {
          ...baseRecommendation.config,
          outputLanguage: '中文', // B站视频通常是中文
        },
        reason: '针对 B站 视频的推荐配置',
      }
    }

    if (videoService === 'youtube') {
      return {
        ...baseRecommendation,
        config: {
          ...baseRecommendation.config,
          outputLanguage: 'English', // YouTube 视频可能是英文
        },
        reason: '针对 YouTube 视频的推荐配置',
      }
    }

    return baseRecommendation
  }

  return {
    recommendConfig,
    recommendConfigByVideoType,
  }
}
