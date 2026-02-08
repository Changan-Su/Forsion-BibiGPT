import { useLocalStorage } from '~/hooks/useLocalStorage'

export interface SummaryTemplate {
  id: string
  name: string
  description?: string
  promptTemplate: string
  config?: {
    detailLevel?: number
    sentenceNumber?: number
    outlineLevel?: number
    outputLanguage?: string
    showTimestamp?: boolean
    showEmoji?: boolean
  }
  createdAt: number
  updatedAt: number
  isDefault?: boolean
}

const defaultTemplates: SummaryTemplate[] = [
  {
    id: 'default',
    name: '默认模板',
    description: '系统默认的总结模板',
    promptTemplate: '',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'detailed',
    name: '详细总结',
    description: '生成详细的视频总结，包含更多细节和章节大纲',
    promptTemplate:
      '请生成一份详细的视频总结，包含以下内容：\n1. 完整的摘要（3-5句话）\n2. 详细的亮点（8-10个）\n3. 章节大纲（将视频分为6-8个章节，每个章节包含时间戳、标题和3-4句详细描述）\n4. 深入的思考（5-7个问题）\n5. 术语解释（5-7个）',
    config: {
      detailLevel: 800,
      sentenceNumber: 8,
      outlineLevel: 2,
      outputLanguage: '中文',
      showTimestamp: true,
      showEmoji: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'brief',
    name: '简洁总结',
    description: '生成简洁的视频总结，快速了解要点',
    promptTemplate:
      '请生成一份简洁的视频总结，包含以下内容：\n1. 简要摘要（2-3句话）\n2. 核心亮点（3-5个）\n3. 关键思考（2-3个问题）',
    config: {
      detailLevel: 400,
      sentenceNumber: 3,
      outlineLevel: 1,
      outputLanguage: '中文',
      showTimestamp: false,
      showEmoji: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'chapter-outline',
    name: '章节大纲',
    description: '按章节逐段分析视频内容，包含详细的时间戳和描述',
    promptTemplate:
      '请重点生成详细的章节大纲，将视频分为6-8个逻辑章节。每个章节必须包含：\n1. 精确的开始时间戳（MM:SS格式）\n2. 简洁明了的章节标题\n3. 3-4句详细描述，说明该章节讨论的关键内容、举的例子或展示的演示\n\n同时生成简要摘要和5-8个亮点。章节大纲应覆盖视频的完整时间线，从开头到结尾。',
    config: {
      detailLevel: 900,
      sentenceNumber: 7,
      outlineLevel: 3,
      outputLanguage: '中文',
      showTimestamp: true,
      showEmoji: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

export function useSummaryTemplates() {
  const [templates, setTemplates] = useLocalStorage<SummaryTemplate[]>('summary-templates', defaultTemplates)

  // 添加模板
  const addTemplate = (template: Omit<SummaryTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: SummaryTemplate = {
      ...template,
      id: Math.random().toString(36).substring(7),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setTemplates((prev) => [...(prev || []), newTemplate])
    return newTemplate
  }

  // 更新模板
  const updateTemplate = (id: string, updates: Partial<SummaryTemplate>) => {
    setTemplates((prev) =>
      (prev || []).map((template) =>
        template.id === id ? { ...template, ...updates, updatedAt: Date.now() } : template,
      ),
    )
  }

  // 删除模板
  const deleteTemplate = (id: string) => {
    setTemplates((prev) => (prev || []).filter((template) => template.id !== id && template.isDefault !== true))
  }

  // 获取模板
  const getTemplate = (id: string) => {
    return (templates || []).find((template) => template.id === id)
  }

  // 获取默认模板
  const getDefaultTemplate = () => {
    return (templates || []).find((template) => template.isDefault) || defaultTemplates[0]
  }

  return {
    templates: templates || defaultTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getDefaultTemplate,
  }
}
