import { CommonSubtitleItem } from '~/lib/types'
import { isDev } from '~/utils/env'
import { checkAudioExtractionSupport, findYtDlpPath } from '~/lib/audio/fetchAudioUrl'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fetchDouyinWithAPI } from './fetchDouyinWithAPI'

const execAsync = promisify(exec)

/**
 * 提取抖音视频字幕
 * 注意：抖音视频通常没有字幕，此函数主要返回视频信息
 * 如果没有字幕，系统会自动回退到音频转文字功能
 */
export async function fetchDouyinSubtitle(
  videoId: string,
  shouldShowTimestamp?: boolean,
): Promise<{
  title: string
  subtitlesArray?: null | Array<CommonSubtitleItem>
  descriptionText?: string
  duration?: number
}> {
  try {
    // 构建抖音视频URL
    // 支持完整URL（短链接）和标准格式
    const videoUrl = videoId.includes('http')
      ? videoId // 如果是完整URL（短链接）
      : `https://www.douyin.com/video/${videoId}`

    isDev && console.log('尝试获取抖音视频信息:', videoUrl)

    // 尝试使用 yt-dlp 获取视频信息（标题、时长等）
    // 即使没有字幕，也能获取到一些基本信息
    const hasYtDlp = await checkAudioExtractionSupport()
    if (hasYtDlp) {
      try {
        // 获取 cookies 参数（优先使用浏览器，回退到文件）
        let cookiesArgs = ''
        const douyinCookiesFromBrowser = process.env.DOUYIN_COOKIES_FROM_BROWSER
        if (douyinCookiesFromBrowser) {
          const validBrowsers = ['chrome', 'chromium', 'edge', 'firefox', 'opera', 'safari', 'brave', 'vivaldi']
          const browser = douyinCookiesFromBrowser.toLowerCase()
          if (validBrowsers.includes(browser)) {
            cookiesArgs = `--cookies-from-browser ${browser}`
            isDev && console.log('使用浏览器 cookies (从浏览器读取):', browser)
          } else {
            cookiesArgs = '--cookies-from-browser chrome'
            isDev && console.warn(`无效的浏览器名称，使用默认值 chrome`)
          }
        } else {
          const douyinCookiesFile = process.env.DOUYIN_COOKIES_FILE
          if (douyinCookiesFile) {
            cookiesArgs = `--cookies "${douyinCookiesFile.replace(/"/g, '\\"')}"`
            isDev && console.log('使用抖音 cookies 文件:', douyinCookiesFile)
          } else {
            // 默认尝试使用 chrome
            cookiesArgs = '--cookies-from-browser chrome'
          }
        }

        // 获取 yt-dlp 的完整路径
        const ytDlpPath = await findYtDlpPath()
        if (!ytDlpPath) {
          throw new Error('yt-dlp 未安装')
        }
        const ytDlpCommand = ytDlpPath.includes(' ') ? `"${ytDlpPath}"` : ytDlpPath

        // 使用 yt-dlp 获取视频信息
        const infoCommand =
          `${ytDlpCommand} ${cookiesArgs} --get-title --get-duration --no-playlist "${videoUrl}"`.trim()
        const infoResult = await execAsync(infoCommand, { timeout: 30000 })
        const infoLines = infoResult.stdout
          .trim()
          .split('\n')
          .filter((line) => line.trim())

        let title = videoId
        let duration: number | undefined = undefined

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

        isDev && console.log('✓ 使用yt-dlp成功获取抖音视频信息:', { title, duration })

        return {
          title,
          subtitlesArray: null, // 抖音视频通常没有字幕
          descriptionText: undefined,
          duration,
        }
      } catch (infoError: any) {
        // 如果获取信息失败，尝试使用 Douyin API 作为回退
        isDev &&
          console.warn('使用yt-dlp获取抖音视频信息失败，尝试使用 Douyin API 回退:', infoError.message?.slice(0, 200))

        // 如果启用了 API 回退，尝试使用 Douyin API
        if (process.env.DOUYIN_API_ENABLED !== 'false') {
          try {
            const apiResult = await fetchDouyinWithAPI(videoId)
            isDev && console.log('✓ 使用 Douyin API 成功获取视频信息:', apiResult)
            return {
              title: apiResult.title,
              subtitlesArray: null, // 抖音视频通常没有字幕
              descriptionText: undefined,
              duration: apiResult.duration,
            }
          } catch (apiError: any) {
            isDev && console.warn('Douyin API 回退也失败:', apiError.message?.slice(0, 200))
            // 继续使用默认值
          }
        }
      }
    } else {
      isDev && console.log('yt-dlp未安装，尝试使用 Douyin API')

      // 如果 yt-dlp 未安装，尝试使用 Douyin API
      if (process.env.DOUYIN_API_ENABLED !== 'false') {
        try {
          const apiResult = await fetchDouyinWithAPI(videoId)
          isDev && console.log('✓ 使用 Douyin API 成功获取视频信息:', apiResult)
          return {
            title: apiResult.title,
            subtitlesArray: null,
            descriptionText: undefined,
            duration: apiResult.duration,
          }
        } catch (apiError: any) {
          isDev && console.warn('Douyin API 调用失败:', apiError.message?.slice(0, 200))
          // 继续使用默认值
        }
      }
    }

    // 抖音视频通常没有字幕，返回空结果
    // 系统会自动回退到音频转文字功能
    return {
      title: videoId, // 默认使用 videoId，后续可以通过音频转文字获取标题
      subtitlesArray: null,
      descriptionText: undefined,
      duration: undefined,
    }
  } catch (error) {
    console.error('Error fetching Douyin subtitle:', error)
    return {
      title: videoId,
      subtitlesArray: null,
      descriptionText: undefined,
      duration: undefined,
    }
  }
}
