import { useState } from 'react'
import { useAnalytics } from '~/components/context/analytics'
import { useToast } from '~/hooks/use-toast'

export function useSendEmail(note: string, video: string) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { analytics } = useAnalytics()

  const send = async (to: string, subject?: string) => {
    if (!to || !to.includes('@')) {
      toast({
        variant: 'destructive',
        title: '邮箱格式错误',
        description: '请输入有效的邮箱地址',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/notes/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject: subject || `BibiGPT 视频总结 - ${new Date().toLocaleDateString('zh-CN')}`,
          content: note,
          videoUrl: video,
        }),
      })

      const json = await response.json()

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: '发送失败',
          description: json.error || '无法发送邮件，请检查配置',
        })
      } else {
        toast({
          title: '发送成功',
          description: '邮件已成功发送！',
        })
        analytics.track('SendEmailButton Clicked')
      }
    } catch (error: any) {
      console.error('Email send error:', error)
      toast({
        variant: 'destructive',
        title: '发送失败',
        description: error.message || '网络错误，请稍后重试',
      })
    } finally {
      setLoading(false)
    }
  }

  return { send, loading }
}
