import { useState } from 'react'
import { useAnalytics } from '~/components/context/analytics'
import { useToast } from '~/hooks/use-toast'

export function useSaveToNotion(note: string, video: string, token: string, databaseId: string) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { analytics } = useAnalytics()

  const save = async () => {
    if (!token || !databaseId) {
      toast({
        variant: 'destructive',
        title: '配置错误',
        description: '请先配置 Notion Token 和 Database ID',
      })
      return
    }

    setLoading(true)
    try {
      // 从视频 URL 提取标题，如果没有则使用默认标题
      const title = `视频总结 - ${new Date().toLocaleDateString('zh-CN')}`
      const content = `${note}\n\n原视频：${video}\n#BibiGPT`

      const response = await fetch('/api/notes/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          databaseId,
          title,
          content,
          videoUrl: video,
        }),
      })

      const json = await response.json()

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: '同步失败',
          description: json.error || '无法同步到 Notion，请检查配置',
        })
      } else {
        toast({
          title: '同步成功',
          description: '已成功同步到 Notion！',
        })
        analytics.track('SaveNotionButton Clicked')
      }
    } catch (error: any) {
      console.error('Notion save error:', error)
      toast({
        variant: 'destructive',
        title: '同步失败',
        description: error.message || '网络错误，请稍后重试',
      })
    } finally {
      setLoading(false)
    }
  }

  return { save, loading }
}
