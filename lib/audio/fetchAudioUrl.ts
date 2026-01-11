import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { fetchBilibiliSubtitleUrls } from '~/lib/bilibili/fetchBilibiliSubtitleUrls'
import { VideoService } from '~/lib/types'
import { isDev } from '~/utils/env'

const execAsync = promisify(exec)

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
    // 检查是否安装了 yt-dlp
    try {
      await execAsync('yt-dlp --version')
    } catch {
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

    // 方案1: 最简单的方式 - 直接下载最佳音频（不转换）
    try {
      isDev && console.log('尝试下载最佳音频格式...')
      // 先尝试最简单的方式，不进行格式转换
      const command1 = `yt-dlp -f "bestaudio" -o ${outputPathQuoted} --no-playlist ${videoUrlQuoted}`
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
      isDev && console.log('音频下载成功')
    } catch (error1: any) {
      lastError = error1
      const error1Output = error1.stdout || error1.stderr || error1.message || ''
      isDev &&
        console.warn('✗ 方案1失败:', {
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

      // 方案2: 尝试指定具体的音频格式（不转换）
      try {
        isDev && console.log('尝试方案2: 指定音频格式...')
        const command2 = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio[ext=webm]/bestaudio" -o ${outputPathQuoted} --no-playlist ${videoUrlQuoted}`
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
        isDev && console.log('方案2成功')
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

        // 方案3: 尝试转换为 MP3（需要 ffmpeg）
        try {
          isDev && console.log('尝试方案3: 转换为MP3（需要ffmpeg）...')
          const command3 = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o ${outputPathQuoted} --no-playlist ${videoUrlQuoted}`
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
          isDev && console.log('方案3成功')
        } catch (error3: any) {
          lastError = error3
          const error3Output = error3.stdout || error3.stderr || error3.message || ''

          isDev && console.error('✗ 所有方案都失败，详细错误信息:')
          isDev &&
            console.error('方案1错误:', {
              message: error1.message?.slice(0, 1000),
              stdout: error1.stdout?.slice(0, 2000),
              stderr: error1.stderr?.slice(0, 2000),
              code: error1.code,
            })
          isDev &&
            console.error('方案2错误:', {
              message: error2.message?.slice(0, 1000),
              stdout: error2.stdout?.slice(0, 2000),
              stderr: error2.stderr?.slice(0, 2000),
              code: error2.code,
            })
          isDev &&
            console.error('方案3错误:', {
              message: error3.message?.slice(0, 1000),
              stdout: error3.stdout?.slice(0, 2000),
              stderr: error3.stderr?.slice(0, 2000),
              code: error3.code,
            })

          // 分析错误原因并提供建议
          let suggestion = ''
          if (error3Output.toLowerCase().includes('ffmpeg') || error3Output.toLowerCase().includes('ffprobe')) {
            suggestion =
              '提示: 需要安装 ffmpeg。Windows: 从 https://ffmpeg.org/download.html 下载；macOS: brew install ffmpeg；Linux: sudo apt install ffmpeg'
          } else if (
            error3Output.toLowerCase().includes('login') ||
            error3Output.toLowerCase().includes('private') ||
            error3Output.toLowerCase().includes('sessdata')
          ) {
            suggestion =
              '提示: 视频可能需要登录。请配置 BILIBILI_SESSION_TOKEN 环境变量（从浏览器 Cookie 中获取 SESSDATA）'
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
              `方案1错误: ${error1.message?.slice(0, 500)}\n${
                error1.stderr?.slice(0, 1000) || error1.stdout?.slice(0, 1000) || ''
              }\n\n` +
              `方案2错误: ${error2.message?.slice(0, 500)}\n${
                error2.stderr?.slice(0, 1000) || error2.stdout?.slice(0, 1000) || ''
              }\n\n` +
              `方案3错误: ${error3.message?.slice(0, 500)}\n${
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
    const audioBuffer = await readFile(audioFilePath)

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
 */
export async function fetchYoutubeAudio(videoId: string): Promise<{ audioBuffer: Buffer; title: string }> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

    // 获取视频标题（可选）
    let title = videoId
    try {
      const { stdout } = await execAsync(`yt-dlp --get-title --no-playlist "${videoUrl}"`, { timeout: 10000 })
      title = stdout.trim() || videoId
    } catch {
      // 如果获取标题失败，使用 videoId 作为标题
    }

    // 使用 yt-dlp 直接下载音频文件
    const audioBuffer = await downloadAudioWithYtDlp(videoUrl)

    return { audioBuffer, title }
  } catch (error: any) {
    console.error('Error fetching YouTube audio:', error)
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
    const result = await fetchYoutubeAudio(videoId)
    return { ...result, duration: undefined }
  } else {
    throw new Error(`音频提取不支持的服务: ${service}`)
  }
}

/**
 * 检查是否支持音频提取（检查 yt-dlp 是否可用）
 */
export async function checkAudioExtractionSupport(): Promise<boolean> {
  try {
    await execAsync('yt-dlp --version')
    return true
  } catch {
    if (isDev) {
      console.warn(
        'yt-dlp 未安装。音频转文字功能需要安装 yt-dlp。\n安装方法:\n  macOS: brew install yt-dlp\n  Linux/Windows: pip install yt-dlp',
      )
    }
    return false
  }
}
