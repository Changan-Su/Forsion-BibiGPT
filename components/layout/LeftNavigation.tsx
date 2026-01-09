import React, { useState } from 'react'
import { Search, FileText, FolderOpen, MessageSquare, Plus } from 'lucide-react'
import { VideoHistorySidebar } from '~/components/VideoHistorySidebar'
import { useVideoHistory, type VideoHistory } from '~/hooks/useVideoHistory'

interface LeftNavigationProps {
  onSelectHistory?: (history: VideoHistory) => void
  onNewSummary?: () => void
}

export function LeftNavigation({ onSelectHistory, onNewSummary }: LeftNavigationProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'search' | 'library' | 'output' | 'chat'>('summary')
  const [isChatOpen, setIsChatOpen] = useState(false)

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
            <span className="font-medium text-sm">新总结</span>
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
            <span className="font-medium text-sm">全局搜索</span>
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
            <span className="font-medium text-sm">资源库</span>
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
            <span className="font-medium text-sm">产出物</span>
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
          <div className="p-4">
            <div className="mb-4">
              <input
                type="text"
                placeholder="搜索视频、总结、笔记..."
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">搜索功能开发中...</div>
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
          <span className="font-medium text-sm">聊天窗口</span>
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
