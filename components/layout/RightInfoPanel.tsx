import React, { useState, useMemo } from 'react'
import { FileText, Network, MessageSquare, BookOpen, Copy, Download, ChevronDown, Book, Settings } from 'lucide-react'
import { SummaryDisplay } from '~/components/SummaryDisplay'
import {
  formatSummary,
  parseSummaryWithDetails,
  parseStructuredSummary,
  structuredSummaryToMindMapMarkdown,
} from '~/utils/formatSummary'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu'
import { useToast } from '~/hooks/use-toast'
import { exportToMarkdown, exportToPDF, exportToWord, exportToMindMapHTML } from '~/utils/exportFile'
import { MindMapDisplay } from '~/components/MindMapDisplay'
import { useSaveToFlomo } from '~/hooks/notes/flomo'
import useSaveToLark from '~/hooks/notes/lark'
import { useSaveToNotion } from '~/hooks/notes/notion'
import { useSaveToObsidian } from '~/hooks/notes/obsidian'
import { useSendEmail } from '~/hooks/notes/email'
import { useLocalStorage } from '~/hooks/useLocalStorage'
import { EmailDialog } from '~/components/EmailDialog'
import Link from 'next/link'
import { SummarySettingsButton } from '~/components/SummarySettingsButton'
import { UseFormReturn } from 'react-hook-form/dist/types/form'

interface RightInfoPanelProps {
  summary?: string
  isLoading?: boolean
  currentVideoUrl?: string
  currentVideoId?: string
  shouldShowTimestamp?: boolean
  videoPlayerController?: { seekTo: (seconds: number) => void } | null
  videoDuration?: number
  register?: any
  getValues?: UseFormReturn['getValues']
  setValue?: UseFormReturn['setValue']
  videoService?: string
}

export function RightInfoPanel({
  summary,
  isLoading,
  currentVideoUrl,
  currentVideoId,
  shouldShowTimestamp,
  videoPlayerController,
  videoDuration,
  register,
  getValues,
  setValue,
  videoService,
}: RightInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'mindmap' | 'thoughts'>('summary')
  const [showFullSummary, setShowFullSummary] = useState(false)
  const [showOriginalText, setShowOriginalText] = useState(false)
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  // 格式化摘要内容（需要在 hooks 之前定义）
  const formattedCachedSummary = summary?.startsWith('"')
    ? summary
        .substring(1, summary.length - 1)
        .split('\\n')
        .join('\n')
    : summary

  // 笔记集成相关配置和 hooks
  const [flomoWebhook] = useLocalStorage<string>('user-flomo-webhook')
  const [larkWebhook] = useLocalStorage<string>('user-lark-webhook')
  const [notionToken] = useLocalStorage<string>('user-notion-token')
  const [notionDatabaseId] = useLocalStorage<string>('user-notion-database-id')
  const [emailAddress] = useLocalStorage<string>('user-email-address')

  const { loading: flomoLoading, save: flomoSave } = useSaveToFlomo(
    formattedCachedSummary || summary || '',
    currentVideoUrl || '',
    flomoWebhook || '',
  )
  const { loading: larkLoading, save: larkSave } = useSaveToLark(
    formattedCachedSummary || summary || '',
    currentVideoUrl || '',
    larkWebhook || '',
  )
  const { loading: notionLoading, save: notionSave } = useSaveToNotion(
    formattedCachedSummary || summary || '',
    currentVideoUrl || '',
    notionToken || '',
    notionDatabaseId || '',
  )
  const { save: obsidianSave } = useSaveToObsidian(formattedCachedSummary || summary || '', currentVideoUrl || '')
  const { loading: emailLoading, send: emailSend } = useSendEmail(
    formattedCachedSummary || summary || '',
    currentVideoUrl || '',
  )

  const timeSegments =
    shouldShowTimestamp && formattedCachedSummary ? parseSummaryWithDetails(formattedCachedSummary) : []

  // 思考内容（可以基于总结生成或用户输入）
  const thoughts: string[] = []

  // 解析结构化数据并生成思维导图 markdown
  const mindMapMarkdown = useMemo(() => {
    if (!formattedCachedSummary) return ''
    try {
      const structuredData = parseStructuredSummary(formattedCachedSummary, videoDuration)
      return structuredSummaryToMindMapMarkdown(structuredData)
    } catch (error) {
      console.error('Failed to generate mind map markdown:', error)
      return ''
    }
  }, [formattedCachedSummary, videoDuration])

  const handleCopyFullSummary = () => {
    if (formattedCachedSummary) {
      navigator.clipboard.writeText(formattedCachedSummary)
      toast({ description: '复制成功 ✂️' })
    }
  }

  const handleExport = async (type: 'markdown' | 'pdf' | 'word' | 'mindmap') => {
    if (!formattedCachedSummary && !summary) {
      toast({ title: '无法导出', description: '暂无摘要内容', variant: 'destructive' })
      return
    }

    const filename = `summary-${currentVideoId || 'video'}`
    setIsExporting(true)

    try {
      if (type === 'markdown') {
        exportToMarkdown(formattedCachedSummary || summary || '', filename)
        toast({ title: '导出成功', description: 'Markdown 文件已下载' })
      } else if (type === 'pdf') {
        if (activeTab !== 'summary') {
          toast({ title: '提示', description: '正在切换到摘要页以便导出 PDF...', variant: 'default' })
          setActiveTab('summary')
          setTimeout(async () => {
            await exportToPDF('summary-display', filename)
            toast({ title: '导出成功', description: 'PDF 文件已下载' })
            setIsExporting(false)
          }, 1000)
          return
        }
        await exportToPDF('summary-display', filename)
        toast({ title: '导出成功', description: 'PDF 文件已下载' })
      } else if (type === 'word') {
        await exportToWord('summary-display', filename, formattedCachedSummary || summary || '')
        toast({ title: '导出成功', description: 'Word 文件已下载' })
      } else if (type === 'mindmap') {
        if (!mindMapMarkdown) {
          toast({ title: '无法导出', description: '暂无思维导图内容', variant: 'destructive' })
          return
        }
        exportToMindMapHTML(mindMapMarkdown, `mindmap-${currentVideoId || 'video'}`)
        toast({ title: '导出成功', description: '思维导图 HTML 文件已下载' })
      }
    } catch (error) {
      console.error(error)
      toast({ title: '导出失败', description: '请重试', variant: 'destructive' })
    } finally {
      if (type !== 'pdf' || activeTab === 'summary') {
        setIsExporting(false)
      }
    }
  }

  return (
    <div
      className="flex h-full flex-col border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      style={{ height: '100%' }}
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
          {register && getValues && setValue && (
            <SummarySettingsButton
              register={register}
              getValues={getValues}
              setValue={setValue}
              videoService={videoService}
            />
          )}
        </div>
        <div className="flex gap-3" style={{ gap: '12px' }}>
          <button
            onClick={handleCopyFullSummary}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Copy className="h-3.5 w-3.5" />
            复制
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? '导出中...' : '导出'}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>📄 导出 PDF (保留样式)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('word')}>📝 导出 Word (便于编辑)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('markdown')}>⬇️ 导出 Markdown</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('mindmap')}>🗺️ 导出思维导图 (HTML)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                <Book className="h-3.5 w-3.5" />
                笔记集成
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {flomoWebhook ? (
                <DropdownMenuItem onClick={flomoSave} disabled={flomoLoading} className="flex items-center gap-2">
                  {flomoLoading ? '⏳' : '📝'} {flomoLoading ? '同步中...' : '同步到 Flomo'}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/user/integration" className="flex items-center gap-2 text-slate-500">
                    <Settings className="h-3.5 w-3.5" />
                    配置 Flomo
                  </Link>
                </DropdownMenuItem>
              )}

              {larkWebhook ? (
                <DropdownMenuItem onClick={larkSave} disabled={larkLoading} className="flex items-center gap-2">
                  {larkLoading ? '⏳' : '💬'} {larkLoading ? '推送中...' : '推送到飞书'}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/user/integration" className="flex items-center gap-2 text-slate-500">
                    <Settings className="h-3.5 w-3.5" />
                    配置飞书
                  </Link>
                </DropdownMenuItem>
              )}

              {notionToken && notionDatabaseId ? (
                <DropdownMenuItem onClick={notionSave} disabled={notionLoading} className="flex items-center gap-2">
                  {notionLoading ? '⏳' : '📚'} {notionLoading ? '同步中...' : '同步到 Notion'}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/user/integration" className="flex items-center gap-2 text-slate-500">
                    <Settings className="h-3.5 w-3.5" />
                    配置 Notion
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={obsidianSave} className="flex items-center gap-2">
                🔗 保存到 Obsidian
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setShowEmailDialog(true)
                }}
                className="flex items-center gap-2"
              >
                📧 发送邮件
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/user/integration" className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  管理集成设置
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            onClick={() => setActiveTab('mindmap')}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'mindmap'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Network className="h-4 w-4" />
            思维导图
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
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900" style={{ minHeight: 0 }}>
        {activeTab === 'summary' && (
          <div style={{ padding: '16px', paddingBottom: '32px' }}>
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

        {activeTab === 'mindmap' && (
          <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {mindMapMarkdown ? (
              <div style={{ flex: 1, minHeight: '500px' }}>
                <MindMapDisplay markdown={mindMapMarkdown} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <div>
                  <Network className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>等待生成思维导图...</p>
                  {!summary && !isLoading && <p className="mt-2 text-sm">请先生成摘要</p>}
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

      {/* 邮件发送对话框 */}
      <EmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onSend={async (to, subject) => {
          await emailSend(to, subject)
          setShowEmailDialog(false)
        }}
        loading={emailLoading}
        defaultEmail={emailAddress || ''}
      />
    </div>
  )
}
