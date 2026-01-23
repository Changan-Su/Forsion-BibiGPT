import { isDev } from '~/utils/env'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 通过 Douyin_TikTok_Download_API 获取抖音视频信息
 * 支持两种模式：
 * 1. HTTP API 模式：调用部署的 API 服务
 * 2. Python 脚本模式：调用本地 Python 脚本
 */
export async function fetchDouyinWithAPI(videoId: string): Promise<{
  title: string
  duration?: number
  videoUrl?: string
  audioUrl?: string
}> {
  // 构建抖音视频URL
  const videoUrl = videoId.includes('http') ? videoId : `https://www.douyin.com/video/${videoId}`

  isDev && console.log('尝试通过 Douyin API 获取视频信息:', videoUrl)

  // 优先尝试 HTTP API 模式
  const apiBaseUrl = process.env.DOUYIN_API_BASE_URL
  if (apiBaseUrl) {
    try {
      return await fetchDouyinViaHTTPAPI(apiBaseUrl, videoUrl)
    } catch (error: any) {
      isDev && console.warn('HTTP API 调用失败，尝试 Python 脚本模式:', error.message?.slice(0, 200))
      // 如果 HTTP API 失败，继续尝试 Python 脚本（如果可用）
    }
  }

  // 回退到 Python 脚本模式
  const pythonScriptPath = process.env.DOUYIN_PYTHON_SCRIPT_PATH || 'scripts/douyin_fetch.py'
  try {
    // 检查脚本文件是否存在（简单检查）
    const { access, constants } = await import('fs/promises')
    try {
      await access(pythonScriptPath, constants.F_OK)
      return await fetchDouyinViaPythonScript(videoUrl)
    } catch {
      // 脚本文件不存在，跳过 Python 模式
      throw new Error(`Python 脚本不存在: ${pythonScriptPath}`)
    }
  } catch (error: any) {
    isDev && console.error('Python 脚本模式失败:', error.message?.slice(0, 200))

    // 提供清晰的错误信息
    if (apiBaseUrl) {
      throw new Error(
        `Douyin API 调用失败。HTTP API (${apiBaseUrl}) 和 Python 脚本模式都失败。` + `最后错误: ${error.message}`,
      )
    } else {
      throw new Error(
        `Douyin API 未配置。请设置 DOUYIN_API_BASE_URL 环境变量以启用 HTTP API 模式，` +
          `或配置 DOUYIN_PYTHON_SCRIPT_PATH 以使用 Python 脚本模式。` +
          `当前错误: ${error.message}`,
      )
    }
  }
}

/**
 * 通过 HTTP API 调用 Douyin_TikTok_Download_API
 */
async function fetchDouyinViaHTTPAPI(
  apiBaseUrl: string,
  videoUrl: string,
): Promise<{
  title: string
  duration?: number
  videoUrl?: string
  audioUrl?: string
}> {
  // 移除末尾的斜杠
  const baseUrl = apiBaseUrl.replace(/\/$/, '')

  // 根据项目文档，API 端点通常是 /api/douyin/web
  // 参考: https://github.com/Evil0ctal/Douyin_TikTok_Download_API
  const apiUrl = `${baseUrl}/api/douyin/web`

  isDev && console.log('调用 Douyin API:', apiUrl)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: videoUrl,
    }),
    signal: AbortSignal.timeout(30000), // 30秒超时
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 请求失败 (${response.status}): ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()

  // 解析 API 响应
  // 根据项目文档，响应格式可能包含：
  // - data.title: 视频标题
  // - data.duration: 视频时长（秒）
  // - data.video_url: 视频 URL
  // - data.audio_url: 音频 URL
  // 实际格式可能因项目版本而异，需要根据实际情况调整

  const result: {
    title: string
    duration?: number
    videoUrl?: string
    audioUrl?: string
  } = {
    title: data.data?.title || data.title || videoUrl,
  }

  if (data.data?.duration || data.duration) {
    result.duration = parseFloat(data.data?.duration || data.duration)
  }

  if (data.data?.video_url || data.video_url) {
    result.videoUrl = data.data?.video_url || data.video_url
  }

  if (data.data?.audio_url || data.audio_url) {
    result.audioUrl = data.data?.audio_url || data.audio_url
  }

  isDev && console.log('✓ 通过 HTTP API 成功获取抖音视频信息:', result)

  return result
}

/**
 * 通过 Python 脚本调用 Douyin_TikTok_Download_API 的核心逻辑
 * 这需要项目代码已克隆到本地
 */
async function fetchDouyinViaPythonScript(videoUrl: string): Promise<{
  title: string
  duration?: number
  videoUrl?: string
  audioUrl?: string
}> {
  const scriptPath = process.env.DOUYIN_PYTHON_SCRIPT_PATH || 'scripts/douyin_fetch.py'

  isDev && console.log('调用 Python 脚本:', scriptPath)

  // 检查 Python 是否可用
  let pythonCommand = 'python3'
  try {
    await execAsync('python3 --version', { timeout: 5000 })
  } catch {
    try {
      await execAsync('python --version', { timeout: 5000 })
      pythonCommand = 'python'
    } catch {
      throw new Error('Python 未安装或不可用')
    }
  }

  // 执行 Python 脚本
  const command = `${pythonCommand} "${scriptPath}" "${videoUrl}"`
  const result = await execAsync(command, {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024, // 10MB
  })

  // 解析 JSON 输出
  const output = result.stdout.trim()
  if (!output) {
    throw new Error('Python 脚本未返回数据')
  }

  const data = JSON.parse(output)

  const apiResult: {
    title: string
    duration?: number
    videoUrl?: string
    audioUrl?: string
  } = {
    title: data.title || videoUrl,
  }

  if (data.duration) {
    apiResult.duration = parseFloat(data.duration)
  }

  if (data.video_url) {
    apiResult.videoUrl = data.video_url
  }

  if (data.audio_url) {
    apiResult.audioUrl = data.audio_url
  }

  isDev && console.log('✓ 通过 Python 脚本成功获取抖音视频信息:', apiResult)

  return apiResult
}
