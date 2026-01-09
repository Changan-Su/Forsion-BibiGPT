import React, { useState } from 'react'
import { FileText, Lightbulb, MessageSquare, BookOpen, Copy, Download } from 'lucide-react'
import { SummaryDisplay } from '~/components/SummaryDisplay'
import { formatSummary, parseSummaryWithDetails } from '~/utils/formatSummary'

interface RightInfoPanelProps {
  summary?: string
  isLoading?: boolean
  currentVideoUrl?: string
  currentVideoId?: string
  shouldShowTimestamp?: boolean
  videoPlayerController?: { seekTo: (seconds: number) => void } | null
  videoDuration?: number
}

export function RightInfoPanel({
  summary,
  isLoading,
  currentVideoUrl,
  currentVideoId,
  shouldShowTimestamp,
  videoPlayerController,
  videoDuration,
}: RightInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'highlights' | 'thoughts'>('summary')
  const [showFullSummary, setShowFullSummary] = useState(false)
  const [showOriginalText, setShowOriginalText] = useState(false)

  const formattedCachedSummary = summary?.startsWith('"')
    ? summary
        .substring(1, summary.length - 1)
        .split('\\n')
        .join('\n')
    : summary

  const timeSegments =
    shouldShowTimestamp && formattedCachedSummary ? parseSummaryWithDetails(formattedCachedSummary) : []

  // 提取亮点（可以从总结中提取，或者单独处理）
  const highlights = timeSegments.map((segment) => segment.summary).filter(Boolean)

  // 思考内容（可以基于总结生成或用户输入）
  const thoughts: string[] = []

  const handleCopyFullSummary = () => {
    if (formattedCachedSummary) {
      navigator.clipboard.writeText(formattedCachedSummary)
    }
  }

  const handleDownloadSummary = () => {
    if (formattedCachedSummary) {
      const blob = new Blob([formattedCachedSummary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `summary-${currentVideoId || 'video'}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div
      className="flex flex-col border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      style={{ height: '100%', minHeight: '1080px' }}
    >
      {/* 顶部功能按钮 */}
      <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex" style={{ gap: '12px' }}>
          <button
            onClick={() => setShowFullSummary(!showFullSummary)}
            className="flex items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-medium text-white hover:bg-sky-600"
            style={{ width: '100px', height: '32px' }}
          >
            <FileText className="h-4 w-4" />
            全文总结
          </button>
          <button
            onClick={() => setShowOriginalText(!showOriginalText)}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            style={{ width: '100px', height: '32px' }}
          >
            <BookOpen className="h-4 w-4" />
            原文细读
          </button>
        </div>
        <div className="flex gap-3" style={{ gap: '12px' }}>
          <button
            onClick={handleCopyFullSummary}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Copy className="h-3.5 w-3.5" />
            复制
          </button>
          <button
            onClick={handleDownloadSummary}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            下载
          </button>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'summary'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            摘要
          </button>
          <button
            onClick={() => setActiveTab('highlights')}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'highlights'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            亮点
          </button>
          <button
            onClick={() => setActiveTab('thoughts')}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'thoughts'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            思考
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        {activeTab === 'summary' && (
          <div style={{ padding: '16px' }}>
            {summary || isLoading ? (
              <div>
                <div style={{ lineHeight: '1.5' }}>
                  <SummaryDisplay
                    summary={summary || ''}
                    isLoading={isLoading || false}
                    currentVideoUrl={currentVideoUrl}
                    currentVideoId={currentVideoId}
                    shouldShowTimestamp={shouldShowTimestamp}
                    videoPlayerController={videoPlayerController}
                    videoDuration={videoDuration}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <div>
                  <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>等待生成摘要...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'highlights' && (
          <div style={{ padding: '16px' }}>
            {highlights.length > 0 ? (
              <div className="space-y-3">
                {highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20"
                    style={{ padding: '16px' }}
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-500" />
                      <p className="text-slate-700 dark:text-slate-300" style={{ lineHeight: '1.5' }}>
                        {highlight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <div>
                  <Lightbulb className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>暂无亮点内容</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'thoughts' && (
          <div style={{ padding: '16px' }}>
            {thoughts.length > 0 ? (
              <div className="space-y-3">
                {thoughts.map((thought, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20"
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-500" />
                      <p className="text-slate-700 dark:text-slate-300">{thought}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <div>
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="mb-4">记录你的思考...</p>
                  <textarea
                    placeholder="输入你的想法、疑问或笔记..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800"
                    rows={4}
                  />
                  <button className="mt-2 rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600">
                    保存思考
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 全文总结模态框 */}
      {showFullSummary && formattedCachedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-slate-800">
            <button
              onClick={() => setShowFullSummary(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ✕
            </button>
            <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">全文总结</h2>
            <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{formattedCachedSummary}</div>
          </div>
        </div>
      )}

      {/* 原文细读模态框 */}
      {showOriginalText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-slate-800">
            <button
              onClick={() => setShowOriginalText(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ✕
            </button>
            <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">原文细读</h2>
            <div className="text-slate-700 dark:text-slate-300">
              <p className="text-center text-slate-500 dark:text-slate-400">原文内容功能开发中...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
