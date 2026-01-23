import { useLocalStorage } from '~/hooks/useLocalStorage'
import { VideoConfigSchema } from '~/utils/schemas/video'

export interface UserPreferences {
  // 总结偏好
  defaultDetailLevel?: number
  defaultSentenceNumber?: number
  defaultOutlineLevel?: number
  defaultOutputLanguage?: string
  defaultShowTimestamp?: boolean
  defaultShowEmoji?: boolean
  defaultEnableStream?: boolean

  // 使用统计
  mostUsedConfig?: VideoConfigSchema
  configUsageCount?: Record<string, number> // 配置组合的使用次数

  // 最后更新时间
  lastUpdated?: number
}

const defaultPreferences: UserPreferences = {
  defaultDetailLevel: 600,
  defaultSentenceNumber: 5,
  defaultOutlineLevel: 1,
  defaultOutputLanguage: '中文',
  defaultShowTimestamp: false,
  defaultShowEmoji: true,
  defaultEnableStream: true,
  configUsageCount: {},
  lastUpdated: Date.now(),
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>('user-preferences', defaultPreferences)

  // 更新偏好设置
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...updates,
      lastUpdated: Date.now(),
    }))
  }

  // 记录配置使用
  const recordConfigUsage = (config: VideoConfigSchema) => {
    const configKey = JSON.stringify(config)
    setPreferences((prev) => {
      const count = (prev.configUsageCount || {})[configKey] || 0
      return {
        ...prev,
        configUsageCount: {
          ...(prev.configUsageCount || {}),
          [configKey]: count + 1,
        },
        lastUpdated: Date.now(),
      }
    })
  }

  // 获取最常用的配置
  const getMostUsedConfig = (): VideoConfigSchema | null => {
    const usageCount = preferences.configUsageCount || {}
    if (Object.keys(usageCount).length === 0) {
      return null
    }

    const sorted = Object.entries(usageCount).sort((a, b) => b[1] - a[1])
    const mostUsedKey = sorted[0][0]
    try {
      return JSON.parse(mostUsedKey) as VideoConfigSchema
    } catch {
      return null
    }
  }

  // 重置偏好设置
  const resetPreferences = () => {
    setPreferences(defaultPreferences)
  }

  return {
    preferences: preferences || defaultPreferences,
    updatePreferences,
    recordConfigUsage,
    getMostUsedConfig,
    resetPreferences,
  }
}
