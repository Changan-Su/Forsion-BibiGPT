import type { NextApiRequest, NextApiResponse } from 'next'
import { Readable } from 'stream'
import { fetchSubtitle } from '~/lib/fetchSubtitle'
import { ChatGPTAgent, fetchOpenAIResult } from '~/lib/openai/fetchOpenAIResult'
import { getSmallSizeTranscripts } from '~/lib/openai/getSmallSizeTranscripts'
import {
  getUserSubtitlePrompt,
  getUserSubtitleWithTimestampPrompt,
  getStructuredSummaryPrompt,
  getStructuredSummaryWithTimestampPrompt,
} from '~/lib/openai/prompt'
import { selectApiKeyAndActivatedLicenseKey } from '~/lib/openai/selectApiKeyAndActivatedLicenseKey'
import { SummarizeParams } from '~/lib/types'
import { isDev } from '~/utils/env'

// 配置 API 路由使用外部解析器，避免 Sentry 误报警告
export const config = {
  api: {
    externalResolver: true,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { videoConfig, userConfig } = req.body as SummarizeParams
  const { userKey, shouldShowTimestamp } = userConfig
  const { videoId } = videoConfig

  if (!videoId) {
    return res.status(500).json({ error: 'No videoId in the request' })
  }

  // 启用音频转文字功能（当字幕不存在时）
  const enableAudioTranscription = process.env.ENABLE_AUDIO_TRANSCRIPTION !== 'false' // 默认启用

  const stream = true // 提前定义 stream 变量

  // 如果是流式响应，提前设置响应头
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
  }

  // 发送进度事件的辅助函数
  const sendProgress = (stage: string, message: string, progress?: number) => {
    if (stream) {
      const progressData = {
        type: 'progress',
        stage,
        message,
        progress,
      }
      res.write(`data: ${JSON.stringify(progressData)}\n\n`)
    }
  }

  try {
    isDev && console.log('开始提取字幕，videoConfig:', JSON.stringify(videoConfig, null, 2))

    sendProgress('fetching_subtitle', '正在提取视频字幕...', 10)

    const { title, subtitlesArray, descriptionText, duration, source } = await fetchSubtitle(
      videoConfig,
      shouldShowTimestamp,
      userKey,
      enableAudioTranscription,
    )

    // 如果使用了音频转文字，发送进度事件
    if (source === 'audio') {
      sendProgress('transcribing_audio', '正在转录音频为文字...', 40)
    } else {
      sendProgress('fetching_subtitle', '字幕提取完成', 30)
    }

    isDev &&
      console.log('字幕提取结果:', {
        hasSubtitles: !!subtitlesArray && subtitlesArray.length > 0,
        subtitleCount: subtitlesArray?.length || 0,
        hasDescription: !!descriptionText,
        duration,
        source,
        title,
      })

    if (!subtitlesArray && !descriptionText) {
      console.error('No subtitle in the video and audio transcription failed: ', videoId, {
        source,
        duration,
        title,
        service: videoConfig.service,
      })
      const isYoutube = videoConfig.service === 'youtube'
      const isDouyin = videoConfig.service === 'douyin'
      const isBilibili = videoConfig.service === 'bilibili'
      let errorMessage = ''

      if (isDouyin) {
        const apiEnabled = process.env.DOUYIN_API_ENABLED !== 'false'
        const apiBaseUrl = process.env.DOUYIN_API_BASE_URL
        const apiHint =
          apiEnabled && apiBaseUrl
            ? '系统已尝试 yt-dlp 和 Douyin API 回退方案，但均未成功。'
            : apiEnabled
            ? '系统已尝试 yt-dlp，但未成功。建议配置 DOUYIN_API_BASE_URL 以启用 API 回退方案。'
            : '系统已尝试 yt-dlp，但未成功。建议启用 DOUYIN_API_ENABLED=true 并配置 DOUYIN_API_BASE_URL 以使用 API 回退方案。'

        errorMessage = `抱歉，该抖音视频没有字幕。${apiHint}如需使用音频转文字功能，请确保服务器已安装 yt-dlp 和 ffmpeg。抖音视频通常需要音频转文字功能。`
      } else if (isYoutube) {
        errorMessage = `抱歉，该 YouTube 视频没有字幕。系统已尝试多种方法提取字幕（yt-dlp、savesubs.com），但均未成功。如需使用音频转文字功能，请确保服务器已安装 yt-dlp。`
      } else if (isBilibili) {
        errorMessage = `抱歉，该 B 站视频没有字幕。如需使用音频转文字功能，请确保服务器已安装 yt-dlp。当前 yt-dlp 状态：${
          source === 'audio' ? '已安装但转写失败' : '未安装或不可用'
        }。`
      } else {
        errorMessage = `抱歉，该视频没有字幕。如需使用音频转文字功能，请确保服务器已安装 yt-dlp。`
      }

      return res.status(400).json({
        error: '此视频暂无字幕',
        errorMessage,
      })
    }

    // 如果使用了音频转文字，记录日志
    if (source === 'audio' && isDev) {
      console.log('使用音频转文字功能获取内容')
    }

    const inputText = subtitlesArray ? getSmallSizeTranscripts(subtitlesArray, subtitlesArray) : descriptionText

    // 使用新的结构化总结prompt（默认使用新格式）
    const useStructuredSummary = true // 默认启用结构化总结
    const userPrompt = useStructuredSummary
      ? shouldShowTimestamp
        ? getStructuredSummaryWithTimestampPrompt(title, inputText, videoConfig, duration)
        : getStructuredSummaryPrompt(title, inputText, videoConfig, duration)
      : shouldShowTimestamp
      ? getUserSubtitleWithTimestampPrompt(title, inputText, videoConfig)
      : getUserSubtitlePrompt(title, inputText, videoConfig)

    if (isDev) {
      console.log('final user prompt: ', userPrompt)
    }

    const openAiPayload = {
      model: videoConfig.summaryModel || 'gpt-4o-mini',
      messages: [{ role: ChatGPTAgent.user, content: userPrompt }],
      max_tokens: useStructuredSummary
        ? Number(videoConfig.detailLevel) || (userKey ? 4000 : 3000) // 结构化总结需要更多token，提升默认值以处理完整字幕
        : Number(videoConfig.detailLevel) || (userKey ? 2000 : 1500), // 非结构化总结也提升默认值
      stream,
    }

    const { apiKey, apiBaseUrl } = await selectApiKeyAndActivatedLicenseKey(userKey, videoId)
    isDev && console.log('API Config selected:', { hasApiKey: !!apiKey, apiBaseUrl })

    // 发送进度事件：开始生成总结
    sendProgress('generating_summary', '正在生成 AI 总结...', 60)

    const result = await fetchOpenAIResult(openAiPayload, apiKey, videoConfig, apiBaseUrl)

    if (stream) {
      // 在流式响应开头添加元数据（包括duration、title和字幕数据）
      const metadata: any = {}
      if (duration) {
        metadata.duration = duration
      }
      if (title && title.trim()) {
        metadata.title = title.trim()
        isDev && console.log('[API] 发送视频标题到前端:', metadata.title)
      } else {
        isDev && console.warn('[API] 视频标题为空或未定义:', { title, videoId })
      }
      // 添加字幕数据到元数据（无论是否有字幕都发送，便于前端调试）
      // 确保 subtitlesArray 始终是数组（null 转换为空数组）
      const normalizedSubtitlesArray = Array.isArray(subtitlesArray) ? subtitlesArray : []

      if (normalizedSubtitlesArray.length > 0) {
        metadata.subtitlesArray = normalizedSubtitlesArray
        metadata.subtitleSource = source || 'subtitle'
        isDev &&
          console.log('[API] 发送字幕数据到前端:', {
            count: normalizedSubtitlesArray.length,
            source: source || 'subtitle',
          })
        // 显示字幕内容预览
        isDev &&
          console.log(
            '[API] 字幕内容预览（前5条）:',
            normalizedSubtitlesArray.slice(0, 5).map((item: any) => ({
              index: item.index,
              time: item.s,
              text: item.text?.substring(0, 50) + (item.text?.length > 50 ? '...' : ''),
            })),
          )
        // 显示完整字幕文本
        const allText = normalizedSubtitlesArray.map((item: any) => item.text).join('\n')
        isDev && console.log('[API] 完整字幕文本:', allText.substring(0, 500) + (allText.length > 500 ? '...' : ''))
        // 检查字幕数据大小
        const subtitleDataSize = JSON.stringify(normalizedSubtitlesArray).length
        isDev && console.log('[API] 字幕数据大小:', subtitleDataSize, '字节')
        if (subtitleDataSize > 1000000) {
          isDev && console.warn('[API] 警告：字幕数据较大，可能影响传输性能')
        }
      } else {
        // 即使没有字幕，也发送空数组和来源信息，便于前端调试
        metadata.subtitlesArray = []
        metadata.subtitleSource = source || undefined
        isDev &&
          console.log('[API] 无字幕数据，发送空数组到前端:', {
            originalSubtitlesArray: subtitlesArray,
            isNull: subtitlesArray === null,
            isArray: Array.isArray(subtitlesArray),
            length: subtitlesArray?.length || 0,
            source: source,
          })
      }
      if (Object.keys(metadata).length > 0) {
        metadata.type = 'metadata'
        const metadataStr = `data: ${JSON.stringify(metadata)}\n\n`
        isDev && console.log('[API] 元数据内容:', metadataStr)
        res.write(metadataStr)
      }

      // 转换 Web ReadableStream 为 Node.js Readable Stream
      const nodeStream = Readable.fromWeb(result as any)
      nodeStream.pipe(res)

      // 注意：流结束事件可能不会触发，因为 res 连接可能已关闭
      // 我们通过前端检测流结束来判断完成状态
    } else {
      // 非流式响应也需要包含字幕数据
      const responseData: any = { result }
      if (subtitlesArray && subtitlesArray.length > 0) {
        responseData.subtitlesArray = subtitlesArray
        responseData.subtitleSource = source || 'subtitle'
      }
      res.status(200).json(responseData)
    }
  } catch (error: any) {
    console.error('Sumup API Error:', {
      message: error.message,
      stack: error.stack,
    })

    // 如果已经设置了流式响应头，使用 SSE 格式发送错误
    if (stream && res.headersSent === false) {
      // 如果响应头还没有发送，先设置流式响应头
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
    }

    if (stream) {
      // 通过 SSE 格式发送错误
      const errorData = {
        type: 'error',
        error: error.message || 'Unknown error',
        errorMessage: error.message || 'Unknown error',
      }
      res.write(`data: ${JSON.stringify(errorData)}\n\n`)
      res.end()
    } else {
      // 非流式响应，直接返回 JSON 错误
      res.status(500).json({
        error: error.message || 'Unknown error',
        errorMessage: error.message || 'Unknown error',
      })
    }
  }
}
