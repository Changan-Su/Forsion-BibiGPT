import React, { useState } from 'react'
import { useSummaryTemplates, SummaryTemplate } from '~/hooks/useSummaryTemplates'
import { useToast } from '~/hooks/use-toast'
import { PROMPT_LANGUAGE_MAP } from '~/utils/constants/language'

export function SummaryTemplateManager() {
  const { templates, addTemplate, updateTemplate, deleteTemplate, getDefaultTemplate } = useSummaryTemplates()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Partial<SummaryTemplate> | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const handleEdit = (template: SummaryTemplate) => {
    if (template.isDefault) {
      toast({
        title: '提示',
        description: '默认模板不能编辑',
      })
      return
    }
    setIsEditing(template.id)
    setEditingTemplate({ ...template })
  }

  const handleSave = () => {
    if (!editingTemplate) return

    if (isEditing) {
      updateTemplate(isEditing, editingTemplate)
      toast({
        title: '保存成功',
        description: '模板已更新',
      })
    } else {
      addTemplate({
        name: editingTemplate.name || '未命名模板',
        description: editingTemplate.description,
        promptTemplate: editingTemplate.promptTemplate || '',
        config: editingTemplate.config,
      })
      toast({
        title: '创建成功',
        description: '新模板已创建',
      })
    }
    setIsEditing(null)
    setEditingTemplate(null)
    setShowAddForm(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个模板吗？')) {
      deleteTemplate(id)
      toast({
        title: '已删除',
        description: '模板已删除',
      })
    }
  }

  const handleAddNew = () => {
    setEditingTemplate({
      name: '',
      description: '',
      promptTemplate: '',
      config: {
        detailLevel: 600,
        sentenceNumber: 5,
        outlineLevel: 1,
        outputLanguage: '中文',
        showTimestamp: false,
        showEmoji: true,
      },
    })
    setShowAddForm(true)
    setIsEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold dark:text-gray-200">自定义总结模板</h2>
        <button onClick={handleAddNew} className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          + 新建模板
        </button>
      </div>

      {showAddForm && editingTemplate && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold">新建模板</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">模板名称</label>
              <input
                type="text"
                value={editingTemplate.name || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="输入模板名称"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">模板描述</label>
              <input
                type="text"
                value={editingTemplate.description || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="输入模板描述"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Prompt 模板</label>
              <textarea
                value={editingTemplate.promptTemplate || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, promptTemplate: e.target.value })}
                rows={6}
                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="输入自定义 Prompt 模板（可选，留空使用系统默认）"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">详细程度</label>
                <input
                  type="number"
                  min={300}
                  max={1000}
                  step={10}
                  value={editingTemplate.config?.detailLevel || 600}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      config: {
                        ...editingTemplate.config,
                        detailLevel: parseInt(e.target.value) || 600,
                      },
                    })
                  }
                  className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">输出语言</label>
                <select
                  value={editingTemplate.config?.outputLanguage || '中文'}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      config: {
                        ...editingTemplate.config,
                        outputLanguage: e.target.value,
                      },
                    })
                  }
                  className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {Object.keys(PROMPT_LANGUAGE_MAP).map((k: string) => (
                    <option key={PROMPT_LANGUAGE_MAP[k]} value={PROMPT_LANGUAGE_MAP[k]}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                保存
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingTemplate(null)
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  {template.isDefault && (
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      默认
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                )}
                {template.promptTemplate && (
                  <div className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                    <p className="font-medium">Prompt:</p>
                    <p className="mt-1 whitespace-pre-wrap">{template.promptTemplate}</p>
                  </div>
                )}
                {template.config && (
                  <div className="mt-2 text-xs text-gray-500">
                    配置: 详细程度 {template.config.detailLevel}, 语言 {template.config.outputLanguage}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {!template.isDefault && (
                  <>
                    <button
                      onClick={() => handleEdit(template)}
                      className="rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900"
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
