import { useAnalytics } from '~/components/context/analytics'
import { useToast } from '~/hooks/use-toast'
import { exportToMarkdown } from '~/utils/exportFile'

export function useSaveToObsidian(note: string, video: string) {
  const { toast } = useToast()
  const { analytics } = useAnalytics()

  const save = () => {
    try {
      // 生成文件名（使用日期和视频ID）
      const date = new Date().toISOString().split('T')[0]
      const videoId = video.match(/[^/]+$/)?.[0] || 'video'
      const filename = `BibiGPT-${date}-${videoId}`

      // 格式化内容为 Markdown
      const markdownContent = `# 视频总结

${note}

---

**原视频链接：** [${video}](${video})

**生成时间：** ${new Date().toLocaleString('zh-CN')}

**标签：** #BibiGPT #视频总结
`

      // 导出为 Markdown 文件
      exportToMarkdown(markdownContent, filename)

      toast({
        title: '下载成功',
        description: 'Markdown 文件已下载，请将其保存到 Obsidian 知识库',
      })

      analytics.track('SaveObsidianButton Clicked')
    } catch (error: any) {
      console.error('Obsidian save error:', error)
      toast({
        variant: 'destructive',
        title: '下载失败',
        description: error.message || '无法下载文件，请稍后重试',
      })
    }
  }

  return { save }
}
