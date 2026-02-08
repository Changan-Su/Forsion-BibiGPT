import { useState } from 'react'
import { useToast } from '~/hooks/use-toast'
import { UserConfig, VideoConfig, CommonSubtitleItem } from '~/lib/types'
import { RATE_LIMIT_COUNT } from '~/utils/constants'
import type { ProcessingStatus } from '~/components/ProcessingStatusWindow'

export function useSummarize(showSingIn: (show: boolean) => void, enableStream: boolean = true) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string>('')
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined)
  const [videoTitle, setVideoTitle] = useState<string>('')
  const [subtitlesArray, setSubtitlesArray] = useState<CommonSubtitleItem[] | null>(null)
  const [subtitleSource, setSubtitleSource] = useState<'subtitle' | 'audio' | undefined>(undefined)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    message: '等待开始...',
  })
  const { toast } = useToast()

  const resetSummary = () => {
    setSummary('')
    setVideoTitle('')
    setSubtitlesArray(null)
    setSubtitleSource(undefined)
    setProcessingStatus({
      stage: 'idle',
      message: '等待开始...',
    })
  }

  // 使用缓存的字幕数据重新生成总结（不重新获取字幕）
  const resummarize = async (
    videoConfig: VideoConfig,
    userConfig: UserConfig,
    cachedSubtitles: CommonSubtitleItem[],
    title?: string,
    cachedDuration?: number,
    customPrompt?: string,
  ) => {
    if (!cachedSubtitles || cachedSubtitles.length === 0) {
      toast({
        variant: 'destructive',
        title: '无法重新生成',
        description: '当前视频没有缓存的字幕数据，请重新总结该视频。',
      })
      return
    }

    setSummary('')
    setLoading(true)
    setProcessingStatus({
      stage: 'generating_summary',
      message: '正在使用新设置重新生成总结...',
      progress: 20,
    })

    try {
      const response = await fetch('/api/resummarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtitlesArray: cachedSubtitles,
          videoConfig,
          userConfig,
          title: title || '',
          duration: cachedDuration,
          customPrompt: customPrompt || undefined,
        }),
      })

      if (!response.ok) {
        const errorJson = await response.json()
        toast({
          variant: 'destructive',
          title: '重新生成失败',
          description: errorJson.errorMessage || '请重试',
        })
        setProcessingStatus({ stage: 'error', message: '重新生成失败', error: `HTTP ${response.status}` })
        setLoading(false)
        return
      }

      // 处理流式响应（与 summarize 相同的逻辑）
      const data = response.body
      if (!data) {
        setLoading(false)
        return
      }

      const reader = data.getReader()
      const decoder = new TextDecoder()
      let done = false
      let metadataExtracted = false
      let hasReceivedContent = false
      let totalReceivedLength = 0

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (!value) continue

        let chunk = decoder.decode(value, { stream: true })

        // 提取 SSE 数据事件
        let foundSSE = true
        while (foundSSE) {
          foundSSE = false
          const sseMatch = chunk.match(/data:\s*(.*?)\n\n/s)
          if (sseMatch) {
            try {
              const eventData = JSON.parse(sseMatch[1])

              if (eventData.type === 'progress') {
                setProcessingStatus({
                  stage: eventData.stage as ProcessingStatus['stage'],
                  message: eventData.message,
                  progress: eventData.progress,
                })
                chunk = chunk.replace(sseMatch[0], '')
                foundSSE = true
                continue
              }

              if (eventData.type === 'metadata' && !metadataExtracted) {
                if (typeof eventData.duration === 'number') {
                  setVideoDuration(eventData.duration)
                }
                if (typeof eventData.title === 'string' && eventData.title) {
                  setVideoTitle(eventData.title)
                }
                // resummarize API 不再回传 subtitlesArray（前端已有缓存），
                // 仅在确实收到时才更新，避免覆盖已有数据
                if (Array.isArray(eventData.subtitlesArray) && eventData.subtitlesArray.length > 0) {
                  setSubtitlesArray(eventData.subtitlesArray)
                }
                if (eventData.subtitleSource) {
                  setSubtitleSource(eventData.subtitleSource || 'subtitle')
                }
                metadataExtracted = true
                chunk = chunk.replace(sseMatch[0], '')
                foundSSE = true
                continue
              }

              chunk = chunk.replace(sseMatch[0], '')
              foundSSE = true
            } catch (e) {
              foundSSE = false
            }
          }
        }

        if (chunk) {
          if (!hasReceivedContent && chunk.trim()) {
            hasReceivedContent = true
          }
          if (hasReceivedContent || chunk.trim()) {
            totalReceivedLength += chunk.length
            setSummary((prev) => prev + chunk)
            const estimatedProgress = Math.min(95, 60 + Math.floor((totalReceivedLength / 2000) * 35))
            setProcessingStatus({
              stage: 'generating_summary',
              message: '正在生成 AI 总结...',
              progress: estimatedProgress,
            })
          }
        }
      }

      setProcessingStatus({ stage: 'completed', message: '总结重新生成完成', progress: 100 })
      setLoading(false)
    } catch (e: any) {
      console.error('[resummarize ERROR]', e)
      setProcessingStatus({ stage: 'error', message: '处理失败', error: e.message || e.errorMessage })
      toast({
        variant: 'destructive',
        title: '未知错误：',
        description: e.message || e.errorMessage,
      })
      setLoading(false)
    }
  }

  const summarize = async (videoConfig: VideoConfig, userConfig: UserConfig) => {
    setSummary('')
    setLoading(true)
    setProcessingStatus({
      stage: 'fetching_subtitle',
      message: '正在提取视频字幕...',
      progress: 0,
    })

    try {
      setLoading(true)
      const response = await fetch('/api/sumup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoConfig,
          userConfig,
        }),
      })

      if (response.redirected) {
        window.location.href = response.url
      }

      if (!response.ok) {
        console.log('error', response)
        if (response.status === 400) {
          const errorJson = await response.json()
          toast({
            title: errorJson.error || '啊叻？',
            description: errorJson.errorMessage || '此视频暂无字幕，请尝试其他视频。',
          })
        } else if (response.status === 501) {
          toast({
            title: '啊叻？视频字幕不见了？！',
            description: `\n（这个视频太短了...\n或者还没有字幕哦！）`,
          })
        } else if (response.status === 504) {
          toast({
            variant: 'destructive',
            title: `网站访问量过大`,
            description: `每日限额使用 ${RATE_LIMIT_COUNT} 次哦！`,
          })
        } else if (response.status === 401) {
          toast({
            variant: 'destructive',
            title: `${response.statusText} 请登录哦！`,
            // ReadableStream can't get error message
            // description: response.body
            description: '每天的免费次数已经用完啦，🆓',
          })
          showSingIn(true)
        } else {
          const errorJson = await response.json()
          toast({
            variant: 'destructive',
            title: response.status + ' ' + response.statusText,
            // ReadableStream can't get error message
            description: errorJson.errorMessage,
          })
        }
        setProcessingStatus({
          stage: 'error',
          message: '请求失败',
          error: `HTTP ${response.status}`,
        })
        setLoading(false)
        return
      }

      if (enableStream) {
        // This data is a ReadableStream
        const data = response.body
        if (!data) {
          return
        }

        const reader = data.getReader()
        const decoder = new TextDecoder()
        let done = false
        let metadataExtracted = false
        let hasReceivedContent = false
        let totalReceivedLength = 0

        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          if (!value) continue

          let chunk = decoder.decode(value, { stream: true })

          // 提取 SSE 数据事件（progress/metadata）
          // SSE 事件格式为: data: {JSON}\n\n，始终出现在 OpenAI 内容之前
          let foundSSE = true
          while (foundSSE) {
            foundSSE = false
            // 匹配 SSE 事件: data: {JSON}\n\n（非贪婪匹配到第一个 \n\n）
            const sseMatch = chunk.match(/data:\s*(.*?)\n\n/s)
            if (sseMatch) {
              try {
                const eventData = JSON.parse(sseMatch[1])

                // 处理进度事件
                if (eventData.type === 'progress') {
                  setProcessingStatus({
                    stage: eventData.stage as ProcessingStatus['stage'],
                    message: eventData.message,
                    progress: eventData.progress,
                  })
                  chunk = chunk.replace(sseMatch[0], '')
                  foundSSE = true
                  continue
                }

                // 处理元数据
                if (eventData.type === 'metadata' && !metadataExtracted) {
                  if (typeof eventData.duration === 'number') {
                    setVideoDuration(eventData.duration)
                  }
                  if (typeof eventData.title === 'string' && eventData.title) {
                    console.log('[useSummarize] 接收到视频标题:', eventData.title)
                    setVideoTitle(eventData.title)
                  }
                  // 接收字幕数据（无论是否为空数组都处理）
                  if (Array.isArray(eventData.subtitlesArray)) {
                    if (eventData.subtitlesArray.length > 0) {
                      console.log('[useSummarize] 接收到字幕数据:', {
                        count: eventData.subtitlesArray.length,
                        source: eventData.subtitleSource,
                      })
                      console.log(
                        '[useSummarize] 字幕内容预览（前5条）:',
                        eventData.subtitlesArray.slice(0, 5).map((item: any) => ({
                          index: item.index,
                          time: item.s,
                          text: item.text?.substring(0, 50) + (item.text?.length > 50 ? '...' : ''),
                        })),
                      )
                      const allText = eventData.subtitlesArray.map((item: any) => item.text).join('\n')
                      console.log(
                        '[useSummarize] 完整字幕文本:',
                        allText.substring(0, 500) + (allText.length > 500 ? '...' : ''),
                      )
                      setSubtitlesArray(eventData.subtitlesArray)
                      setSubtitleSource(eventData.subtitleSource || 'subtitle')
                    } else {
                      console.log('[useSummarize] 接收到空字幕数组（视频无字幕）:', {
                        source: eventData.subtitleSource,
                      })
                      setSubtitlesArray([])
                      setSubtitleSource(eventData.subtitleSource || undefined)
                    }
                  } else {
                    console.log('[useSummarize] 未接收到字幕数据（不是数组）:', {
                      hasSubtitlesArray: !!eventData.subtitlesArray,
                      isArray: Array.isArray(eventData.subtitlesArray),
                      type: typeof eventData.subtitlesArray,
                      subtitleSource: eventData.subtitleSource,
                    })
                  }
                  metadataExtracted = true
                  chunk = chunk.replace(sseMatch[0], '')
                  foundSSE = true
                  continue
                }

                // 未知事件类型，也移除
                chunk = chunk.replace(sseMatch[0], '')
                foundSSE = true
              } catch (e) {
                // JSON 解析失败，不是 SSE 事件，停止尝试
                foundSSE = false
              }
            }
          }

          // 剩余内容直接追加到 summary（保留原始换行符）
          if (chunk) {
            if (!hasReceivedContent && chunk.trim()) {
              hasReceivedContent = true
            }
            if (hasReceivedContent || chunk.trim()) {
              totalReceivedLength += chunk.length
              setSummary((prev) => prev + chunk)

              // 关键修复：进度更新放在 setSummary 外部，确保 React 正确处理状态更新
              const estimatedProgress = Math.min(95, 60 + Math.floor((totalReceivedLength / 2000) * 35))
              setProcessingStatus({
                stage: 'generating_summary',
                message: '正在生成 AI 总结...',
                progress: estimatedProgress,
              })
            }
          }
        }

        // 流结束，标记为完成
        setProcessingStatus({
          stage: 'completed',
          message: '总结生成完成',
          progress: 100,
        })

        setLoading(false)
        return
      }
      // await readStream(response, setSummary);
      const result = await response.json()
      if (result.errorMessage) {
        setLoading(false)
        toast({
          variant: 'destructive',
          title: 'API 请求出错，请重试。',
          description: result.errorMessage,
        })
        return
      }
      setSummary(result)
      setLoading(false)
    } catch (e: any) {
      console.error('[fetch ERROR]', e)
      setProcessingStatus({
        stage: 'error',
        message: '处理失败',
        error: e.message || e.errorMessage,
      })
      toast({
        variant: 'destructive',
        title: '未知错误：',
        description: e.message || e.errorMessage,
      })
      setLoading(false)
    }
  }
  return {
    loading,
    summary,
    resetSummary,
    summarize,
    resummarize,
    setSummary,
    videoDuration,
    videoTitle,
    setVideoTitle,
    subtitlesArray,
    setSubtitlesArray,
    subtitleSource,
    processingStatus,
  }
}
