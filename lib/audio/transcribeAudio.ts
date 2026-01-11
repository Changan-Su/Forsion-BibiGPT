import { selectApiKeyAndActivatedLicenseKey } from '~/lib/openai/selectApiKeyAndActivatedLicenseKey'
import { VideoConfig } from '~/lib/types'
import { CommonSubtitleItem } from '~/lib/types'
import { isDev } from '~/utils/env'

/**
 * 使用 OpenAI Whisper API 将音频文件转换为文字
 * @param audioFile 音频文件的 Blob 或 Buffer
 * @param apiKey OpenAI API Key
 * @param apiBaseUrl OpenAI API Base URL (可选)
 * @returns 转录的文字内容
 */
export async function transcribeAudioWithWhisper(
  audioFile: Blob | Buffer,
  apiKey: string,
  apiBaseUrl?: string,
  filename: string = 'audio.mp3',
): Promise<{ text: string; segments?: Array<{ start: number; end: number; text: string }> }> {
  const baseUrl = apiBaseUrl || process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'

  // 在 Node.js 环境中，必须使用 form-data 包，因为 Node.js 的全局 FormData 与 Whisper API 不兼容
  // Whisper API 需要标准的 multipart/form-data 格式，form-data 包可以正确生成
  let FormDataClass: any

  try {
    // 强制使用 form-data 包（必须，因为 Node.js 的全局 FormData 不兼容 Whisper API）
    const formDataModule = await import('form-data')
    // form-data 包可能是 default export 或 named export
    FormDataClass = formDataModule.default || formDataModule
    if (!FormDataClass) {
      throw new Error('form-data 包导入失败：无法找到 FormData 类')
    }
    isDev && console.log('✓ form-data 包导入成功')
  } catch (importError: any) {
    isDev && console.error('✗ form-data 包导入失败！', importError)
    throw new Error(
      `form-data 包未安装或导入失败。请在项目根目录运行: npm install form-data @types/form-data\n` +
        `错误详情: ${importError.message}\n` +
        `Node.js 的全局 FormData 与 Whisper API 不兼容，必须使用 form-data 包。`,
    )
  }

  // 创建 form-data 实例
  const formData = new FormDataClass()

  // 检测音频文件格式并设置正确的 Content-Type
  let contentType = 'audio/mpeg' // 默认 MP3
  if (audioFile instanceof Buffer && audioFile.length >= 4) {
    const header = audioFile.slice(0, 4)
    const headerHex = header.toString('hex')
    if (headerHex.startsWith('494433') || headerHex.startsWith('fffb') || headerHex.startsWith('fff3')) {
      contentType = 'audio/mpeg' // MP3
      if (!filename.endsWith('.mp3')) filename = 'audio.mp3'
    } else if (headerHex.startsWith('000000') || header.slice(4, 8).toString('ascii') === 'ftyp') {
      contentType = 'audio/mp4' // M4A
      if (!filename.endsWith('.m4a')) filename = 'audio.m4a'
    } else if (headerHex.startsWith('1a45dfa3')) {
      contentType = 'audio/webm' // WebM
      if (!filename.endsWith('.webm')) filename = 'audio.webm'
    }
  }

  isDev &&
    console.log('准备发送音频到 Whisper API:', {
      contentType,
      filename,
      size: `${((audioFile instanceof Buffer ? audioFile.length : audioFile.size) / 1024 / 1024).toFixed(2)}MB`,
    })

  // 处理 Buffer 或 Blob，添加到 form-data
  let audioBuffer: Buffer
  if (audioFile instanceof Buffer) {
    audioBuffer = audioFile
  } else if (audioFile instanceof Blob) {
    // Blob 对象转换为 Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    audioBuffer = Buffer.from(arrayBuffer)
  } else {
    throw new Error('不支持的音频文件类型。只支持 Buffer 或 Blob')
  }

  // 使用 form-data 包的方式添加文件
  // form-data 的 append 方法签名: append(field, value, options)
  // options 可以是字符串（filename）或对象 { filename, contentType, knownLength }
  formData.append('file', audioBuffer, {
    filename,
    contentType,
    knownLength: audioBuffer.length, // 指定文件长度，确保 multipart 格式正确
  })

  isDev &&
    console.log('✓ 文件已添加到 form-data:', {
      filename,
      contentType,
      size: `${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`,
      knownLength: audioBuffer.length,
    })

  // 添加必填参数（必须在调用 getHeaders() 之前添加所有字段）
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json') // 获取带时间戳的详细响应
  // 可选：添加语言参数提高中文转录准确率
  formData.append('language', 'zh')

  isDev &&
    console.log('✓ 所有字段已添加到 form-data:', {
      fields: ['file', 'model', 'response_format', 'language'],
      fileSize: `${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`,
    })

  try {
    // 关键：必须在所有字段添加完成后，再调用 getHeaders() 获取 headers
    // form-data 包的 getHeaders() 方法返回包含 Content-Type（带 boundary）的对象
    if (typeof formData.getHeaders !== 'function') {
      throw new Error('form-data 实例没有 getHeaders() 方法。请确保使用的是正确的 form-data 包版本（>= 3.0.0）。')
    }

    // 关键：调用 getHeaders() 获取完整的 headers（包含 Content-Type 和 boundary）
    // 必须在所有 append() 调用之后才调用 getHeaders()
    // form-data 包会返回包含 'content-type'（小写）的对象
    const formHeadersRaw = formData.getHeaders()

    // 调试：输出原始 headers 以便排查问题
    isDev &&
      console.log('form-data.getHeaders() 原始返回:', {
        keys: Object.keys(formHeadersRaw),
        values: Object.keys(formHeadersRaw).reduce((acc, key) => {
          acc[key] = String(formHeadersRaw[key]).substring(0, 100)
          return acc
        }, {} as Record<string, string>),
      })

    // form-data 包的 getHeaders() 返回的键名可能是小写的 'content-type'
    // 统一处理，确保能获取到 Content-Type
    const contentTypeHeader =
      formHeadersRaw['content-type'] || formHeadersRaw['Content-Type'] || formHeadersRaw['CONTENT-TYPE'] || ''

    // 验证 Content-Type 是否正确生成
    if (!contentTypeHeader || contentTypeHeader === 'undefined') {
      isDev && console.error('✗ form-data.getHeaders() 返回的 headers（完整）:', formHeadersRaw)
      isDev && console.error('✗ form-data 实例类型:', typeof formData)
      isDev && console.error('✗ form-data 实例方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(formData)))
      throw new Error(
        `form-data.getHeaders() 未返回有效的 Content-Type。\n` +
          `返回的 headers 键: ${Object.keys(formHeadersRaw).join(', ')}\n` +
          `返回的 headers 值: ${JSON.stringify(formHeadersRaw)}\n` +
          `可能是 form-data 包版本问题（需要 >= 3.0.0）或使用方式错误。\n` +
          `请确保所有字段（file, model, response_format, language）都已正确添加到 form-data。`,
      )
    }

    // 验证 boundary 是否存在
    if (!contentTypeHeader.includes('boundary=')) {
      isDev && console.error('✗ Content-Type 缺少 boundary:', contentTypeHeader)
      throw new Error(`Content-Type 缺少 boundary 参数: ${contentTypeHeader}`)
    }

    // 提取 boundary 用于验证
    const boundaryMatch = contentTypeHeader.match(/boundary=([^;\s]+)/)
    const boundary = boundaryMatch ? boundaryMatch[1] : null

    if (!boundary) {
      throw new Error(`无法从 Content-Type 中提取 boundary: ${contentTypeHeader}`)
    }

    isDev &&
      console.log('✓ form-data headers 获取成功:', {
        'Content-Type': contentTypeHeader.substring(0, 120) + '...',
        hasBoundary: true,
        boundary: boundary.substring(0, 30),
        contentTypeLength: contentTypeHeader.length,
        allHeaders: Object.keys(formHeadersRaw),
      })

    // 构建最终的请求头：确保 Content-Type 和 Authorization 正确设置
    // 注意：form-data 返回的 headers 键名可能是小写，我们需要标准化
    const headers: Record<string, string> = {
      // 确保 Content-Type 使用标准格式（首字母大写），包含完整的 boundary
      'Content-Type': contentTypeHeader,
      // 添加认证头
      Authorization: `Bearer ${apiKey}`,
    }

    // 如果 form-data 还返回了其他 headers（如 Content-Length），也添加进去（除了已处理的 Content-Type）
    Object.keys(formHeadersRaw).forEach((key) => {
      const keyLower = key.toLowerCase()
      if (keyLower !== 'content-type') {
        // 保留其他 headers（如 Content-Length）
        headers[key] = String(formHeadersRaw[key])
      }
    })

    isDev &&
      console.log('发送请求到 Whisper API:', {
        url: `${baseUrl}/audio/transcriptions`,
        method: 'POST',
        'Content-Type': headers['Content-Type']?.substring(0, 100) + '...',
        hasBoundary: headers['Content-Type']?.includes('boundary'),
        hasAuthorization: !!headers.Authorization,
        audioSize: `${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`,
        timeout: '120000ms (2分钟)',
      })

    // 创建 AbortController 用于超时控制（至少 60 秒，音频文件可能需要更长时间）
    const controller = new AbortController()
    const timeoutMs = 120000 // 2 分钟超时，适合大文件
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    try {
      // 关键修复：直接将 form-data 转换为 Buffer（避免 PassThrough 构造函数错误）
      // form-data 是一个 ReadableStream，可以直接监听 data 事件收集数据
      const formDataBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []

        // 直接监听 form-data 的 data 事件
        formData.on('data', (chunk: Buffer | Uint8Array) => {
          // 确保 chunk 是 Buffer 类型
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })

        formData.on('end', () => {
          // 所有数据收集完成，合并为 Buffer
          resolve(Buffer.concat(chunks))
        })

        formData.on('error', (err: Error) => {
          reject(err)
        })

        // 重要：手动触发 form-data 开始流式传输
        // form-data 在调用 getHeaders() 后需要被读取才会开始传输数据
        formData.resume()
      })

      isDev &&
        console.log('✓ form-data 已转换为 Buffer:', {
          bufferSize: `${(formDataBuffer.length / 1024 / 1024).toFixed(2)}MB`,
          contentType: headers['Content-Type']?.substring(0, 80),
          boundary: headers['Content-Type']?.match(/boundary=([^;]+)/)?.[1]?.substring(0, 30),
        })

      // 使用 Buffer 作为 body（Node.js fetch 原生支持 Buffer）
      // 确保 Content-Type 正确设置（带 boundary）
      const response = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: headers, // 包含 Content-Type（带 boundary）和 Authorization
        body: formDataBuffer, // 使用 Buffer，Node.js fetch 原生支持
        signal: controller.signal, // 超时控制（120秒）
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        let errorJson: any = {}
        try {
          errorJson = JSON.parse(errorText)
        } catch {
          // 如果不是 JSON，使用原始文本
        }
        const errorMessage = errorJson.error?.message || errorJson.message || response.statusText || errorText
        isDev &&
          console.error('Whisper API 错误响应:', {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            responseText: errorText.substring(0, 500),
            contentType: response.headers.get('content-type'),
          })
        throw new Error(`Whisper API error: ${errorMessage}`)
      }

      const result = await response.json()
      isDev &&
        console.log('✓ Whisper 转录成功:', {
          textLength: result.text?.length || 0,
          segmentsCount: result.segments?.length || 0,
          duration: result.segments?.length
            ? `${Math.ceil(result.segments[result.segments.length - 1].end)}秒`
            : 'unknown',
        })

      return {
        text: result.text || '',
        segments: result.segments?.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text.trim(),
        })),
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      if (fetchError.name === 'AbortError') {
        throw new Error(`Whisper API 请求超时（${timeoutMs / 1000}秒）。音频文件可能过大或网络连接较慢。`)
      }
      throw fetchError
    }
  } catch (error: any) {
    console.error('Error transcribing audio:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
    })
    throw error
  }
}

/**
 * 将 Whisper API 返回的 segments 转换为 CommonSubtitleItem 格式
 */
export function convertWhisperSegmentsToSubtitleItems(
  segments: Array<{ start: number; end: number; text: string }>,
  shouldShowTimestamp?: boolean,
): Array<CommonSubtitleItem> {
  return segments.map((segment, index) => ({
    index: index + 1,
    text: shouldShowTimestamp ? `[${formatTimestamp(segment.start)}] ${segment.text}` : segment.text,
    s: shouldShowTimestamp ? segment.start : undefined,
  }))
}

/**
 * 格式化时间戳为 mm:ss 格式
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 使用 Whisper API 转录视频音频
 */
export async function transcribeVideoAudio(
  audioBuffer: Buffer,
  videoConfig: VideoConfig,
  userKey?: string,
  shouldShowTimestamp?: boolean,
  filename?: string,
): Promise<{
  subtitlesArray: Array<CommonSubtitleItem>
  duration?: number
}> {
  // 获取 API Key
  const { apiKey, apiBaseUrl } = await selectApiKeyAndActivatedLicenseKey(userKey, videoConfig.videoId)

  if (!apiKey) {
    throw new Error('No API key available for Whisper transcription')
  }

  // 检查音频文件大小（Whisper API 限制 25MB）
  const maxSize = 25 * 1024 * 1024 // 25MB
  const fileSizeMB = audioBuffer.length / 1024 / 1024

  if (audioBuffer.length > maxSize) {
    throw new Error(`Audio file too large: ${fileSizeMB.toFixed(2)}MB (max 25MB)`)
  }

  // 验证 Buffer 不为空
  if (audioBuffer.length === 0) {
    throw new Error('Audio buffer is empty')
  }

  isDev && console.log(`准备转录音频: ${fileSizeMB.toFixed(2)}MB`)

  // 检测音频格式以确定正确的文件名
  let detectedFilename = filename || 'audio.mp3'
  if (!filename && audioBuffer.length >= 4) {
    const header = audioBuffer.slice(0, 4)
    const headerHex = header.toString('hex')
    if (headerHex.startsWith('000000') || header.slice(4, 8).toString('ascii') === 'ftyp') {
      detectedFilename = 'audio.m4a'
    } else if (headerHex.startsWith('1a45dfa3')) {
      detectedFilename = 'audio.webm'
    }
  }

  // 使用 Whisper API 转录
  const transcription = await transcribeAudioWithWhisper(audioBuffer, apiKey, apiBaseUrl, detectedFilename)

  // 转换为字幕格式
  const subtitlesArray = transcription.segments
    ? convertWhisperSegmentsToSubtitleItems(transcription.segments, shouldShowTimestamp)
    : [
        {
          index: 1,
          text: transcription.text,
          s: shouldShowTimestamp ? 0 : undefined,
        },
      ]

  // 计算时长（从最后一个 segment 的 end 时间获取）
  const duration = transcription.segments?.length
    ? Math.ceil(transcription.segments[transcription.segments.length - 1].end)
    : undefined

  return {
    subtitlesArray,
    duration,
  }
}
