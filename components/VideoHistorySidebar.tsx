import React, { useState } from 'react'
import { Copy, Trash2, Play } from 'lucide-react'
import { useToast } from '~/hooks/use-toast'
import { useVideoHistory, type VideoHistory } from '~/hooks/useVideoHistory'

export function VideoHistorySidebar({ onSelectHistory }: { onSelectHistory?: (history: VideoHistory) => void }) {
  const { history, removeFromHistory, clearHistory } = useVideoHistory()
  const { toast } = useToast()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffTime / 60000)
    const diffHours = Math.floor(diffTime / 3600000)
    const diffDays = Math.floor(diffTime / 86400000)

    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`

    return date.toLocaleDateString('zh-CN')
  }

  const handleCopy = (summary: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(summary)
    toast({ description: '已复制总结内容 ✂️' })
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeFromHistory(id)
    toast({ description: '已删除历史记录' })
  }

  const handlePlay = (history: VideoHistory, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectHistory?.(history)
  }

  if (history.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white p-6 text-center dark:from-slate-800 dark:to-slate-900">
        <div className="mb-4 text-4xl">📚</div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">暂无历史记录</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">开始总结视频后会显示在这里</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="font-bold text-slate-900 dark:text-slate-50">历史记录</h3>
          <span className="inline-flex items-center justify-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(!showClearConfirm)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {showClearConfirm ? '✓' : '清空'}
          </button>
        )}
      </div>

      {/* 清空确认 */}
      {showClearConfirm && (
        <div className="border-b border-slate-200 bg-red-50 px-4 py-3 dark:border-slate-700 dark:bg-red-900/20">
          <p className="mb-3 text-xs font-medium text-red-700 dark:text-red-400">确定要清空所有记录吗？</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                clearHistory()
                setShowClearConfirm(false)
                toast({ description: '已清空历史记录' })
              }}
              className="flex-1 rounded bg-red-600 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 active:scale-95"
            >
              确认清空
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 rounded border border-red-200 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 历史列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent dark:scrollbar-thumb-slate-600">
        <div className="space-y-2 p-3">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectHistory?.(item)}
              className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3 transition duration-200 hover:border-sky-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-500"
              style={{ minHeight: '36px', fontSize: '14px' }}
            >
              {/* 时间标签 */}
              <div className="mb-2 flex items-center justify-between" style={{ height: '36px', fontSize: '14px' }}>
                <span className="font-semibold text-sky-600 dark:text-sky-400" style={{ fontSize: '14px' }}>
                  {item.videoService === 'bilibili' ? '🔴 B站' : '▶️ YouTube'}
                </span>
                <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: '14px' }}>
                  {formatDate(item.timestamp)}
                </span>
              </div>

              {/* 标题 */}
              <p
                className="line-clamp-2 font-semibold text-slate-900 dark:text-slate-50 mb-2"
                style={{ fontSize: '14px', lineHeight: '36px' }}
              >
                {item.title || item.videoId}
              </p>

              {/* 摘要预览 */}
              <div
                className="mb-3 line-clamp-3 text-slate-600 dark:text-slate-400"
                style={{ fontSize: '14px', lineHeight: '36px' }}
              >
                {item.summary.substring(0, 100)}
                {item.summary.length > 100 ? '...' : ''}
              </div>

              {/* 操作按钮 - 始终显示 */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => handlePlay(item, e)}
                  className="flex-1 flex items-center justify-center gap-1 rounded bg-sky-100 px-2 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
                  title="查看总结"
                >
                  <Play className="h-3 w-3" />
                  查看
                </button>
                <button
                  onClick={(e) => handleCopy(item.summary, e)}
                  className="flex items-center justify-center rounded bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  title="复制总结"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="flex items-center justify-center rounded bg-red-100 px-2 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                  title="删除记录"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
