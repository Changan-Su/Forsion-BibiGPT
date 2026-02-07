import React, { useState } from 'react'
import { UseFormReturn } from 'react-hook-form/dist/types/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import { PROMPT_LANGUAGE_MAP } from '~/utils/constants/language'
import { useSmartRecommendation } from '~/hooks/useSmartRecommendation'
import { useSummaryTemplates } from '~/hooks/useSummaryTemplates'
import { useToast } from '~/hooks/use-toast'
import { VideoConfigSchema } from '~/utils/schemas/video'

interface SummarySettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  register: any
  getValues: UseFormReturn['getValues']
  setValue: UseFormReturn['setValue']
  videoService?: string
}

export function SummarySettingsDialog({
  open,
  onOpenChange,
  register,
  getValues,
  setValue,
  videoService,
}: SummarySettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<'default' | 'custom'>('default')
  const { recommendConfigByVideoType } = useSmartRecommendation()
  const { templates, getTemplate } = useSummaryTemplates()
  const { toast } = useToast()

  const [customPrompt, setCustomPrompt] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  const shouldShowTimestamp = getValues('showTimestamp')
  const recommendation = recommendConfigByVideoType(videoService)

  const handleApplyRecommendation = () => {
    if (!recommendation) return

    const { config } = recommendation
    if (config.detailLevel !== undefined) setValue('detailLevel', config.detailLevel)
    if (config.sentenceNumber !== undefined) setValue('sentenceNumber', config.sentenceNumber)
    if (config.outlineLevel !== undefined) setValue('outlineLevel', config.outlineLevel)
    if (config.outputLanguage !== undefined) setValue('outputLanguage', config.outputLanguage)
    if (config.showTimestamp !== undefined) setValue('showTimestamp', config.showTimestamp)
    if (config.showEmoji !== undefined) setValue('showEmoji', config.showEmoji)
    if (config.enableStream !== undefined) setValue('enableStream', config.enableStream)

    toast({
      title: '已应用推荐配置',
      description: recommendation.reason,
    })
  }

  const handleApplyTemplate = (templateId: string) => {
    const template = getTemplate(templateId)
    if (!template) return

    if (template.config) {
      if (template.config.detailLevel !== undefined) setValue('detailLevel', template.config.detailLevel)
      if (template.config.sentenceNumber !== undefined) setValue('sentenceNumber', template.config.sentenceNumber)
      if (template.config.outlineLevel !== undefined) setValue('outlineLevel', template.config.outlineLevel)
      if (template.config.outputLanguage !== undefined) setValue('outputLanguage', template.config.outputLanguage)
      if (template.config.showTimestamp !== undefined) setValue('showTimestamp', template.config.showTimestamp)
      if (template.config.showEmoji !== undefined) setValue('showEmoji', template.config.showEmoji)
    }

    if (template.promptTemplate) {
      setCustomPrompt(template.promptTemplate)
    }

    toast({
      title: '已应用模板',
      description: `已应用模板：${template.name}`,
    })
  }

  const handleClear = () => {
    setCustomPrompt('')
    setTemplateName('')
    setSelectedTemplateId('')
  }

  const handleConfirm = () => {
    // 如果选择了模板，应用模板配置
    if (selectedTemplateId) {
      handleApplyTemplate(selectedTemplateId)
    }
    onOpenChange(false)
    toast({
      title: '设置已保存',
      description: '总结设置已应用',
    })
  }

  const promptCategories = [
    { id: 'product', name: '产品营销' },
    { id: 'script', name: '短视频脚本' },
    { id: 'joke', name: '提取笑点' },
    { id: 'quote', name: '提取金句' },
    { id: 'custom', name: '自定义' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold dark:text-slate-50">总结设置</DialogTitle>
        </DialogHeader>

        {/* 标签页 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('default')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'default'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            默认配置
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            自定义总结
          </button>
        </div>

        {/* 默认配置标签页 */}
        {activeTab === 'default' && (
          <div className="space-y-4 py-4">
            {/* 模型选择 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">选择模型</label>
              <select
                id="summaryModel"
                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-sky-500 dark:focus:ring-sky-500"
                {...register('summaryModel')}
              >
                {(process.env.NEXT_PUBLIC_AVAILABLE_MODELS || 'gpt-4o-mini').split(',').map((model) => (
                  <option key={model.trim()} value={model.trim()}>
                    {model.trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* 智能推荐 */}
            {recommendation && (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">💡 智能推荐</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {recommendation.reason} (置信度: {Math.round(recommendation.confidence * 100)}%)
                  </p>
                </div>
                <button
                  onClick={handleApplyRecommendation}
                  className="ml-4 rounded-md bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                >
                  应用推荐
                </button>
              </div>
            )}

            {/* 配置选项 */}
            <div className="grid grid-cols-2 gap-4">
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" {...register('showTimestamp')} />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-sky-800"></div>
                <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">是否显示时间戳</span>
              </label>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" {...register('showEmoji')} />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-sky-800"></div>
                <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">是否显示Emoji</span>
              </label>
              <div>
                <label
                  htmlFor="outputLanguage"
                  className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  输出语言
                </label>
                <select
                  id="outputLanguage"
                  className="block w-full rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-sky-500 dark:focus:ring-sky-500"
                  {...register('outputLanguage')}
                >
                  {Object.keys(PROMPT_LANGUAGE_MAP).map((k: string) => (
                    <option key={PROMPT_LANGUAGE_MAP[k]} value={PROMPT_LANGUAGE_MAP[k]}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="sentenceNumber"
                  className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  要点个数
                  <span className="text-gray-500">(≤{getValues('sentenceNumber')})</span>
                </label>
                <input
                  id="sentenceNumber"
                  type="range"
                  min={3}
                  max={10}
                  step={1}
                  className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
                  {...register('sentenceNumber', {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div>
                <label htmlFor="outlineLevel" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                  大纲层级
                  <span className="text-gray-500">(≤{getValues('outlineLevel')})</span>
                </label>
                <input
                  id="outlineLevel"
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
                  disabled={shouldShowTimestamp}
                  {...register('outlineLevel', {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div>
                <label htmlFor="detailLevel" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                  详细程度
                  <span className="text-gray-500">(≤{getValues('detailLevel')})</span>
                </label>
                <input
                  id="detailLevel"
                  type="range"
                  min={300}
                  max={1000}
                  step={10}
                  className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
                  {...register('detailLevel', {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {/* 自定义总结标签页 */}
        {activeTab === 'custom' && (
          <div className="space-y-4 py-4">
            {/* 模型选择 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">选择模型</label>
              <select
                id="summaryModel"
                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-sky-500 dark:focus:ring-sky-500"
                {...register('summaryModel')}
              >
                {(process.env.NEXT_PUBLIC_AVAILABLE_MODELS || 'gpt-4o-mini').split(',').map((model) => (
                  <option key={model.trim()} value={model.trim()}>
                    {model.trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* 提示词内容 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">提示词内容</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={8}
                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                placeholder="请输入您的自定义总结提示词，例如：请将以下视频字幕总结成简要大纲，然后以列表形式提取关键信息，并为每个关键点选择合适的emoji。输出请使用以下模板：## 摘要 ## 亮点"
              />
            </div>

            {/* 取个名字 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">取个名字</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                placeholder="请输入一个提示词标题,保存起来吧!"
              />
            </div>

            {/* 提示词广场 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">提示词广场</label>
              <div className="flex flex-wrap gap-2">
                {promptCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      // 这里可以根据分类加载不同的提示词模板
                      if (category.id === 'custom') {
                        setCustomPrompt('')
                      }
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 模板选择 */}
            {templates.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">选择模板</label>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplateId(template.id)
                        if (template.promptTemplate) {
                          setCustomPrompt(template.promptTemplate)
                        }
                        if (template.name) {
                          setTemplateName(template.name)
                        }
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedTemplateId === template.id
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                          : 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">{template.name}</div>
                      {template.description && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{template.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <button
            onClick={handleClear}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            清除
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            确认总结
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
