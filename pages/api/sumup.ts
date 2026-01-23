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
    isDev && console.log('开始提取字幕，videoConfig:', JSON.stringify(videoConfig, null, 2))
    const { title, subtitlesArray, descriptionText, duration, source } = await fetchSubtitle(
      videoConfig,
      shouldShowTimestamp,
      userKey,
      enableAudioTranscription,
    )

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

        errorMessage =
          source === 'audio'
            ? `抱歉，该抖音视频没有字幕，且音频转文字失败。${apiHint}请检查服务器配置（需要安装 yt-dlp）或尝试其他视频。抖音视频通常需要音频转文字功能。`
            : `抱歉，该抖音视频没有字幕或简介内容。${apiHint}请检查服务器配置（需要安装 yt-dlp 和 ffmpeg）或尝试其他视频。`
      } else if (isYoutube) {
        errorMessage =
          source === 'audio'
            ? '抱歉，该YouTube视频没有字幕，且音频转文字失败。请检查服务器配置（需要安装 yt-dlp）或尝试其他视频。'
            : '抱歉，该YouTube视频没有字幕或简介内容。系统已尝试多种方法提取字幕（yt-dlp、savesubs.com）和音频转文字，但均未成功。请检查服务器配置或尝试其他视频。'
      } else {
        errorMessage =
          source === 'audio'
            ? '抱歉，该视频没有字幕，且音频转文字失败。请检查服务器配置（需要安装 yt-dlp）或尝试其他视频。'
            : '抱歉，该视频没有字幕或简介内容。系统已尝试音频转文字，但未成功。请尝试其他视频或检查配置。'
      }

      return res.status(400).json({
        error: '此视频暂无字幕或简介',
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

      // 在流式响应开头添加元数据（包括duration和title）
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
      if (Object.keys(metadata).length > 0) {
        metadata.type = 'metadata'
        const metadataStr = `data: ${JSON.stringify(metadata)}\n\n`
        isDev && console.log('[API] 元数据内容:', metadataStr)
        res.write(metadataStr)
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
