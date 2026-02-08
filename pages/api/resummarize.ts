import type { NextApiRequest, NextApiResponse } from 'next'
import { Readable } from 'stream'
import { ChatGPTAgent, fetchOpenAIResult } from '~/lib/openai/fetchOpenAIResult'
import { getSmallSizeTranscripts } from '~/lib/openai/getSmallSizeTranscripts'
import {
  getUserSubtitlePrompt,
  getUserSubtitleWithTimestampPrompt,
  getStructuredSummaryPrompt,
  getStructuredSummaryWithTimestampPrompt,
} from '~/lib/openai/prompt'
import { selectApiKeyAndActivatedLicenseKey } from '~/lib/openai/selectApiKeyAndActivatedLicenseKey'
import { CommonSubtitleItem, VideoConfig } from '~/lib/types'
import { isDev } from '~/utils/env'

// 配置 API 路由：增加 body 大小限制（字幕数据可能较大），使用外部解析器
export const config = {
  api: {
    externalResolver: true,
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}

interface ResummarizeParams {
  subtitlesArray: CommonSubtitleItem[]
  videoConfig: VideoConfig
  userConfig: {
    userKey?: string
    shouldShowTimestamp?: boolean
  }
  title?: string
  duration?: number
  customPrompt?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subtitlesArray, videoConfig, userConfig, title, duration, customPrompt } = req.body as ResummarizeParams
  const { userKey, shouldShowTimestamp } = userConfig

  if (!subtitlesArray || !Array.isArray(subtitlesArray) || subtitlesArray.length === 0) {
    return res.status(400).json({
      error: '无字幕数据',
      errorMessage: '当前视频没有缓存的字幕数据，无法重新生成总结。请重新总结该视频。',
    })
  }

  const stream = true

  // 设置流式响应头
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
  }

  // 发送进度事件
  const sendProgress = (stage: string, message: string, progress?: number) => {
    if (stream) {
      const progressData = { type: 'progress', stage, message, progress }
      res.write(`data: ${JSON.stringify(progressData)}\n\n`)
    }
  }

  try {
    sendProgress('generating_summary', '正在使用新设置重新生成总结...', 30)

    // 使用缓存的字幕数据生成输入文本
    const inputText = getSmallSizeTranscripts(subtitlesArray, subtitlesArray)
    const videoTitle = title?.replace(/\n+/g, ' ').trim() || ''

    isDev &&
      console.log('[resummarize] 使用缓存字幕重新生成总结:', {
        subtitleCount: subtitlesArray.length,
        inputTextLength: inputText.length,
        videoConfig: {
          detailLevel: videoConfig.detailLevel,
          sentenceNumber: videoConfig.sentenceNumber,
          outlineLevel: videoConfig.outlineLevel,
          outputLanguage: videoConfig.outputLanguage,
          showTimestamp: videoConfig.showTimestamp,
          showEmoji: videoConfig.showEmoji,
        },
        hasCustomPrompt: !!customPrompt,
      })

    let userPrompt: string

    if (customPrompt && customPrompt.trim()) {
      // 使用自定义提示词
      const videoTranscript = inputText.replace(/\n+/g, ' ').trim()
      userPrompt = `Title: "${videoTitle}"\nTranscript: "${videoTranscript}"\n\nInstructions: ${customPrompt}`
      isDev && console.log('[resummarize] 使用自定义提示词')
    } else {
      // 使用默认结构化总结 prompt
      const useStructuredSummary = true
      userPrompt = useStructuredSummary
        ? shouldShowTimestamp
          ? getStructuredSummaryWithTimestampPrompt(videoTitle, inputText, videoConfig, duration)
          : getStructuredSummaryPrompt(videoTitle, inputText, videoConfig, duration)
        : shouldShowTimestamp
        ? getUserSubtitleWithTimestampPrompt(videoTitle, inputText, videoConfig)
        : getUserSubtitlePrompt(videoTitle, inputText, videoConfig)
    }

    isDev && console.log('[resummarize] final prompt:', userPrompt.substring(0, 200) + '...')

    sendProgress('generating_summary', '正在调用 AI 模型...', 50)

    const openAiPayload = {
      model: 'gpt-4o-mini',
      messages: [{ role: ChatGPTAgent.user, content: userPrompt }],
      max_tokens: Number(videoConfig.detailLevel) || (userKey ? 2000 : 1500),
      stream,
    }

    const { apiKey, apiBaseUrl } = await selectApiKeyAndActivatedLicenseKey(userKey, videoConfig.videoId)

    sendProgress('generating_summary', '正在生成 AI 总结...', 60)

    const result = await fetchOpenAIResult(openAiPayload, apiKey, videoConfig, apiBaseUrl)

    if (stream) {
      // 发送元数据（不包含 subtitlesArray，前端已缓存，避免大数据量导致 SSE 分块解析失败）
      const metadata: any = { type: 'metadata' }
      if (duration) metadata.duration = duration
      if (videoTitle) metadata.title = videoTitle
      metadata.subtitleSource = 'subtitle'

      res.write(`data: ${JSON.stringify(metadata)}\n\n`)

      const nodeStream = Readable.fromWeb(result as any)
      nodeStream.pipe(res)
    } else {
      res.status(200).json({ result })
    }
  } catch (error: any) {
    console.error('Resummarize API Error:', { message: error.message, stack: error.stack })

    if (stream && !res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
    }

    if (stream) {
      const errorData = {
        type: 'error',
        error: error.message || 'Unknown error',
        errorMessage: error.message || 'Unknown error',
      }
      res.write(`data: ${JSON.stringify(errorData)}\n\n`)
      res.end()
    } else {
      res.status(500).json({
        error: error.message || 'Unknown error',
        errorMessage: error.message || 'Unknown error',
      })
    }
  }
}
