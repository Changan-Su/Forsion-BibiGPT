import type { NextApiRequest, NextApiResponse } from 'next'
import { Readable } from 'stream'
import { ChatGPTAgent, fetchOpenAIResult } from '~/lib/openai/fetchOpenAIResult'
import { selectApiKeyAndActivatedLicenseKey } from '~/lib/openai/selectApiKeyAndActivatedLicenseKey'
import { VideoConfig } from '~/lib/types'
import { isDev } from '~/utils/env'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { summary, action, userKey, videoConfig } = req.body as {
    summary: string
    action: 'polish' | 'rewrite'
    userKey?: string
    videoConfig?: VideoConfig
  }

  if (!summary) {
    return res.status(400).json({ error: 'Summary is required' })
  }

  const actionType = action || 'polish'
  const language = videoConfig?.outputLanguage || '中文'

  // 根据操作类型生成不同的prompt
  let prompt = ''
  if (actionType === 'polish') {
    prompt = `你是一名专业的文本编辑。请对以下视频总结内容进行润色，使其更加流畅、专业、易读。保持原有的结构和格式，只优化文字表达。

要求：
1. 保持原有的markdown格式和结构（包括标题、列表等）
2. 保持所有时间戳不变
3. 优化语言表达，使其更加流畅自然
4. 保持内容的准确性和完整性
5. 使用${language}语言

以下是需要润色的内容：

${summary}`
  } else {
    prompt = `你是一名专业的内容创作者。请对以下视频总结内容进行改写，用不同的表达方式重新组织内容，使其更加生动有趣。

要求：
1. 保持原有的markdown格式和结构（包括标题、列表等）
2. 保持所有时间戳不变
3. 用不同的表达方式重新组织内容
4. 保持内容的准确性和完整性
5. 使用${language}语言

以下是需要改写的内容：

${summary}`
  }

  try {
    const stream = true
    const openAiPayload = {
      model: 'gpt-4o-mini',
      messages: [{ role: ChatGPTAgent.user, content: prompt }],
      max_tokens: 2000,
      stream,
    }

    const { apiKey, apiBaseUrl } = await selectApiKeyAndActivatedLicenseKey(userKey)
    isDev && console.log('Polish/Rewrite API Config selected:', { hasApiKey: !!apiKey, apiBaseUrl })

    const result = await fetchOpenAIResult(openAiPayload, apiKey, videoConfig || {}, apiBaseUrl)

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      // 转换 Web ReadableStream 为 Node.js Readable Stream
      const nodeStream = Readable.fromWeb(result as any)
      nodeStream.pipe(res)
    } else {
      res.status(200).json(result)
    }
  } catch (error: any) {
    console.error('Polish/Rewrite API Error:', {
      message: error.message,
      stack: error.stack,
    })
    res.status(500).json({
      error: error.message || 'Unknown error',
      errorMessage: error.message || 'Unknown error',
    })
  }
}
