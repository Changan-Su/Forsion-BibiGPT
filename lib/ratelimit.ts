import Redis from 'ioredis'
import { FREE_LIMIT_COUNT, LOGIN_LIMIT_COUNT } from '~/utils/constants'

// 创建Redis连接
const getRedisClient = () => {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })
}

// 将时间窗口转换为秒数
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)\s*(s|m|h|d)$/)
  if (!match) {
    throw new Error(`Invalid window format: ${window}`)
  }
  const [, value, unit] = match
  const num = parseInt(value)
  switch (unit) {
    case 's':
      return num
    case 'm':
      return num * 60
    case 'h':
      return num * 3600
    case 'd':
      return num * 86400
    default:
      throw new Error(`Unknown unit: ${unit}`)
  }
}

// 速率限制器类（兼容@upstash/ratelimit接口）
export class Ratelimit {
  private redis: Redis
  private limit: number
  private window: number
  private prefix: string

  constructor(config: { redis: Redis; limiter: { limit: number; window: string }; analytics?: boolean }) {
    this.redis = config.redis
    this.limit = config.limiter.limit
    this.window = parseWindow(config.limiter.window)
    this.prefix = '@upstash/ratelimit'
  }

  async checkLimit(identifier: string): Promise<{ success: boolean; remaining: number }> {
    const key = `${this.prefix}:${identifier}`
    const now = Math.floor(Date.now() / 1000)
    const windowStart = Math.floor(now / this.window) * this.window
    const windowKey = `${key}:${windowStart}`

    try {
      // 使用Redis的INCR和EXPIRE实现固定窗口速率限制
      const count = await this.redis.incr(windowKey)

      // 如果是第一次访问，设置过期时间
      if (count === 1) {
        await this.redis.expire(windowKey, this.window)
      }

      const remaining = Math.max(0, this.limit - count)
      const success = count <= this.limit

      return {
        success,
        remaining,
      }
    } catch (error) {
      console.error('Rate limit error:', error)
      // 如果Redis出错，允许请求通过（fail open）
      return {
        success: true,
        remaining: this.limit,
      }
    }
  }
}

// 创建Redis客户端实例
const redis = getRedisClient()

// 导出速率限制器实例
export const ratelimitForIps = new Ratelimit({
  redis,
  limiter: { limit: FREE_LIMIT_COUNT, window: '1 d' },
  analytics: true,
})

export const ratelimitForApiKeyIps = new Ratelimit({
  redis,
  limiter: { limit: FREE_LIMIT_COUNT * 2, window: '1 d' },
  analytics: true,
})

export const ratelimitForFreeAccounts = new Ratelimit({
  redis,
  limiter: { limit: LOGIN_LIMIT_COUNT, window: '1 d' },
  analytics: true,
})

// 导出Redis客户端供其他模块使用
export { redis }
