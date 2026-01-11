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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { videoConfig, userConfig } = req.body as SummarizeParams
  const { userKey, shouldShowTimestamp } = userConfig
  const { videoId } = videoConfig

  if (!videoId) {
    return res.status(500).json({ error: 'No videoId in the request' })
  }

  // 启用音频转文字功能（当字幕不存在时）
  const enableAudioTranscription = process.env.ENABLE_AUDIO_TRANSCRIPTION !== 'false' // 默认启用

  try {
    const { title, subtitlesArray, descriptionText, duration, source } = await fetchSubtitle(
      videoConfig,
      shouldShowTimestamp,
      userKey,
      enableAudioTranscription,
    )

    if (!subtitlesArray && !descriptionText) {
      console.error('No subtitle in the video and audio transcription failed: ', videoId)
      return res.status(400).json({
        error: '此视频暂无字幕或简介',
        errorMessage:
          source === 'audio'
            ? '抱歉，该视频没有字幕，且音频转文字失败。请检查服务器配置（需要安装 yt-dlp）或尝试其他视频。'
            : '抱歉，该视频没有字幕或简介内容。系统已尝试音频转文字，但未成功。请尝试其他视频或检查配置。',
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

    const stream = true
    const openAiPayload = {
      model: 'gpt-4o-mini',
      messages: [{ role: ChatGPTAgent.user, content: userPrompt }],
      max_tokens: useStructuredSummary
        ? Number(videoConfig.detailLevel) || (userKey ? 2000 : 1500) // 结构化总结需要更多token
        : Number(videoConfig.detailLevel) || (userKey ? 800 : 600),
      stream,
    }

    const { apiKey, apiBaseUrl } = await selectApiKeyAndActivatedLicenseKey(userKey, videoId)
    isDev && console.log('API Config selected:', { hasApiKey: !!apiKey, apiBaseUrl })

    const result = await fetchOpenAIResult(openAiPayload, apiKey, videoConfig, apiBaseUrl)

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      // 如果有duration，在流式响应开头添加元数据
      if (duration) {
        res.write(`data: {"type":"metadata","duration":${duration}}\n\n`)
      }

      // 转换 Web ReadableStream 为 Node.js Readable Stream
      const nodeStream = Readable.fromWeb(result as any)
      nodeStream.pipe(res)
    } else {
      res.status(200).json(result)
    }
  } catch (error: any) {
    console.error('Sumup API Error:', {
      message: error.message,
      stack: error.stack,
    })
    res.status(500).json({
      error: error.message || 'Unknown error',
      errorMessage: error.message || 'Unknown error',
    })
  }
}
