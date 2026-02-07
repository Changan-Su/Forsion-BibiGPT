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
        let buffer = ''

        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          if (!value) continue

          buffer += decoder.decode(value, { stream: true })

          // 处理 SSE 格式的消息（按行解析，避免分块 JSON 解析失败）
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          let contentChunk = ''

          for (const line of lines) {
            if (!hasReceivedContent && line.startsWith('data:')) {
              const jsonStr = line.replace(/^data:\s?/, '')
              try {
                const data = JSON.parse(jsonStr)

                // 处理进度事件
                if (data.type === 'progress') {
                  setProcessingStatus((prev) => {
                    const hasProgress = typeof data.progress === 'number'
                    const baseProgress = hasProgress ? data.progress : prev.progress
                    const progress =
                      data.stage === 'generating_summary' && !hasReceivedContent
                        ? prev.progress ?? baseProgress
                        : baseProgress
                    return {
                      stage: data.stage as ProcessingStatus['stage'],
                      message: data.message,
                      progress,
                    }
                  })
                  continue
                }

                // 处理元数据
                if (data.type === 'metadata' && !metadataExtracted) {
                  if (typeof data.duration === 'number') {
                    setVideoDuration(data.duration)
                  }
                  if (typeof data.title === 'string' && data.title) {
                    console.log('[useSummarize] 接收到视频标题:', data.title)
                    setVideoTitle(data.title)
                  }
                  // 接收字幕数据（无论是否为空数组都处理）
                  if (Array.isArray(data.subtitlesArray)) {
                    if (data.subtitlesArray.length > 0) {
                      console.log('[useSummarize] 接收到字幕数据:', {
                        count: data.subtitlesArray.length,
                        source: data.subtitleSource,
                      })
                      // 显示前几条字幕内容用于调试
                      console.log(
                        '[useSummarize] 字幕内容预览（前5条）:',
                        data.subtitlesArray.slice(0, 5).map((item: any) => ({
                          index: item.index,
                          time: item.s,
                          text: item.text?.substring(0, 50) + (item.text?.length > 50 ? '...' : ''),
                        })),
                      )
                      // 显示所有字幕文本（用于调试）
                      const allText = data.subtitlesArray.map((item: any) => item.text).join('\n')
                      console.log(
                        '[useSummarize] 完整字幕文本:',
                        allText.substring(0, 500) + (allText.length > 500 ? '...' : ''),
                      )
                      setSubtitlesArray(data.subtitlesArray)
                      setSubtitleSource(data.subtitleSource || 'subtitle')
                    } else {
                      // 接收到空数组，说明视频没有字幕
                      console.log('[useSummarize] 接收到空字幕数组（视频无字幕）:', {
                        source: data.subtitleSource,
                      })
                      setSubtitlesArray([])
                      setSubtitleSource(data.subtitleSource || undefined)
                    }
                  } else {
                    console.log('[useSummarize] 未接收到字幕数据（不是数组）:', {
                      hasSubtitlesArray: !!data.subtitlesArray,
                      isArray: Array.isArray(data.subtitlesArray),
                      type: typeof data.subtitlesArray,
                      subtitleSource: data.subtitleSource,
                    })
                  }
                  metadataExtracted = true
                  continue
                }
              } catch (e) {
                contentChunk += line + '\n'
              }
            } else {
              contentChunk += line + '\n'
            }
          }

          if (hasReceivedContent && buffer) {
            contentChunk += buffer
            buffer = ''
          }

          // 添加内容到summary
          if (contentChunk) {
            const wasFirstContent = !hasReceivedContent
            hasReceivedContent = true
            setSummary((prev) => {
              const newSummary = prev + contentChunk
              // 更新进度：当开始接收内容时，表示正在生成总结
              if (wasFirstContent) {
                setProcessingStatus({
                  stage: 'generating_summary',
                  message: '正在生成 AI 总结...',
                  progress: 60,
                })
              } else {
                // 根据已接收的内容长度估算进度（60-95%）
                const estimatedProgress = Math.min(95, 60 + Math.floor((newSummary.length / 2000) * 35))
                setProcessingStatus((prev) => ({
                  ...prev,
                  progress: estimatedProgress,
                }))
              }
              return newSummary
            })
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
    setSummary,
    videoDuration,
    videoTitle,
    setVideoTitle,
    subtitlesArray,
    subtitleSource,
    processingStatus,
  }
}
