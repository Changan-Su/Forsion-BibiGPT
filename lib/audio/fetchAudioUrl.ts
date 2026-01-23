import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { fetchBilibiliSubtitleUrls } from '~/lib/bilibili/fetchBilibiliSubtitleUrls'
import { VideoService } from '~/lib/types'
import { isDev } from '~/utils/env'
import { fetchDouyinWithAPI } from '~/lib/douyin/fetchDouyinWithAPI'

const execAsync = promisify(exec)

/**
 * 获取 cookies 参数（如果配置了环境变量）
 * 支持的环境变量（按优先级）：
 * 1. DOUYIN_COOKIES_FROM_BROWSER: 从浏览器读取 cookies（推荐）
 *    - 支持的值: chrome, chromium, edge, firefox, opera, safari, brave, vivaldi
 *    - 示例: DOUYIN_COOKIES_FROM_BROWSER=chrome
 * 2. DOUYIN_COOKIES_FILE: 抖音 cookies 文件路径（备用方案）
 *    - 示例: DOUYIN_COOKIES_FILE=/path/to/cookies.txt
 */
function getCookiesArgs(videoUrl: string): string {
  const cookiesArgs: string[] = []

  // 检查是否是抖音视频
  if (videoUrl.includes('douyin.com')) {
    // 优先使用 --cookies-from-browser（从浏览器读取）
    const douyinCookiesFromBrowser = process.env.DOUYIN_COOKIES_FROM_BROWSER
    if (douyinCookiesFromBrowser) {
      // 验证浏览器名称是否有效
      const validBrowsers = ['chrome', 'chromium', 'edge', 'firefox', 'opera', 'safari', 'brave', 'vivaldi']
      const browser = douyinCookiesFromBrowser.toLowerCase()

      if (validBrowsers.includes(browser)) {
        cookiesArgs.push(`--cookies-from-browser ${browser}`)
        isDev && console.log('使用浏览器 cookies (从浏览器读取):', browser)
      } else {
        isDev &&
          console.warn(
            `无效的浏览器名称: ${douyinCookiesFromBrowser}。` +
              `支持的值: ${validBrowsers.join(', ')}。` +
              `将尝试使用默认浏览器 (chrome)`,
          )
        // 默认使用 chrome
        cookiesArgs.push('--cookies-from-browser chrome')
      }
    } else {
      // 回退到 cookies 文件
      const douyinCookiesFile = process.env.DOUYIN_COOKIES_FILE
      if (douyinCookiesFile) {
        const cookiesPathQuoted =
          douyinCookiesFile.includes(' ') || douyinCookiesFile.includes('(') || douyinCookiesFile.includes(')')
            ? `"${douyinCookiesFile.replace(/"/g, '\\"')}"`
            : douyinCookiesFile
        cookiesArgs.push(`--cookies ${cookiesPathQuoted}`)
        isDev && console.log('使用抖音 cookies 文件:', douyinCookiesFile)
      } else {
        // 如果都没有配置，尝试默认使用 chrome 的 cookies（可能不需要登录）
        // 注意：这可能会失败，但至少尝试一下
        isDev &&
          console.warn(
            '提示: 抖音视频可能需要 cookies。' +
              '建议设置 DOUYIN_COOKIES_FROM_BROWSER=chrome（从浏览器读取）' +
              '或 DOUYIN_COOKIES_FILE=/path/to/cookies.txt（使用 cookies 文件）',
          )
        // 尝试使用 chrome（可能不需要登录的公开视频可以访问）
        cookiesArgs.push('--cookies-from-browser chrome')
      }
    }
  }

  return cookiesArgs.join(' ')
}

/**
 * 使用 yt-dlp 直接下载音频文件
 * 注意：需要在服务器上安装 yt-dlp: pip install yt-dlp 或 brew install yt-dlp
 */
async function downloadAudioWithYtDlp(videoUrl: string): Promise<Buffer> {
  // 创建临时目录
  const tempDir = await mkdtemp(join(tmpdir(), 'bibi-gpt-audio-'))
  // 使用 yt-dlp 的格式字符串，确保跨平台兼容
  const outputPath = join(tempDir, 'audio.%(ext)s').replace(/\\/g, '/') // 转换为 Unix 风格路径以兼容 yt-dlp

  try {
    // 检查是否安装了 yt-dlp（使用 checkAudioExtractionSupport 函数）
    const hasYtDlp = await checkAudioExtractionSupport()
    if (!hasYtDlp) {
      throw new Error('yt-dlp 未安装。请运行: pip install yt-dlp 或 brew install yt-dlp')
    }

    isDev && console.log('开始使用 yt-dlp 下载音频...', { tempDir, outputPath })

    // 使用 yt-dlp 直接下载音频文件
    // 优先尝试下载并转换为 MP3（Whisper API 支持最好）
    // 如果转换失败，则下载原始格式

    // Windows 上需要特殊处理路径和 URL 中的引号
    const outputPathQuoted =
      outputPath.includes(' ') || outputPath.includes('(') || outputPath.includes(')')
        ? `"${outputPath.replace(/"/g, '\\"')}"`
        : outputPath
    const videoUrlQuoted =
      videoUrl.includes(' ') || videoUrl.includes('(') || videoUrl.includes(')')
        ? `"${videoUrl.replace(/"/g, '\\"')}"`
        : videoUrl

    let downloadSuccess = false
    let lastError: any = null

    // 获取 yt-dlp 的完整路径
    const ytDlpPath = await findYtDlpPath()
    if (!ytDlpPath) {
      throw new Error('yt-dlp 未安装。请运行: pip install yt-dlp 或 brew install yt-dlp')
    }
    const ytDlpCommand = ytDlpPath.includes(' ') ? `"${ytDlpPath}"` : ytDlpPath

    // 获取 cookies 参数（如果配置了）
    const cookiesArgs = getCookiesArgs(videoUrl)

    // 方案1: 优先转换为 MP3（Whisper API 支持最好，避免 webm 解析问题）
    // 注意：需要 ffmpeg，但这是最可靠的方式
    try {
      isDev && console.log('尝试方案1: 转换为MP3（优先，Whisper API支持最好）...')
      const command1 =
        `${ytDlpCommand} ${cookiesArgs} -x --audio-format mp3 --audio-quality 0 -o ${outputPathQuoted} --no-playlist ${videoUrlQuoted}`.trim()
      isDev && console.log('执行命令:', command1)

      const result1 = await execAsync(command1, {
        timeout: 180000,
        maxBuffer: 100 * 1024 * 1024, // 100MB 缓冲区
      })

      if (result1.stdout) {
        isDev && console.log('命令输出:', result1.stdout.slice(0, 500))
      }
      if (result1.stderr) {
        isDev && console.warn('命令警告:', result1.stderr.slice(0, 500))
      }

      downloadSuccess = true
      isDev && console.log('✓ 方案1成功：已转换为MP3格式')
    } catch (error1: any) {
      lastError = error1
      const error1Output = error1.stdout || error1.stderr || error1.message || ''
      isDev &&
        console.warn('✗ 方案1失败（MP3转换）:', {
          message: error1.message?.slice(0, 1000),
          stdout: error1.stdout?.slice(0, 2000),
          stderr: error1.stderr?.slice(0, 2000),
          code: error1.code,
          signal: error1.signal,
        })

      // 如果错误信息中包含需要登录的提示
      if (error1Output.toLowerCase().includes('login') || error1Output.toLowerCase().includes('private')) {
        isDev && console.warn('提示: 视频可能需要登录或为私有视频')
      }

      // 检查是否是 ffmpeg 相关错误
      const isFfmpegError =
        error1Output.toLowerCase().includes('ffmpeg') || error1Output.toLowerCase().includes('ffprobe')
      if (isFfmpegError) {
        isDev && console.warn('提示: ffmpeg 未安装或不可用，将尝试其他格式')
      }

      // 方案2: 尝试下载 M4A 格式（Whisper API 也支持）
      try {
        isDev && console.log('尝试方案2: 下载M4A格式（Whisper API支持）...')
        const command2 =
          `${ytDlpCommand} ${cookiesArgs} -f "bestaudio[ext=m4a]/bestaudio[ext=mp3]" -o ${outputPathQuoted} --no-playlist ${videoUrlQuoted}`.trim()
        isDev && console.log('执行命令:', command2)

        const result2 = await execAsync(command2, {
          timeout: 180000,
          maxBuffer: 100 * 1024 * 1024,
        })

        if (result2.stdout) {
          isDev && console.log('命令输出:', result2.stdout.slice(0, 500))
        }
        if (result2.stderr) {
          isDev && console.warn('命令警告:', result2.stderr.slice(0, 500))
        }

        downloadSuccess = true
        isDev && console.log('✓ 方案2成功：已下载M4A/MP3格式')
      } catch (error2: any) {
        lastError = error2
        const error2Output = error2.stdout || error2.stderr || error2.message || ''
        isDev &&
          console.warn('✗ 方案2失败:', {
            message: error2.message?.slice(0, 1000),
            stdout: error2.stdout?.slice(0, 2000),
            stderr: error2.stderr?.slice(0, 2000),
            code: error2.code,
            signal: error2.signal,
          })

        // 如果错误信息中包含需要登录的提示
        if (error2Output.toLowerCase().includes('login') || error2Output.toLowerCase().includes('private')) {
          isDev && console.warn('提示: 视频可能需要登录或为私有视频')
        }

        // 方案3: 最后尝试下载最佳音频（可能是 webm，需要后续转换）
        try {
          isDev && console.log('尝试方案3: 下载最佳音频格式（可能是webm，将尝试转换）...')
          const command3 =
            `${ytDlpCommand} ${cookiesArgs} -f "bestaudio" -o ${outputPathQuoted} --no-playlist ${videoUrlQuoted}`.trim()
          isDev && console.log('执行命令:', command3)

          const result3 = await execAsync(command3, {
            timeout: 180000,
            maxBuffer: 100 * 1024 * 1024,
          })

          if (result3.stdout) {
            isDev && console.log('命令输出:', result3.stdout.slice(0, 500))
          }
          if (result3.stderr) {
            isDev && console.warn('命令警告:', result3.stderr.slice(0, 500))
          }

          downloadSuccess = true
          isDev && console.log('方案3成功：已下载音频（可能是webm格式）')
        } catch (error3: any) {
          lastError = error3
          const error3Output = error3.stdout || error3.stderr || error3.message || ''

          isDev && console.error('✗ 所有方案都失败，详细错误信息:')
          isDev &&
            console.error('方案1错误（MP3转换）:', {
              message: error1.message?.slice(0, 1000),
              stdout: error1.stdout?.slice(0, 2000),
              stderr: error1.stderr?.slice(0, 2000),
              code: error1.code,
            })
          isDev &&
            console.error('方案2错误（M4A/MP3下载）:', {
              message: error2.message?.slice(0, 1000),
              stdout: error2.stdout?.slice(0, 2000),
              stderr: error2.stderr?.slice(0, 2000),
              code: error2.code,
            })
          isDev &&
            console.error('方案3错误（最佳音频）:', {
              message: error3.message?.slice(0, 1000),
              stdout: error3.stdout?.slice(0, 2000),
              stderr: error3.stderr?.slice(0, 2000),
              code: error3.code,
            })

          // 分析错误原因并提供建议
          let suggestion = ''
          if (error1Output.toLowerCase().includes('ffmpeg') || error1Output.toLowerCase().includes('ffprobe')) {
            suggestion =
              '提示: 需要安装 ffmpeg 以支持音频格式转换。Windows: 从 https://ffmpeg.org/download.html 下载；macOS: brew install ffmpeg；Linux: sudo apt install ffmpeg'
          } else if (
            error3Output.toLowerCase().includes('login') ||
            error3Output.toLowerCase().includes('private') ||
            error3Output.toLowerCase().includes('sessdata')
          ) {
            if (videoUrl.includes('douyin.com')) {
              suggestion =
                '提示: 抖音视频需要 cookies。推荐配置方式：\n' +
                '1. 使用浏览器 cookies（推荐）: 设置 DOUYIN_COOKIES_FROM_BROWSER=chrome（或 edge/firefox 等）\n' +
                '2. 使用 cookies 文件: 设置 DOUYIN_COOKIES_FILE=/path/to/cookies.txt\n' +
                '   获取 cookies 文件: 使用浏览器扩展（如 Get cookies.txt LOCALLY）导出抖音 cookies'
            } else {
              suggestion =
                '提示: 视频可能需要登录。请配置 BILIBILI_SESSION_TOKEN 环境变量（从浏览器 Cookie 中获取 SESSDATA）'
            }
          } else if (
            error3Output.toLowerCase().includes('unavailable') ||
            error3Output.toLowerCase().includes('not found')
          ) {
            suggestion = '提示: 视频可能不存在或不可用'
          } else if (
            error3Output.toLowerCase().includes('network') ||
            error3Output.toLowerCase().includes('connection')
          ) {
            suggestion = '提示: 网络连接问题，请检查网络或稍后重试'
          } else {
            suggestion = '提示: 请查看上面的详细错误信息以确定问题原因'
          }

          // 抛出详细的错误信息
          throw new Error(
            `音频下载失败。尝试了三种方案都失败。\n\n` +
              `方案1错误（MP3转换）: ${error1.message?.slice(0, 500)}\n${
                error1.stderr?.slice(0, 1000) || error1.stdout?.slice(0, 1000) || ''
              }\n\n` +
              `方案2错误（M4A/MP3下载）: ${error2.message?.slice(0, 500)}\n${
                error2.stderr?.slice(0, 1000) || error2.stdout?.slice(0, 1000) || ''
              }\n\n` +
              `方案3错误（最佳音频）: ${error3.message?.slice(0, 500)}\n${
                error3.stderr?.slice(0, 1000) || error3.stdout?.slice(0, 1000) || ''
              }\n\n` +
              `${suggestion}`,
          )
        }
      }
    }

    if (!downloadSuccess) {
      throw new Error(`音频下载未完成。最后错误: ${lastError?.message || '未知错误'}`)
    }

    // 查找下载的文件（yt-dlp 会自动添加扩展名）
    const { readdir, rmdir } = await import('fs/promises')
    const files = await readdir(tempDir)
    const audioFile = files.find((f) => f.startsWith('audio.'))

    if (!audioFile) {
      throw new Error('无法找到下载的音频文件')
    }

    const audioFilePath = join(tempDir, audioFile)

    // 检查文件是否存在且有内容
    const { stat } = await import('fs/promises')
    const fileStat = await stat(audioFilePath)
    const fileSizeMB = (fileStat.size / 1024 / 1024).toFixed(2)

    isDev &&
      console.log('音频下载成功:', {
        path: audioFilePath,
        size: `${fileSizeMB}MB`,
        extension: audioFile.split('.').pop(),
      })

    if (fileStat.size === 0) {
      throw new Error('下载的音频文件大小为 0，文件可能损坏')
    }

    // 读取音频文件
    let audioBuffer = await readFile(audioFilePath)

    // 验证 Buffer 大小与文件大小一致
    if (audioBuffer.length !== fileStat.size) {
      throw new Error(`音频文件读取不完整: 预期 ${fileStat.size} 字节，实际 ${audioBuffer.length} 字节`)
    }

    // 验证音频文件头部（MP3 文件通常以 FF FB 或 ID3 开头）
    const header = audioBuffer.slice(0, 4)
    const headerHex = header.toString('hex')
    const isMP3 = headerHex.startsWith('fffb') || headerHex.startsWith('494433') || headerHex.startsWith('fff3')
    const isM4A = headerHex.startsWith('000000') || header.slice(4, 8).toString('ascii') === 'ftyp'
    const isWebM = headerHex.startsWith('1a45dfa3')

    if (!isMP3 && !isM4A && !isWebM) {
      isDev &&
        console.warn('音频文件头部验证失败，但继续尝试:', {
          headerHex,
          filename: audioFile,
          extension: audioFile.split('.').pop(),
        })
    } else {
      isDev &&
        console.log('音频文件格式验证通过:', {
          format: isMP3 ? 'MP3' : isM4A ? 'M4A' : 'WebM',
          headerHex,
        })
    }

    // 如果是 WebM 格式，转换为 MP3（Whisper API 无法解析 webm 时长）
    if (isWebM) {
      isDev && console.log('检测到 WebM 格式，转换为 MP3（Whisper API 需要）...')
      try {
        // 检查 ffmpeg 是否可用
        try {
          await execAsync('ffmpeg -version')
        } catch {
          throw new Error('ffmpeg 未安装，无法转换 WebM 为 MP3。请安装 ffmpeg。')
        }

        const mp3Path = join(tempDir, 'audio.mp3')
        const webmPathQuoted = audioFilePath.includes(' ') ? `"${audioFilePath.replace(/"/g, '\\"')}"` : audioFilePath
        const mp3PathQuoted = mp3Path.includes(' ') ? `"${mp3Path.replace(/"/g, '\\"')}"` : mp3Path

        const convertCommand = `ffmpeg -i ${webmPathQuoted} -acodec libmp3lame -q:a 0 ${mp3PathQuoted} -y`
        isDev && console.log('执行转换命令:', convertCommand)

        await execAsync(convertCommand, {
          timeout: 180000,
          maxBuffer: 100 * 1024 * 1024,
        })

        // 读取转换后的 MP3 文件
        const mp3Buffer = await readFile(mp3Path)
        const mp3Stat = await stat(mp3Path)
        isDev &&
          console.log('✓ WebM 转换为 MP3 成功:', {
            originalSize: `${fileSizeMB}MB`,
            mp3Size: `${(mp3Stat.size / 1024 / 1024).toFixed(2)}MB`,
          })

        // 清理原始 webm 文件
        await unlink(audioFilePath).catch(() => {})
        audioBuffer = mp3Buffer
      } catch (convertError: any) {
        isDev && console.error('WebM 转 MP3 失败:', convertError.message)
        throw new Error(
          `WebM 格式无法直接用于 Whisper API（无法解析时长）。转换为 MP3 失败: ${convertError.message}。请确保已安装 ffmpeg。`,
        )
      }
    }

    // 清理临时文件
    try {
      await unlink(audioFilePath)
      await rmdir(tempDir).catch(() => {}) // 忽略目录删除错误
    } catch (cleanupError) {
      // 忽略清理错误，不影响主流程
      isDev && console.warn('清理临时文件失败:', cleanupError)
    }

    return audioBuffer
  } catch (error: any) {
    // 清理临时目录
    try {
      const { readdir, rmdir } = await import('fs/promises')
      const files = await readdir(tempDir).catch(() => [])
      for (const file of files) {
        await unlink(join(tempDir, file)).catch(() => {})
      }
      await rmdir(tempDir).catch(() => {})
    } catch {
      // 忽略清理错误
    }

    console.error('yt-dlp download error:', {
      message: error.message,
      stdout: error.stdout?.slice(0, 1000),
      stderr: error.stderr?.slice(0, 1000),
      stack: error.stack?.slice(0, 500),
    })
    throw error // 抛出原始错误，保留更多信息
  }
}

/**
 * 获取 Bilibili 视频的音频文件
 */
export async function fetchBilibiliAudio(
  videoId: string,
  pageNumber?: null | string,
): Promise<{ audioBuffer: Buffer; title: string; duration?: number }> {
  try {
    // 获取视频信息
    const videoInfo = await fetchBilibiliSubtitleUrls(videoId, pageNumber)
    const { title, duration } = videoInfo

    // 构建 Bilibili 视频 URL
    const videoUrl = videoId.startsWith('av')
      ? `https://www.bilibili.com/video/av${videoId.slice(2)}${pageNumber ? `?p=${pageNumber}` : ''}`
      : `https://www.bilibili.com/video/${videoId}${pageNumber ? `?p=${pageNumber}` : ''}`

    // 使用 yt-dlp 直接下载音频文件
    const audioBuffer = await downloadAudioWithYtDlp(videoUrl)

    return { audioBuffer, title, duration }
  } catch (error: any) {
    console.error('Error fetching Bilibili audio:', error)
    throw error
  }
}

/**
 * 获取 YouTube 视频的音频文件
 * 支持多种 YouTube URL 格式：watch、shorts、youtu.be
 */
export async function fetchYoutubeAudio(
  videoId: string,
): Promise<{ audioBuffer: Buffer; title: string; duration?: number }> {
  try {
    // 尝试多种 URL 格式，yt-dlp 都能处理
    // 优先使用 watch 格式（最通用），如果失败可以尝试 shorts 格式
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const shortsUrl = `https://www.youtube.com/shorts/${videoId}`

    // 获取视频标题和时长（参考 Bilibili 实现）
    let title = videoId
    let duration: number | undefined = undefined

    try {
      // 尝试使用 watch 格式获取信息
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
    } catch (infoError) {
      // 如果 watch 格式获取信息失败，尝试 shorts 格式
      try {
        const shortsInfoCommand = `yt-dlp --get-title --get-duration --no-playlist "${shortsUrl}"`
        const shortsInfoResult = await execAsync(shortsInfoCommand, { timeout: 30000 })
        const shortsInfoLines = shortsInfoResult.stdout
          .trim()
          .split('\n')
          .filter((line) => line.trim())

        if (shortsInfoLines.length > 0) {
          title = shortsInfoLines[0].trim()
        }

        if (shortsInfoLines.length > 1) {
          const durationStr = shortsInfoLines[1].trim()
          const durationParts = durationStr.split(':')
          if (durationParts.length === 3) {
            duration =
              parseInt(durationParts[0], 10) * 3600 + parseInt(durationParts[1], 10) * 60 + parseFloat(durationParts[2])
          } else if (durationParts.length === 2) {
            duration = parseInt(durationParts[0], 10) * 60 + parseFloat(durationParts[1])
          } else {
            duration = parseFloat(durationStr)
          }
        }
      } catch (shortsInfoError) {
        // 如果都失败，使用 videoId 作为标题
        isDev &&
          console.warn('获取 YouTube 视频信息失败，使用默认值:', {
            watchError: infoError,
            shortsError: shortsInfoError,
          })
      }
    }

    // 使用 yt-dlp 直接下载音频文件
    // 优先尝试 watch 格式，如果失败再尝试 shorts 格式
    let audioBuffer: Buffer
    try {
      audioBuffer = await downloadAudioWithYtDlp(videoUrl)
    } catch (watchError: any) {
      // 如果 watch 格式失败，尝试 shorts 格式
      isDev && console.log('watch 格式下载失败，尝试 shorts 格式:', watchError.message?.slice(0, 200))
      try {
        audioBuffer = await downloadAudioWithYtDlp(shortsUrl)
      } catch (shortsError: any) {
        // 如果都失败，抛出更详细的错误
        throw new Error(
          `YouTube 音频下载失败（尝试了 watch 和 shorts 格式）:\n` +
            `watch 格式错误: ${watchError.message?.slice(0, 500)}\n` +
            `shorts 格式错误: ${shortsError.message?.slice(0, 500)}`,
        )
      }
    }

    return { audioBuffer, title, duration }
  } catch (error: any) {
    console.error('Error fetching YouTube audio:', error)
    throw error
  }
}

/**
 * 获取抖音视频的音频文件
 * 参考 YouTube 实现，使用 yt-dlp 下载音频
 */
export async function fetchDouyinAudio(
  videoId: string,
): Promise<{ audioBuffer: Buffer; title: string; duration?: number }> {
  try {
    // 构建抖音视频URL
    // 支持标准格式和短链接格式
    const videoUrl = videoId.includes('http')
      ? videoId // 如果是完整URL（短链接解析后的结果）
      : `https://www.douyin.com/video/${videoId}`

    // 获取视频标题和时长（参考 YouTube 实现）
    let title = videoId
    let duration: number | undefined = undefined

    try {
      // 获取 yt-dlp 的完整路径
      const ytDlpPath = await findYtDlpPath()
      if (!ytDlpPath) {
        throw new Error('yt-dlp 未安装')
      }
      const ytDlpCommand = ytDlpPath.includes(' ') ? `"${ytDlpPath}"` : ytDlpPath

      // 获取 cookies 参数（如果配置了）
      const cookiesArgs = getCookiesArgs(videoUrl)

      // 使用 yt-dlp 获取视频信息
      const infoCommand = `${ytDlpCommand} ${cookiesArgs} --get-title --get-duration --no-playlist "${videoUrl}"`.trim()
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
    } catch (infoError) {
      // 如果获取信息失败，使用默认值
      isDev && console.warn('获取抖音视频信息失败，使用默认值:', infoError)
    }

    // 使用 yt-dlp 直接下载音频文件
    try {
      const audioBuffer = await downloadAudioWithYtDlp(videoUrl)
      return { audioBuffer, title, duration }
    } catch (ytDlpError: any) {
      // 如果 yt-dlp 失败，尝试使用 Douyin API 作为回退
      isDev && console.warn('yt-dlp 下载音频失败，尝试使用 Douyin API 回退:', ytDlpError.message?.slice(0, 200))

      if (process.env.DOUYIN_API_ENABLED !== 'false') {
        try {
          const apiResult = await fetchDouyinWithAPI(videoId)

          // 如果 API 返回了音频 URL，尝试下载
          if (apiResult.audioUrl) {
            isDev && console.log('通过 Douyin API 获取到音频 URL，开始下载:', apiResult.audioUrl)
            const audioResponse = await fetch(apiResult.audioUrl, {
              signal: AbortSignal.timeout(180000), // 3分钟超时
            })

            if (!audioResponse.ok) {
              throw new Error(`音频下载失败 (${audioResponse.status}): ${audioResponse.statusText}`)
            }

            const audioArrayBuffer = await audioResponse.arrayBuffer()
            const audioBuffer = Buffer.from(audioArrayBuffer)

            // 更新标题和时长（如果 API 返回了）
            if (apiResult.title) {
              title = apiResult.title
            }
            if (apiResult.duration) {
              duration = apiResult.duration
            }

            isDev &&
              console.log('✓ 通过 Douyin API 成功下载音频:', {
                size: `${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`,
                title,
                duration,
              })

            return { audioBuffer, title, duration }
          } else {
            // API 没有返回音频 URL，抛出原始错误
            throw new Error('Douyin API 未返回音频 URL')
          }
        } catch (apiError: any) {
          isDev && console.warn('Douyin API 回退也失败:', apiError.message?.slice(0, 200))
          // 如果 API 也失败，抛出原始 yt-dlp 错误
          throw ytDlpError
        }
      } else {
        // API 回退未启用，直接抛出原始错误
        throw ytDlpError
      }
    }
  } catch (error: any) {
    console.error('Error fetching Douyin audio:', error)
    throw error
  }
}

/**
 * 通用音频文件获取函数
 */
export async function fetchAudio(
  service: VideoService,
  videoId: string,
  pageNumber?: null | string,
): Promise<{ audioBuffer: Buffer; title: string; duration?: number }> {
  if (service === VideoService.Bilibili) {
    return await fetchBilibiliAudio(videoId, pageNumber)
  } else if (service === VideoService.Youtube) {
    // YouTube 音频提取现在也返回 duration（参考 Bilibili 实现）
    return await fetchYoutubeAudio(videoId)
  } else if (service === VideoService.Douyin) {
    return await fetchDouyinAudio(videoId)
  } else {
    throw new Error(`音频提取不支持的服务: ${service}`)
  }
}

/**
 * 获取 yt-dlp 的完整路径（如果找到）
 */
let cachedYtDlpPath: string | null = null

export async function findYtDlpPath(): Promise<string | null> {
  // 如果已经缓存，直接返回
  if (cachedYtDlpPath) {
    return cachedYtDlpPath
  }

  try {
    // 尝试使用完整路径（Windows 常见路径）
    const possiblePaths = [
      'yt-dlp', // 默认 PATH
      'yt-dlp.exe', // Windows 可执行文件
    ]

    // 在 Windows 上，尝试从常见 Python Scripts 目录查找
    if (process.platform === 'win32') {
      const userProfile = process.env.USERPROFILE || process.env.HOME || ''
      const appDataRoaming = process.env.APPDATA || ''
      const possibleScriptsPaths = [
        `${appDataRoaming}\\Python\\Python313\\Scripts\\yt-dlp.exe`,
        `${appDataRoaming}\\Python\\Python312\\Scripts\\yt-dlp.exe`,
        `${appDataRoaming}\\Python\\Python311\\Scripts\\yt-dlp.exe`,
        `${userProfile}\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\yt-dlp.exe`,
        `${userProfile}\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe`,
        `${userProfile}\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\yt-dlp.exe`,
        'C:\\Program Files\\Python313\\Scripts\\yt-dlp.exe',
        'C:\\Program Files\\Python312\\Scripts\\yt-dlp.exe',
        'C:\\Program Files\\Python311\\Scripts\\yt-dlp.exe',
      ]
      possiblePaths.push(...possibleScriptsPaths)
    }

    // 尝试每个可能的路径
    for (const path of possiblePaths) {
      try {
        const command = path.includes(' ') ? `"${path}" --version` : `${path} --version`
        await execAsync(command, { timeout: 5000 })
        isDev && console.log(`✓ 找到 yt-dlp: ${path}`)
        cachedYtDlpPath = path
        return path
      } catch (error: any) {
        // 继续尝试下一个路径
        if (isDev && path === possiblePaths[0]) {
          // 只在第一次尝试失败时记录详细错误
          isDev && console.warn(`尝试路径 ${path} 失败:`, error.message?.slice(0, 100))
        }
      }
    }

    // 所有路径都失败
    if (isDev) {
      console.warn(
        'yt-dlp 未安装或无法找到。音频转文字功能需要安装 yt-dlp。\n安装方法:\n  macOS: brew install yt-dlp\n  Linux/Windows: pip install yt-dlp\n  Windows: 确保 Python Scripts 目录在 PATH 环境变量中',
      )
    }
    return null
  } catch (error: any) {
    if (isDev) {
      console.error('检查 yt-dlp 时发生错误:', error.message)
    }
    return null
  }
}

/**
 * 检查是否支持音频提取（检查 yt-dlp 是否可用）
 */
export async function checkAudioExtractionSupport(): Promise<boolean> {
  const path = await findYtDlpPath()
  return path !== null
}
