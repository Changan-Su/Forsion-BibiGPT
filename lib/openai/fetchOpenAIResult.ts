import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser'
import { trimOpenAiResult } from '~/lib/openai/trimOpenAiResult'
import { VideoConfig } from '~/lib/types'
import { isDev } from '~/utils/env'
import { getCacheId } from '~/utils/getCacheId'
// Redis caching disabled in Edge Runtime (ioredis not compatible)
// import { redis } from './ratelimit'

export enum ChatGPTAgent {
  user = 'user',
  system = 'system',
  assistant = 'assistant',
}

export interface ChatGPTMessage {
  role: ChatGPTAgent
  content: string
}
export interface OpenAIStreamPayload {
  api_key?: string
  model: string
  messages: ChatGPTMessage[]
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  max_tokens: number
  stream: boolean
  n?: number
}

export async function fetchOpenAIResult(
  payload: OpenAIStreamPayload,
  apiKey: string,
  videoConfig: VideoConfig,
  apiBaseUrl?: string,
) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  // Use custom API URL if provided, otherwise use default OpenAI URL
  const baseUrl = apiBaseUrl || process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
  const apiUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`

  isDev &&
    console.log({
      apiUrl,
      'process.env.OPENAI_API_BASE_URL': process.env.OPENAI_API_BASE_URL,
      'apiBaseUrl parameter': apiBaseUrl,
    })

  // Remove api_key from payload before sending
  const { api_key, ...cleanPayload } = payload

  let res: Response
  try {
    res = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey ?? ''}`,
      },
      method: 'POST',
      body: JSON.stringify(cleanPayload),
      signal: AbortSignal.timeout(30000), // 改为 30s，Node.js 环境下足够
    })
  } catch (fetchError: any) {
    console.error('Fetch error details:', {
      message: fetchError.message,
      name: fetchError.name,
      cause: fetchError.cause,
    })
    throw new Error(`Failed to connect to OpenAI API: ${fetchError.message}`)
  }

  if (res.status !== 200) {
    let errorMessage = 'Unknown error'
    try {
      const errorJson = await res.json()
      errorMessage = errorJson.error?.message || errorJson.message || res.statusText
    } catch {
      errorMessage = res.statusText
    }
    console.error('OpenAI API Error:', { status: res.status, errorMessage })
    throw new Error(`API Error [${res.status} ${res.statusText}]: ${errorMessage}`)
  }

  const cacheId = getCacheId(videoConfig)

  if (!payload.stream) {
    const result = await res.json()
    const betterResult = trimOpenAiResult(result)
    console.info(`video ${cacheId} - caching disabled`)
    isDev && console.log('========betterResult========', betterResult)
    return betterResult
  }

  let counter = 0
  let tempData = ''
  const stream = new ReadableStream({
    async start(controller) {
      async function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === 'event') {
          const data = event.data
          if (data === '[DONE]') {
            controller.close()
            console.info(`video ${cacheId} - stream completed`)
            isDev && console.log('========betterResult after streamed========', tempData)
            return
          }
          try {
            const json = JSON.parse(data)
            const text = json.choices[0]?.delta?.content || ''
            tempData += text
            if (counter < 2 && (text.match(/\n/) || []).length) {
              return
            }
            const queue = encoder.encode(text)
            controller.enqueue(queue)
            counter++
          } catch (e) {
            console.error('Parse error:', e)
            controller.error(e)
          }
        }
      }

      const parser = createParser(onParse)
      try {
        for await (const chunk of res.body as any) {
          parser.feed(decoder.decode(chunk))
        }
      } catch (streamError: any) {
        console.error('Stream error:', streamError.message)
        controller.error(streamError)
      }
    },
  })

  return stream
}
