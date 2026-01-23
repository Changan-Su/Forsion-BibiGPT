import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Play, Pause, Volume2, Maximize, Settings, User } from 'lucide-react'

export interface VideoPlayerController {
  seekTo: (seconds: number) => void
}

interface CenterContentProps {
  videoId?: string
  videoUrl?: string
  videoTitle?: string
  videoAuthor?: string
  isLoading?: boolean
  onPlayerReady?: (controller: VideoPlayerController | null) => void
}

export function CenterContent({
  videoId,
  videoUrl,
  videoTitle,
  videoAuthor,
  isLoading,
  onPlayerReady,
}: CenterContentProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(100)
  const [quality, setQuality] = useState('high')
  const isBilibili = videoUrl?.includes('bilibili.com')
  const isDouyin = videoUrl?.includes('douyin.com')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null)

  // 从URL中提取B站视频ID（BV号或av号）
  const bilibiliVideoInfo = useMemo(() => {
    if (!isBilibili) return null

    // 优先使用传入的videoId（通常已经通过extractUrl提取）
    if (videoId) {
      // BV号格式：BV1xx411c7mD
      if (videoId.startsWith('BV') && videoId.length >= 10) {
        return { type: 'bvid', id: videoId }
      }
      // av号格式：av12345678 或 12345678
      if (videoId.startsWith('av')) {
        return { type: 'aid', id: videoId.replace(/^av/i, '') }
      }
      // 纯数字可能是aid
      if (/^\d+$/.test(videoId)) {
        return { type: 'aid', id: videoId }
      }
    }

    // 如果videoId不可用，从URL中提取
    if (videoUrl) {
      // 格式1: https://www.bilibili.com/video/BV1xx411c7mD
      // 格式2: https://www.bilibili.com/video/av12345678
      // 格式3: https://www.bilibili.com/video/BV1xx411c7mD?p=1
      // 格式4: https://bilibili.com/video/BV1xx411c7mD
      const bvMatch = videoUrl.match(/\/video\/(BV[\w]+)/i)
      const avMatch = videoUrl.match(/\/video\/av(\d+)/i)

      if (bvMatch) {
        return { type: 'bvid', id: bvMatch[1] }
      } else if (avMatch) {
        return { type: 'aid', id: avMatch[1] }
      }
    }

    return null
  }, [videoUrl, videoId, isBilibili])

  // 构建B站播放器URL
  const bilibiliPlayerUrl = useMemo(() => {
    if (!bilibiliVideoInfo) return null

    const baseUrl = 'https://player.bilibili.com/player.html'
    if (bilibiliVideoInfo.type === 'bvid') {
      return `${baseUrl}?bvid=${bilibiliVideoInfo.id}&page=1&high_quality=1&autoplay=0`
    } else {
      return `${baseUrl}?aid=${bilibiliVideoInfo.id}&page=1&high_quality=1&autoplay=0`
    }
  }, [bilibiliVideoInfo])

  // YouTube视频ID提取
  const youtubeVideoId = useMemo(() => {
    if (!videoId || isBilibili || isDouyin) return null
    return videoId
  }, [videoId, isBilibili, isDouyin])

  // 实现视频跳转功能
  const seekTo = useCallback(
    (seconds: number) => {
      console.log('[seekTo] 调用跳转:', {
        seconds,
        isBilibili,
        hasBilibiliUrl: !!bilibiliPlayerUrl,
        hasBilibiliInfo: !!bilibiliVideoInfo,
        youtubeVideoId,
      })

      if (isBilibili && iframeRef.current && bilibiliVideoInfo) {
        // B站播放器：通过修改 iframe src 添加时间参数来实现跳转
        const iframe = iframeRef.current

        // 重新构建URL，确保包含时间参数
        const baseUrl = 'https://player.bilibili.com/player.html'
        let urlWithTime = ''

        if (bilibiliVideoInfo.type === 'bvid') {
          urlWithTime = `${baseUrl}?bvid=${bilibiliVideoInfo.id}&page=1&high_quality=1&autoplay=0&t=${seconds}`
        } else {
          urlWithTime = `${baseUrl}?aid=${bilibiliVideoInfo.id}&page=1&high_quality=1&autoplay=0&t=${seconds}`
        }

        console.log('[seekTo] B站跳转:', {
          urlWithTime,
          seconds,
          currentSrc: iframe.src,
          iframeReady: !!iframe.contentWindow,
        })

        // 方法1：先尝试通过 postMessage 发送跳转命令（如果播放器已加载）
        let postMessageSent = false
        try {
          if (iframe.contentWindow) {
            // 尝试多种 postMessage 格式
            const messages = [
              { command: 'seek', value: seconds },
              { action: 'seek', time: seconds },
              { type: 'seek', data: { time: seconds } },
            ]

            messages.forEach((msg) => {
              try {
                iframe.contentWindow?.postMessage(msg, 'https://player.bilibili.com')
                postMessageSent = true
              } catch (e) {
                // 忽略错误，继续尝试
              }
            })
          }
        } catch (e) {
          console.log('[seekTo] postMessage 失败:', e)
        }

        // 方法2：通过修改 iframe src 来跳转（主要方法）
        // 注意：这会重新加载播放器，但可以确保跳转到正确位置
        console.log('[seekTo] 使用 URL 跳转方式')
        const currentSrc = iframe.src
        try {
          const currentUrl = new URL(currentSrc)
          const currentTime = currentUrl.searchParams.get('t')

          // 只有当时间参数不同时才重新加载
          if (currentTime !== String(seconds)) {
            console.log('[seekTo] 时间从', currentTime, '跳转到', seconds)
            iframe.src = urlWithTime
          } else {
            console.log('[seekTo] 时间参数相同，强制重新加载')
            // 如果时间参数相同，先清空再设置，强制重新加载
            iframe.src = ''
            setTimeout(() => {
              iframe.src = urlWithTime
            }, 50)
          }
        } catch (e) {
          // 如果 URL 解析失败，直接设置
          console.log('[seekTo] URL 解析失败，直接设置:', e)
          iframe.src = urlWithTime
        }
      } else if (youtubeIframeRef.current && youtubeVideoId) {
        // YouTube 播放器通过 postMessage 控制
        const iframe = youtubeIframeRef.current
        if (iframe.contentWindow) {
          console.log('[seekTo] YouTube跳转:', { seconds, iframeReady: !!iframe.contentWindow })

          // YouTube IFrame API 命令
          // 注意：YouTube IFrame API 要求消息必须是字符串格式
          try {
            // 方法1：使用 JSON.stringify 包装消息（推荐）
            const message = JSON.stringify({
              event: 'command',
              func: 'seekTo',
              args: [seconds, true], // true 表示允许搜索（即使视频未加载）
            })

            console.log('[seekTo] 发送 YouTube postMessage:', message)
            iframe.contentWindow.postMessage(message, 'https://www.youtube.com')

            // 如果上面的方法不工作，尝试备用方法：直接修改 iframe src（类似 Bilibili）
            // 但 YouTube 不支持在 URL 中直接设置时间，所以主要依赖 postMessage
          } catch (e) {
            console.error('[seekTo] YouTube postMessage 失败:', e)
            // 备用方案：尝试重新加载 iframe 并添加 start 参数
            // 注意：YouTube embed URL 使用 start 参数而不是 t 参数
            const currentSrc = iframe.src
            const url = new URL(currentSrc)
            url.searchParams.set('start', String(Math.floor(seconds)))
            console.log('[seekTo] 尝试使用 URL 方式跳转:', url.toString())
            iframe.src = url.toString()
          }
        } else {
          console.warn('[seekTo] YouTube iframe contentWindow 不可用')
        }
      } else {
        console.warn('[seekTo] 无法跳转：播放器未就绪', {
          isBilibili,
          hasIframeRef: !!iframeRef.current,
          hasBilibiliUrl: !!bilibiliPlayerUrl,
          hasBilibiliInfo: !!bilibiliVideoInfo,
          hasYoutubeRef: !!youtubeIframeRef.current,
          youtubeVideoId,
        })
      }
    },
    [isBilibili, bilibiliVideoInfo, youtubeVideoId],
  )

  // 当播放器准备好时，通知父组件
  useEffect(() => {
    if (onPlayerReady && (bilibiliPlayerUrl || youtubeVideoId)) {
      console.log('[CenterContent] 播放器就绪，通知父组件', { bilibiliPlayerUrl, youtubeVideoId, isBilibili })
      onPlayerReady({
        seekTo,
      })
    } else if (onPlayerReady && !bilibiliPlayerUrl && !youtubeVideoId) {
      // 如果没有播放器，传递 null
      onPlayerReady(null)
    }
  }, [bilibiliPlayerUrl, youtubeVideoId, isBilibili, onPlayerReady, seekTo])

  return (
    <div className="flex flex-col overflow-y-auto bg-white dark:bg-slate-900" style={{ height: '100%' }}>
      {/* 视频播放区 */}
      <div className="relative bg-black">
        {bilibiliPlayerUrl && isBilibili ? (
          <div className="aspect-video w-full">
            <iframe
              ref={iframeRef}
              src={bilibiliPlayerUrl}
              className="h-full w-full"
              scrolling="no"
              frameBorder="no"
              allowFullScreen
              allow="autoplay; fullscreen"
              style={{ border: 'none' }}
              onLoad={() => {
                console.log('[CenterContent] B站 iframe 加载完成')
              }}
            />
          </div>
        ) : youtubeVideoId ? (
          <div className="aspect-video w-full">
            <iframe
              ref={youtubeIframeRef}
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&origin=${
                typeof window !== 'undefined' ? window.location.origin : 'http://localhost:2014'
              }`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => {
                console.log('[CenterContent] YouTube iframe 加载完成')
              }}
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-slate-900 text-slate-400">
            {isLoading ? (
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600"></div>
                <p>正在加载视频...</p>
              </div>
            ) : (
              <div className="text-center">
                <Play className="mx-auto mb-4 h-16 w-16" />
                <p>请输入视频链接开始观看</p>
              </div>
            )}
          </div>
        )}

        {/* 注意：B站和YouTube的iframe播放器自带控制栏，这里显示额外的控制信息 */}
        {(bilibiliPlayerUrl || youtubeVideoId) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity hover:opacity-100">
            <div className="flex items-center justify-between px-4 text-xs text-white/80">
              <span>{isBilibili ? 'B站视频' : 'YouTube视频'}</span>
              <span>清晰度: {quality === 'high' ? '高清' : quality}</span>
            </div>
          </div>
        )}
      </div>

      {/* 视频标题和作者信息栏 */}
      <div className="border-b border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {videoTitle && <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{videoTitle}</h1>}
        {videoAuthor && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <User className="h-5 w-5" />
            <span className="font-medium">{videoAuthor}</span>
          </div>
        )}
        {!videoTitle && !videoAuthor && (
          <div className="text-center text-slate-500 dark:text-slate-400">
            <p>等待视频加载...</p>
          </div>
        )}
      </div>

      {/* 内容区域占位（可以放置其他内容） */}
      <div className="flex-1 p-6">{/* 这里可以放置其他内容，比如评论、相关视频等 */}</div>
    </div>
  )
}
