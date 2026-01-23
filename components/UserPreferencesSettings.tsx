import React, { useState, useEffect } from 'react'
import { useUserPreferences } from '~/hooks/useUserPreferences'
import { PROMPT_LANGUAGE_MAP } from '~/utils/constants/language'
import { useToast } from '~/hooks/use-toast'

export function UserPreferencesSettings() {
  const { preferences, updatePreferences, resetPreferences } = useUserPreferences()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    // 保存逻辑已经在 updatePreferences 中处理
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: '保存成功',
        description: '您的偏好设置已保存',
      })
    }, 300)
  }

  const handleReset = () => {
    if (confirm('确定要重置所有偏好设置吗？')) {
      resetPreferences()
      toast({
        title: '已重置',
        description: '偏好设置已恢复为默认值',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold dark:text-gray-200">总结偏好设置</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存设置'}
          </button>
          <button
            onClick={handleReset}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            重置
          </button>
        </div>
      </div>

      <div className="grid gap-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">默认详细程度</label>
          <input
            type="range"
            min={300}
            max={1000}
            step={10}
            value={preferences.defaultDetailLevel || 600}
            onChange={(e) => updatePreferences({ defaultDetailLevel: parseInt(e.target.value) })}
            className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>简洁 (300)</span>
            <span className="font-medium">{preferences.defaultDetailLevel || 600}</span>
            <span>详细 (1000)</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">默认要点个数</label>
          <input
            type="range"
            min={3}
            max={10}
            step={1}
            value={preferences.defaultSentenceNumber || 5}
            onChange={(e) => updatePreferences({ defaultSentenceNumber: parseInt(e.target.value) })}
            className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>3</span>
            <span className="font-medium">{preferences.defaultSentenceNumber || 5}</span>
            <span>10</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">默认大纲层级</label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={preferences.defaultOutlineLevel || 1}
            onChange={(e) => updatePreferences({ defaultOutlineLevel: parseInt(e.target.value) })}
            className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>1</span>
            <span className="font-medium">{preferences.defaultOutlineLevel || 1}</span>
            <span>5</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">默认输出语言</label>
          <select
            value={preferences.defaultOutputLanguage || '中文'}
            onChange={(e) => updatePreferences({ defaultOutputLanguage: e.target.value })}
            className="block w-full rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-sky-500 dark:focus:ring-sky-500"
          >
            {Object.keys(PROMPT_LANGUAGE_MAP).map((k: string) => (
              <option key={PROMPT_LANGUAGE_MAP[k]} value={PROMPT_LANGUAGE_MAP[k]}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-900 dark:text-white">默认显示时间戳</label>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={preferences.defaultShowTimestamp || false}
              onChange={(e) => updatePreferences({ defaultShowTimestamp: e.target.checked })}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-sky-800"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-900 dark:text-white">默认显示 Emoji</label>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={preferences.defaultShowEmoji ?? true}
              onChange={(e) => updatePreferences({ defaultShowEmoji: e.target.checked })}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-sky-800"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-900 dark:text-white">默认启用流式输出</label>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={preferences.defaultEnableStream ?? true}
              onChange={(e) => updatePreferences({ defaultEnableStream: e.target.checked })}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-sky-800"></div>
          </label>
        </div>
      </div>

      {preferences.lastUpdated && (
        <p className="text-xs text-gray-500">最后更新: {new Date(preferences.lastUpdated).toLocaleString('zh-CN')}</p>
      )}
    </div>
  )
}
