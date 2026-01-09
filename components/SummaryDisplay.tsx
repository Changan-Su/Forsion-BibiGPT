import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Sentence from '~/components/Sentence'
import { formatSummary, parseSummaryWithDetails, TimeSegment, parseStructuredSummary } from '~/utils/formatSummary'
import { StructuredSummaryDisplay } from '~/components/StructuredSummaryDisplay'

export function SummaryDisplay({
  summary,
  isLoading,
  currentVideoUrl,
  currentVideoId,
  shouldShowTimestamp,
  userKey,
  videoConfig,
  onSummaryUpdate,
  videoPlayerController,
  videoDuration,
}: {
  summary: string
  isLoading: boolean
  currentVideoUrl?: string
  currentVideoId?: string
  shouldShowTimestamp?: boolean
  userKey?: string
  videoConfig?: any
  onSummaryUpdate?: (newSummary: string) => void
  videoPlayerController?: { seekTo: (seconds: number) => void } | null
  videoDuration?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if ((summary || isLoading) && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [summary, isLoading])

  if (!summary && !isLoading) {
    return null
  }

  const formattedCachedSummary = summary?.startsWith('"')
    ? summary
        .substring(1, summary.length - 1)
        .split('\\n')
        .join('\n')
    : summary

  // 尝试解析结构化总结
  let structuredData = null
  try {
    structuredData = parseStructuredSummary(formattedCachedSummary || '', videoDuration)
    // 检查是否成功解析（至少有一个模块有内容）
    if (
      !structuredData.topic &&
      !structuredData.summary &&
      structuredData.highlights.length === 0 &&
      structuredData.reflections.length === 0 &&
      structuredData.terms.length === 0 &&
      structuredData.timeline.length === 0
    ) {
      structuredData = null
    }
  } catch (error) {
    console.error('Failed to parse structured summary:', error)
    structuredData = null
  }

  const summaryArray =
    shouldShowTimestamp && formattedCachedSummary && !structuredData
      ? formatSummary(formattedCachedSummary).summaryArray
      : []

  const timeSegments =
    shouldShowTimestamp && formattedCachedSummary && !structuredData
      ? parseSummaryWithDetails(formattedCachedSummary)
      : []

  // 将时间戳字符串转换为秒数
  const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':')
    if (parts.length === 2) {
      // 格式: MM:SS
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    } else if (parts.length === 3) {
      // 格式: HH:MM:SS
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
    }
    return 0
  }

  // 如果成功解析为结构化总结，使用结构化显示组件
  if (structuredData && currentVideoUrl && currentVideoId) {
    return (
      <motion.div
        ref={containerRef}
        id="summary-display"
        className="mx-auto mt-8 w-full max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <StructuredSummaryDisplay
          summary={formattedCachedSummary || ''}
          currentVideoUrl={currentVideoUrl}
          currentVideoId={currentVideoId}
          userKey={userKey}
          videoConfig={videoConfig}
          onSummaryUpdate={onSummaryUpdate}
          videoPlayerController={videoPlayerController}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={containerRef}
      id="summary-display"
      className="mx-auto mt-8 w-full max-w-3xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="rounded-xl border-2 border-dashed border-sky-200 bg-gradient-to-b from-sky-50 to-white p-6 shadow-lg dark:border-sky-800 dark:from-sky-900/20 dark:to-slate-900">
        {/* 标题 */}
        <div className="mb-6 border-b-2 border-sky-100 pb-4 dark:border-sky-800">
          <h2 className="flex items-center text-2xl font-bold text-sky-600 dark:text-sky-400">
            <span className="mr-2">✨</span>
            AI 总结结果
            {isLoading && <span className="ml-2 inline-block animate-spin">⚙️</span>}
          </h2>
        </div>

        {/* 加载状态 */}
        {isLoading && !summary && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600 dark:border-sky-700 dark:border-t-sky-400"></div>
            <p className="text-center text-lg text-slate-600 dark:text-slate-400">AI 正在处理中，请耐心等待... 🤖</p>
          </div>
        )}

        {/* 内容显示 */}
        {summary && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="rounded-lg bg-white p-4 dark:bg-slate-800" style={{ padding: '16px' }}>
              {shouldShowTimestamp && currentVideoUrl && currentVideoId ? (
                // 显示时间戳版本 - 先显示总结，再显示详细描述
                <div className="space-y-6">
                  {/* 时间段总结部分 */}
                  {timeSegments.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-sky-600 dark:text-sky-400">📋 时间段总结</h3>
                      <ul className="space-y-2">
                        {timeSegments.map((segment: TimeSegment, index: number) => (
                          <div key={`summary-${index}`}>
                            {segment.timestamp && segment.summary && (
                              <li className="mb-2 list-disc" style={{ lineHeight: '1.5' }}>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const seconds = timestampToSeconds(segment.timestamp)
                                    if (videoPlayerController && videoPlayerController.seekTo) {
                                      videoPlayerController.seekTo(seconds)
                                    } else {
                                      console.warn('视频播放器控制器未就绪，无法跳转')
                                    }
                                  }}
                                  className="z-10 inline-flex items-center rounded bg-blue-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer"
                                  title={`跳转到 ${segment.timestamp}`}
                                >
                                  {segment.timestamp}
                                </button>
                                {` - ${segment.summary}`}
                              </li>
                            )}
                          </div>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 详细描述部分 */}
                  {timeSegments.some((segment) => segment.details) && (
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-sky-600 dark:text-sky-400">📝 详细描述</h3>
                      <ul className="space-y-3">
                        {timeSegments.map((segment: TimeSegment, index: number) => (
                          <div key={`details-${index}`}>
                            {segment.timestamp && segment.details && (
                              <li className="mb-3">
                                <div className="mb-1">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      const seconds = timestampToSeconds(segment.timestamp)
                                      if (videoPlayerController && videoPlayerController.seekTo) {
                                        videoPlayerController.seekTo(seconds)
                                      } else {
                                        console.warn('视频播放器控制器未就绪，无法跳转')
                                      }
                                    }}
                                    className="z-10 inline-flex items-center rounded bg-blue-500 px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer"
                                    title={`跳转到 ${segment.timestamp}`}
                                  >
                                    {segment.timestamp}
                                  </button>
                                </div>
                                <div className="ml-4 text-slate-700 dark:text-slate-300" style={{ lineHeight: '1.5' }}>
                                  {segment.details.split('\n').map((line, lineIndex) => (
                                    <div key={lineIndex} className="mb-1">
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              </li>
                            )}
                          </div>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 如果没有解析出详细描述，回退到原来的显示方式 */}
                  {timeSegments.length === 0 && summaryArray.length > 0 && (
                    <ul className="space-y-2">
                      {summaryArray.map((sentence: string, index: number) => (
                        <div key={index}>
                          {sentence.length > 0 && (
                            <Sentence videoId={currentVideoId} videoUrl={currentVideoUrl} sentence={sentence} />
                          )}
                        </div>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                // 显示普通版本 - 按行分割显示
                formattedCachedSummary.split('\n').map((line, index) => (
                  <div key={index} className="mb-2">
                    {line}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-center space-x-2 pt-4 text-slate-500 dark:text-slate-400">
                  <span className="inline-block animate-spin">⌛</span>
                  <span>继续生成中...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 底部提示 */}
        {summary && !isLoading && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            💡 总结完成！你可以复制内容或导出到笔记应用。
          </div>
        )}
      </div>
    </motion.div>
  )
}
