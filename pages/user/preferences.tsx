import React from 'react'
import { UserPreferencesSettings } from '~/components/UserPreferencesSettings'
import { SummaryTemplateManager } from '~/components/SummaryTemplateManager'

export default function PreferencesPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-gray-200">个性化设置</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">自定义您的总结偏好和模板，让 AI 更好地为您服务</p>
      </div>

      <div className="space-y-12">
        <UserPreferencesSettings />
        <div className="border-t border-gray-200 pt-12 dark:border-gray-700">
          <SummaryTemplateManager />
        </div>
      </div>
    </div>
  )
}
