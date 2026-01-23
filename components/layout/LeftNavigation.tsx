import React, { useState, useMemo } from 'react'
import { Search, FileText, FolderOpen, MessageSquare, Plus, Play, Clock } from 'lucide-react'
import { VideoHistorySidebar } from '~/components/VideoHistorySidebar'
import { useVideoHistory, type VideoHistory } from '~/hooks/useVideoHistory'

interface LeftNavigationProps {
  onSelectHistory?: (history: VideoHistory) => void
  onNewSummary?: () => void
}

export function LeftNavigation({ onSelectHistory, onNewSummary }: LeftNavigationProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'search' | 'library' | 'output' | 'chat'>('summary')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { history } = useVideoHistory()

  // 格式化日期
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

  // 搜索历史记录
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return []
    }

    const query = searchQuery.trim().toLowerCase()
    return history.filter((item) => {
      // 搜索标题
      const titleMatch = item.title.toLowerCase().includes(query)
      // 搜索视频链接
      const urlMatch = item.videoUrl.toLowerCase().includes(query)
      // 搜索视频ID
      const videoIdMatch = item.videoId.toLowerCase().includes(query)
      // 搜索总结内容（可选，如果用户想要搜索总结内容）
      const summaryMatch = item.summary.toLowerCase().includes(query)

      return titleMatch || urlMatch || videoIdMatch || summaryMatch
    })
  }, [searchQuery, history])

  return (
    <div
      className="flex flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      style={{ height: '100%' }}
    >
      {/* 顶部功能入口 */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="space-y-2">
          <button
            onClick={() => {
              setActiveTab('summary')
              onNewSummary?.()
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeTab === 'summary'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">新总结</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeTab === 'search'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="h-5 w-5" />
            <span className="text-sm font-medium">全局搜索</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeTab === 'library'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <FolderOpen className="h-5 w-5" />
            <span className="text-sm font-medium">资源库</span>
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
              activeTab === 'output'
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">产出物</span>
          </button>
        </div>
      </div>

      {/* 中间内容区域 - 根据选中的标签显示不同内容 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'summary' && (
          <div className="h-full">
            <VideoHistorySidebar onSelectHistory={onSelectHistory} />
          </div>
        )}
        {activeTab === 'search' && (
          <div className="flex h-full flex-col">
            {/* 搜索框 */}
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索视频标题或链接..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* 搜索结果 */}
            <div className="flex-1 overflow-y-auto p-4">
              {searchQuery.trim() ? (
                searchResults.length > 0 ? (
                  <div className="space-y-2">
                    <div className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                      找到 {searchResults.length} 个结果
                    </div>
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelectHistory?.(item)
                          setActiveTab('summary')
                        }}
                        className="group cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white p-3 transition duration-200 hover:border-sky-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-500"
                      >
                        {/* 来源和时间 */}
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                            {item.videoService === 'bilibili' ? '🔴 B站' : '▶️ YouTube'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" />
                            {formatDate(item.timestamp)}
                          </span>
                        </div>

                        {/* 视频标题 */}
                        <p className="mb-2 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {item.title &&
                          !item.title.startsWith('http://') &&
                          !item.title.startsWith('https://') &&
                          item.title !== item.videoId &&
                          !item.title.match(/^BV[a-zA-Z0-9]+$/)
                            ? item.title
                            : item.videoId}
                        </p>

                        {/* 视频链接 */}
                        <p className="mb-2 truncate text-xs text-slate-500 dark:text-slate-400">{item.videoUrl}</p>

                        {/* 操作按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectHistory?.(item)
                            setActiveTab('summary')
                          }}
                          className="flex w-full items-center justify-center gap-1 rounded bg-sky-100 px-2 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
                        >
                          <Play className="h-3 w-3" />
                          查看总结
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Search className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">未找到相关结果</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">尝试搜索视频标题或链接</p>
                  </div>
                )
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Search className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">搜索历史记录</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">输入视频标题或链接进行搜索</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'library' && (
          <div className="p-4">
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">资源库功能开发中...</div>
          </div>
        )}
        {activeTab === 'output' && (
          <div className="p-4">
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">产出物功能开发中...</div>
          </div>
        )}
      </div>

      {/* 底部聊天窗口 */}
      <div className="border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
            isChatOpen
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-sm font-medium">聊天窗口</span>
        </button>
        {isChatOpen && (
          <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 max-h-48 overflow-y-auto text-sm text-slate-600 dark:text-slate-400">
              <div className="mb-2 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                <div className="font-medium text-slate-900 dark:text-slate-100">AI助手</div>
                <div className="mt-1 text-slate-700 dark:text-slate-300">你好！有什么可以帮助你的吗？</div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="输入消息..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800"
              />
              <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-600">发送</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
