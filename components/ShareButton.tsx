import React, { useState } from 'react'
import { useToast } from '~/hooks/use-toast'

interface ShareButtonProps {
  summary: string
  videoUrl: string
  videoId: string
}

export function ShareButton({ summary, videoUrl, videoId }: ShareButtonProps) {
  const { toast } = useToast()
  const [showShareMenu, setShowShareMenu] = useState(false)

  // 生成分享内容
  const getShareContent = () => {
    const title = `【📝 总结：${videoId}】`
    const content = summary.length > 200 ? summary.substring(0, 200) + '...' : summary
    return `${title}\n\n${content}\n\n原视频：${videoUrl}`
  }

  // 生成分享链接（需要根据实际部署的域名调整）
  const getShareLink = () => {
    if (typeof window === 'undefined') return ''
    const currentUrl = window.location.href
    // 可以添加分享参数，比如 ?share=true&videoId=xxx
    return currentUrl
  }

  // 复制链接到剪贴板
  const handleCopyLink = async () => {
    try {
      const shareLink = getShareLink()
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareLink)
        toast({
          description: '链接已复制到剪贴板 📋',
        })
      } else {
        // 降级方案：使用临时输入框
        const textArea = document.createElement('textarea')
        textArea.value = shareLink
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast({
          description: '链接已复制到剪贴板 📋',
        })
      }
      setShowShareMenu(false)
    } catch (error) {
      console.error('复制失败:', error)
      toast({
        variant: 'destructive',
        title: '复制失败',
        description: '请手动复制链接',
      })
    }
  }

  // 微信分享（使用微信分享 API）
  const handleWeChatShare = () => {
    const shareLink = getShareLink()

    // 微信分享需要配置微信 JS-SDK
    // 这里提供一个基础实现，实际使用时需要配置微信 JS-SDK
    if (window.wx) {
      window.wx.updateTimelineShareData({
        title: `【📝 总结：${videoId}】`,
        link: shareLink,
        imgUrl: '', // 可以添加分享图片
        success: () => {
          toast({
            description: '已分享到微信朋友圈',
          })
        },
        cancel: () => {
          toast({
            description: '已取消分享',
          })
        },
      })
    } else {
      // 如果没有微信 JS-SDK，复制链接让用户手动分享
      handleCopyLink()
      toast({
        description: '链接已复制，请在微信中粘贴分享',
      })
    }
    setShowShareMenu(false)
  }

  // 微博分享
  const handleWeiboShare = () => {
    const shareContent = getShareContent()
    const shareLink = getShareLink()
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(
      shareLink,
    )}&title=${encodeURIComponent(shareContent)}`
    window.open(weiboUrl, '_blank', 'width=600,height=400')
    setShowShareMenu(false)
  }

  // 小红书分享（跳转到发布页面）
  const handleXiaohongshuShare = () => {
    const shareContent = getShareContent()
    const shareLink = getShareLink()

    // 小红书没有公开的Web分享API，但可以跳转到小红书创作者中心发布页面
    // 类似微博的方式，虽然可能不会自动填充内容，但至少可以跳转到发布页面
    const xiaohongshuUrl = `https://creator.xiaohongshu.com/publish`

    // 尝试打开小红书发布页面
    const opened = window.open(xiaohongshuUrl, '_blank', 'width=800,height=600')

    if (!opened || opened.closed || typeof opened.closed === 'undefined') {
      // 如果弹窗被阻止，降级为复制内容
      handleXiaohongshuShareFallback(shareContent)
    } else {
      // 同时复制内容到剪贴板，方便用户粘贴
      handleXiaohongshuShareFallback(shareContent)
      toast({
        description: '已跳转到小红书发布页面，内容已复制到剪贴板 📋',
      })
    }
    setShowShareMenu(false)
  }

  // 小红书分享降级方案（复制内容）
  const handleXiaohongshuShareFallback = async (shareContent: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareContent)
        toast({
          description: '内容已复制，可以粘贴到小红书 📋',
        })
      } else {
        // 降级方案
        const textArea = document.createElement('textarea')
        textArea.value = shareContent
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast({
          description: '内容已复制，可以粘贴到小红书 📋',
        })
      }
    } catch (error) {
      console.error('复制失败:', error)
      toast({
        variant: 'destructive',
        title: '复制失败',
        description: '请手动复制内容',
      })
    }
  }

  return (
    <div className="relative mb-4 mt-6 flex justify-center">
      <div className="relative">
        <button
          onClick={() => setShowShareMenu(!showShareMenu)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 px-4 py-2 font-medium text-white shadow-md transition-all hover:from-pink-600 hover:to-pink-700"
        >
          <span>🔗</span>
          <span>一键分享</span>
          <span className={`transition-transform ${showShareMenu ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showShareMenu && (
          <>
            {/* 遮罩层，点击关闭菜单 */}
            <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)} />

            {/* 分享菜单 */}
            <div className="absolute left-1/2 top-full z-20 mt-2 w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="p-2">
                <button
                  onClick={handleWeChatShare}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="text-lg">💬</span>
                  <span>分享到微信</span>
                </button>

                <button
                  onClick={handleWeiboShare}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="text-lg">📱</span>
                  <span>分享到微博</span>
                </button>

                <button
                  onClick={handleXiaohongshuShare}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="text-lg">📖</span>
                  <span>分享到小红书</span>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                <button
                  onClick={handleCopyLink}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="text-lg">🔗</span>
                  <span>复制链接</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 扩展 Window 接口以支持微信 JS-SDK
declare global {
  interface Window {
    wx?: {
      updateTimelineShareData: (config: {
        title: string
        link: string
        imgUrl: string
        success?: () => void
        cancel?: () => void
      }) => void
      updateAppMessageShareData: (config: {
        title: string
        desc: string
        link: string
        imgUrl: string
        success?: () => void
        cancel?: () => void
      }) => void
    }
  }
}
