import React, { useState } from 'react'
import Markdown from 'marked-react'
import {
  parseStructuredSummary,
  StructuredSummary,
  HighlightItem,
  ReflectionItem,
  TermExplanation,
  TimelineItem,
} from '~/utils/formatSummary'
import { useToast } from '~/hooks/use-toast'
import { VideoConfig } from '~/lib/types'
import { ShareButton } from '~/components/ShareButton'

interface StructuredSummaryDisplayProps {
  summary: string
  currentVideoUrl: string
  currentVideoId: string
  userKey?: string
  videoConfig?: VideoConfig
  onSummaryUpdate?: (newSummary: string) => void
  videoPlayerController?: { seekTo: (seconds: number) => void } | null
}

// 将时间戳字符串转换为秒数
function timestampToSeconds(timestamp: string): number {
  // 支持格式：MM:SS, HH:MM:SS, 或 4位数字 MMSS
  if (/^\d{4}$/.test(timestamp)) {
    // 4位数字格式：0830 -> 8分30秒
    const minutes = parseInt(timestamp.substring(0, 2), 10)
    const seconds = parseInt(timestamp.substring(2), 10)
    return minutes * 60 + seconds
  }

  const parts = timestamp.split(':')
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
  } else if (parts.length === 3) {
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)
  }
  return 0
}

// 生成视频跳转链接
function getVideoJumpUrl(videoUrl: string, videoId: string, timestamp: string): string {
  const seconds = timestampToSeconds(timestamp)
  if (videoUrl.includes('bilibili.com')) {
    return `https://www.bilibili.com/video/${videoId}/?t=${seconds}`
  } else if (videoUrl.includes('youtube.com')) {
    return `https://youtube.com/watch?v=${videoId}&t=${seconds}s`
  }
  return videoUrl
}

export function StructuredSummaryDisplay({
  summary,
  currentVideoUrl,
  currentVideoId,
  userKey,
  videoConfig,
  onSummaryUpdate,
  videoPlayerController,
}: StructuredSummaryDisplayProps) {
  const { toast } = useToast()
  const [showFullContent, setShowFullContent] = useState(false)
  const [polishedSummary, setPolishedSummary] = useState<string>(summary)
  const [isPolishing, setIsPolishing] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)

  // 使用润色后的总结或原始总结
  const currentSummary = polishedSummary || summary

  // 尝试解析结构化总结
  let structuredData: StructuredSummary | null = null
  try {
    structuredData = parseStructuredSummary(currentSummary)
  } catch (error) {
    console.error('Failed to parse structured summary:', error)
  }

  // AI润色处理函数
  const handlePolish = async () => {
    setIsPolishing(true)
    try {
      const response = await fetch('/api/polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: currentSummary,
          action: 'polish',
          userKey,
          videoConfig,
        }),
      })

      if (!response.ok) {
        throw new Error('润色请求失败')
      }

      const data = response.body
      if (!data) {
        throw new Error('没有返回数据')
      }

      const reader = data.getReader()
      const decoder = new TextDecoder()
      let newSummary = ''
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        newSummary += chunkValue
        setPolishedSummary(newSummary)
      }

      if (onSummaryUpdate) {
        onSummaryUpdate(newSummary)
      }

      toast({
        description: '润色完成 ✨',
      })
    } catch (error: any) {
      console.error('Polish error:', error)
      toast({
        variant: 'destructive',
        title: '润色失败',
        description: error.message || '请重试',
      })
    } finally {
      setIsPolishing(false)
    }
  }

  // AI改写处理函数
  const handleRewrite = async () => {
    setIsRewriting(true)
    try {
      const response = await fetch('/api/polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: currentSummary,
          action: 'rewrite',
          userKey,
          videoConfig,
        }),
      })

      if (!response.ok) {
        throw new Error('改写请求失败')
      }

      const data = response.body
      if (!data) {
        throw new Error('没有返回数据')
      }

      const reader = data.getReader()
      const decoder = new TextDecoder()
      let newSummary = ''
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        newSummary += chunkValue
        setPolishedSummary(newSummary)
      }

      if (onSummaryUpdate) {
        onSummaryUpdate(newSummary)
      }

      toast({
        description: '改写完成 🔄',
      })
    } catch (error: any) {
      console.error('Rewrite error:', error)
      toast({
        variant: 'destructive',
        title: '改写失败',
        description: error.message || '请重试',
      })
    } finally {
      setIsRewriting(false)
    }
  }

  // 如果解析失败，回退到原始显示
  if (!structuredData || (!structuredData.topic && !structuredData.summary && structuredData.highlights.length === 0)) {
    return (
      <div className="mx-auto mt-6 max-w-3xl rounded-xl border-2 bg-white p-4 text-lg leading-7 shadow-md">
        <div className="markdown-body">
          <Markdown>{summary}</Markdown>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-6 max-w-4xl space-y-6">
      {/* 摘要 */}
      {structuredData.summary && (
        <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-md dark:border-green-800 dark:from-green-900/20 dark:to-slate-900">
          <h2 className="mb-3 flex items-center text-2xl font-bold text-green-600 dark:text-green-400">
            <span className="mr-2">📝</span>
            摘要
          </h2>
          <p className="whitespace-pre-line text-lg leading-7 text-slate-700 dark:text-slate-300">
            {structuredData.summary}
          </p>
        </div>
      )}

      {/* 亮点 */}
      {structuredData.highlights.length > 0 && (
        <div className="rounded-xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white p-6 shadow-md dark:border-yellow-800 dark:from-yellow-900/20 dark:to-slate-900">
          <h2 className="mb-4 flex items-center text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            <span className="mr-2">✨</span>
            亮点
          </h2>
          <div className="space-y-3">
            {structuredData.highlights.map((highlight: HighlightItem, index: number) => {
              // 提取时间戳：支持末尾格式 00:45 或括号格式 (00:45)
              let mainContent = highlight.content
              let timestampInContent = highlight.timestamp

              // 如果 highlight.timestamp 为空，尝试从内容中提取
              if (!timestampInContent) {
                // 尝试匹配末尾的时间戳格式：00:45
                const endTimestampMatch = highlight.content.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*$/)
                if (endTimestampMatch) {
                  timestampInContent = endTimestampMatch[1]
                  mainContent = highlight.content
                    .replace(new RegExp(endTimestampMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '')
                    .trim()
                } else {
                  // 尝试匹配括号格式：(00:45)
                  const bracketTimestampMatch = highlight.content.match(/\((\d{1,2}:\d{2}(?::\d{2})?)\)/)
                  if (bracketTimestampMatch) {
                    timestampInContent = bracketTimestampMatch[1]
                    mainContent = highlight.content.replace(bracketTimestampMatch[0], '').trim()
                  } else {
                    // 尝试匹配4位数字格式：0830 (MMSS)
                    const fourDigitsMatch = highlight.content.match(/(\d{4})\s*$/)
                    if (fourDigitsMatch) {
                      const digits = fourDigitsMatch[1]
                      timestampInContent = `${digits.substring(0, 2)}:${digits.substring(2)}`
                      mainContent = highlight.content
                        .replace(new RegExp(fourDigitsMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '')
                        .trim()
                    }
                  }
                }
              } else {
                // 如果已有时间戳，从内容中移除它（可能是括号格式或4位数字格式）
                mainContent = highlight.content
                  .replace(
                    new RegExp('\\(' + timestampInContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)', 'g'),
                    '',
                  )
                  .replace(new RegExp(timestampInContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$'), '')
                  .trim()

                // 如果时间戳是 MM:SS 格式，也尝试移除可能的4位数字格式（如果内容末尾有）
                if (timestampInContent.includes(':')) {
                  const parts = timestampInContent.split(':')
                  if (parts.length === 2) {
                    const fourDigits = `${parts[0].padStart(2, '0')}${parts[1].padStart(2, '0')}`
                    mainContent = mainContent
                      .replace(new RegExp(fourDigits.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$'), '')
                      .trim()
                  }
                }
              }

              // 确保时间戳格式正确（如果是4位数字，转换为 MM:SS）
              if (timestampInContent && /^\d{4}$/.test(timestampInContent)) {
                timestampInContent = `${timestampInContent.substring(0, 2)}:${timestampInContent.substring(2)}`
              }

              return (
                <div key={index} className="flex items-start rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800">
                  {highlight.emoji && <span className="mr-2 flex-shrink-0 text-2xl">{highlight.emoji}</span>}
                  <div className="flex-1">
                    <span className="text-slate-700 dark:text-slate-300">{mainContent}</span>
                    {timestampInContent && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const seconds = timestampToSeconds(timestampInContent!)
                          console.log('[亮点时间按钮] 点击:', {
                            timestampInContent,
                            seconds,
                            hasController: !!videoPlayerController,
                            controllerType: typeof videoPlayerController,
                            hasSeekTo: !!(videoPlayerController && typeof videoPlayerController.seekTo === 'function'),
                          })
                          if (videoPlayerController && typeof videoPlayerController.seekTo === 'function') {
                            try {
                              console.log('[亮点时间按钮] 调用 seekTo:', seconds)
                              videoPlayerController.seekTo(seconds)
                              console.log('[亮点时间按钮] seekTo 调用完成')
                            } catch (error) {
                              console.error('[亮点时间按钮] 跳转失败:', error)
                            }
                          } else {
                            console.warn('[亮点时间按钮] 视频播放器控制器未就绪', {
                              videoPlayerController,
                              hasSeekTo: !!(videoPlayerController && videoPlayerController.seekTo),
                              seekToType: videoPlayerController ? typeof videoPlayerController.seekTo : 'undefined',
                            })
                          }
                        }}
                        className="ml-2 inline-flex cursor-pointer items-center rounded bg-blue-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                        title={`跳转到 ${timestampInContent}`}
                      >
                        {timestampInContent}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 隐藏其他模块，只显示摘要和亮点（图一简洁模板） */}
      {/* 思考 */}
      {/* {structuredData.reflections.length > 0 && (
        <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-md dark:border-purple-800 dark:from-purple-900/20 dark:to-slate-900">
          <h2 className="mb-4 flex items-center text-2xl font-bold text-purple-600 dark:text-purple-400">
            <span className="mr-2">💭</span>
            思考
          </h2>
          <div className="space-y-6">
            {structuredData.reflections.map((reflection: ReflectionItem, index: number) => {
              // 从解答末尾提取时间戳
              const answerParts = reflection.answer.split(/(\d{1,2}:\d{2}(?::\d{2})?)\s*$/)
              const answerContent = answerParts[0] || reflection.answer
              const timestampInAnswer = answerParts[1] || reflection.timestamp
              
              return (
                <div key={index} className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                  <h3 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {reflection.question}
                  </h3>
                  <div className="text-slate-700 dark:text-slate-300 leading-7">
                    {answerContent}
                    {timestampInAnswer && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const seconds = timestampToSeconds(timestampInAnswer)
                          if (videoPlayerController && videoPlayerController.seekTo) {
                            videoPlayerController.seekTo(seconds)
                          } else {
                            console.warn('视频播放器控制器未就绪，无法跳转')
                          }
                        }}
                        className="ml-2 inline-flex items-center rounded bg-blue-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer"
                        title={`跳转到 ${timestampInAnswer}`}
                      >
                        {timestampInAnswer}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )} */}

      {/* 术语解释 */}
      {/* {structuredData.terms.length > 0 && (
        <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-md dark:border-indigo-800 dark:from-indigo-900/20 dark:to-slate-900">
          <h2 className="mb-4 flex items-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            <span className="mr-2">📚</span>
            术语解释
          </h2>
          <dl className="space-y-3">
            {structuredData.terms.map((term: TermExplanation, index: number) => (
              <div key={index} className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-800">
                <dt className="font-semibold text-indigo-600 dark:text-indigo-400">{term.term}</dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">{term.explanation}</dd>
              </div>
            ))}
          </dl>
        </div>
      )} */}

      {/* 时间线总结 */}
      {/* {structuredData.timeline.length > 0 && (
        <div className="rounded-xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white p-6 shadow-md dark:border-pink-800 dark:from-pink-900/20 dark:to-slate-900">
          <h2 className="mb-4 flex items-center text-2xl font-bold text-pink-600 dark:text-pink-400">
            <span className="mr-2">⏱️</span>
            时间线总结
          </h2>
          <div className="space-y-6">
            {structuredData.timeline.map((item: TimelineItem, index: number) => {
              // 分离标题和详细描述
              const contentLines = item.content.split('\n\n')
              const title = contentLines[0] || item.content
              const description = contentLines.slice(1).join('\n\n')
              
              return (
                <div key={index} className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const seconds = timestampToSeconds(item.timestamp)
                        if (videoPlayerController && videoPlayerController.seekTo) {
                          videoPlayerController.seekTo(seconds)
                        } else {
                          console.warn('视频播放器控制器未就绪，无法跳转')
                        }
                      }}
                      className="inline-flex items-center rounded bg-blue-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer"
                      title={`跳转到 ${item.timestamp}`}
                    >
                      {item.timestamp}
                    </button>
                    <span className="text-lg font-semibold text-pink-600 dark:text-pink-400">- {title}</span>
                  </div>
                  {item.screenshot && (
                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400 italic">
                      {item.screenshot}
                    </p>
                  )}
                  {description && (
                    <p className="text-slate-700 dark:text-slate-300 leading-7 whitespace-pre-line">
                      {description}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )} */}

      {/* 阅读全文按钮 */}
      {/* <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowFullContent(!showFullContent)}
          className="rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 px-4 py-2 font-medium text-white shadow-md hover:from-gray-600 hover:to-gray-700"
        >
          {showFullContent ? '收起全文' : '📖 阅读全文'}
        </button>
      </div> */}

      {/* AI 润色按钮 */}
      {/* <div className="flex flex-wrap gap-3">
        <button
          onClick={handlePolish}
          disabled={isPolishing || isRewriting}
          className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 font-medium text-white shadow-md hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPolishing ? '润色中...' : '✨ AI润色'}
        </button>
      </div> */}

      {/* AI 改写按钮 */}
      {/* <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRewrite}
          disabled={isPolishing || isRewriting}
          className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 font-medium text-white shadow-md hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRewriting ? '改写中...' : '🔄 AI改写'}
        </button>
      </div> */}

      {/* 视频主题 */}
      {/* {structuredData.topic && (
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-md dark:border-blue-800 dark:from-blue-900/20 dark:to-slate-900">
          <h2 className="mb-3 flex items-center text-2xl font-bold text-blue-600 dark:text-blue-400">
            <span className="mr-2">🎯</span>
            视频主题
          </h2>
          <p className="text-lg text-slate-700 dark:text-slate-300">{structuredData.topic}</p>
        </div>
      )} */}

      {/* 完整内容（可展开） */}
      {/* {showFullContent && (
        <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-slate-800">
          <h3 className="mb-3 text-xl font-bold text-slate-800 dark:text-slate-200">完整总结</h3>
          <div className="markdown-body text-slate-700 dark:text-slate-300">
            <Markdown>{currentSummary}</Markdown>
          </div>
        </div>
      )} */}

      {/* 分享按钮 */}
      <div className="flex justify-center pb-8">
        <ShareButton summary={currentSummary} videoUrl={currentVideoUrl} videoId={currentVideoId} />
      </div>
    </div>
  )
}
