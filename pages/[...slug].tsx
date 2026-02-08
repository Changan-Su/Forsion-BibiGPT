import { zodResolver } from '@hookform/resolvers/zod'
import getVideoId from 'get-video-id'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import React, { useEffect, useState, useRef } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import useFormPersist from 'react-hook-form-persist'
import { useAnalytics } from '~/components/context/analytics'
import { SubmitButton } from '~/components/SubmitButton'
import { SummaryDisplay } from '~/components/SummaryDisplay'
import { SummaryResult } from '~/components/SummaryResult'
import { TypingSlogan } from '~/components/TypingSlogan'
import { UsageAction } from '~/components/UsageAction'
import { UsageDescription } from '~/components/UsageDescription'
import { UserKeyInput } from '~/components/UserKeyInput'
import { VideoHistorySidebar } from '~/components/VideoHistorySidebar'
import { LeftNavigation } from '~/components/layout/LeftNavigation'
import { CenterContent } from '~/components/layout/CenterContent'
import { RightInfoPanel } from '~/components/layout/RightInfoPanel'
import { useToast } from '~/hooks/use-toast'
import { useLocalStorage } from '~/hooks/useLocalStorage'
import { useSummarize } from '~/hooks/useSummarize'
import { useVideoHistory, type VideoHistory } from '~/hooks/useVideoHistory'
import { useUserPreferences } from '~/hooks/useUserPreferences'
import { useSmartRecommendation } from '~/hooks/useSmartRecommendation'
import { VideoService } from '~/lib/types'
import { ProcessingStatusWindow } from '~/components/ProcessingStatusWindow'
import { DEFAULT_LANGUAGE } from '~/utils/constants/language'
import { extractPage, extractUrl, extractDouyinVideoId } from '~/utils/extractUrl'
import { getVideoIdFromUrl } from '~/utils/getVideoIdFromUrl'
import { VideoConfigSchema, videoConfigSchema } from '~/utils/schemas/video'
import { parseStructuredSummary } from '~/utils/formatSummary'

export const Home: NextPage<{
  showSingIn: (show: boolean) => void
}> = ({ showSingIn }) => {
  const router = useRouter()
  const urlState = router.query.slug
  const licenseKey = typeof router.query.license_key === 'string' ? router.query.license_key : null

  const {
    register,
    handleSubmit,
    control,
    trigger,
    getValues,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VideoConfigSchema>({
    defaultValues: {
      enableStream: true,
      showTimestamp: false,
      showEmoji: true,
      detailLevel: 600,
      sentenceNumber: 5,
      outlineLevel: 1,
      outputLanguage: DEFAULT_LANGUAGE,
      summaryModel: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'gpt-4o-mini',
    },
    resolver: zodResolver(videoConfigSchema),
  })

  const [currentVideoId, setCurrentVideoId] = useState<string>('')
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('')
  const [videoTitle, setVideoTitle] = useState<string>('')
  const [videoAuthor, setVideoAuthor] = useState<string>('')
  const [userKey, setUserKey] = useLocalStorage<string>('user-openai-apikey')
  const [showSidebar, setShowSidebar] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [useNewLayout, setUseNewLayout] = useState(true) // 控制是否使用新布局
  const [videoPlayerController, setVideoPlayerController] = useState<{ seekTo: (seconds: number) => void } | null>(null)
  const isLoadingFromHistoryRef = useRef(false) // 使用 ref 来标记是否正在从历史记录加载，避免异步更新问题
  const {
    loading,
    summary,
    resetSummary,
    summarize,
    resummarize,
    setSummary,
    videoDuration,
    videoTitle: apiVideoTitle,
    setVideoTitle: setApiVideoTitle,
    subtitlesArray,
    setSubtitlesArray,
    subtitleSource,
    processingStatus,
  } = useSummarize(showSingIn, getValues('enableStream'))
  const [showStatusWindow, setShowStatusWindow] = useState(true)
  const { toast } = useToast()
  const { analytics } = useAnalytics()
  const { addToHistory } = useVideoHistory()
  const { recordConfigUsage } = useUserPreferences()
  const { recommendConfigByVideoType } = useSmartRecommendation()

  useFormPersist('video-summary-config-storage', {
    watch,
    setValue,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  })
  const shouldShowTimestamp = getValues('showTimestamp')

  useEffect(() => {
    licenseKey && setUserKey(licenseKey)
  }, [licenseKey])

  useEffect(() => {
    // 如果正在从历史记录加载，不自动生成总结
    if (isLoadingFromHistoryRef.current) {
      return
    }
    // 将 router.query 转换为 URLSearchParams 格式
    const queryString = new URLSearchParams()
    Object.entries(router.query).forEach(([key, value]) => {
      if (value) {
        queryString.set(key, Array.isArray(value) ? value[0] : value)
      }
    })
    const validatedUrl = getVideoIdFromUrl(router.isReady, currentVideoUrl, urlState, queryString)
    console.log('getVideoIdFromUrl', validatedUrl)
    validatedUrl && generateSummary(validatedUrl)
  }, [router.isReady, urlState, router.query, currentVideoUrl])

  const validateUrlFromAddressBar = (url?: string) => {
    const videoUrl = url || currentVideoUrl
    // 支持多种YouTube URL格式: youtube.com, youtu.be
    const isBilibili = videoUrl.includes('bilibili.com/video')
    const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
    const isDouyin = videoUrl.includes('douyin.com/video') || videoUrl.includes('v.douyin.com')
    if (!isBilibili && !isYoutube && !isDouyin) {
      toast({
        title: '暂不支持此视频链接',
        description: '请输入哔哩哔哩、YouTube或抖音视频链接，已支持b23.tv短链接',
      })
      return
    }

    if (!url) {
      const curUrl = String(videoUrl.split('.com')[1])
      router.replace(curUrl)
    } else {
      setCurrentVideoUrl(videoUrl)
    }
  }

  const generateSummary = async (url?: string) => {
    const formValues = getValues()
    console.log('=======formValues=========', formValues)

    resetSummary()
    validateUrlFromAddressBar(url)

    const videoUrl = url || currentVideoUrl

    // 先检查是否是抖音视频（避免被误识别为YouTube）
    const douyinVideoId = extractDouyinVideoId(videoUrl)
    if (douyinVideoId) {
      setCurrentVideoId(douyinVideoId)
      setVideoTitle(videoUrl) // 临时使用URL，后续可以从API获取
      // 如果是短链接，传递完整URL；否则传递视频ID
      const videoIdForApi = videoUrl.includes('v.douyin.com') ? videoUrl : douyinVideoId
      await summarize(
        { videoId: videoIdForApi, service: VideoService.Douyin, ...formValues },
        { userKey, shouldShowTimestamp: shouldShowTimestamp },
      )
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      }, 10)
      return
    }

    // 然后检查是否是YouTube视频
    const { id, service } = getVideoId(videoUrl)
    if (service === VideoService.Youtube && id) {
      setCurrentVideoId(id)
      // 尝试获取视频标题（可以从历史记录或API获取）
      setVideoTitle(videoUrl) // 临时使用URL，后续可以从API获取
      await summarize(
        { videoId: id, service: VideoService.Youtube, ...formValues },
        { userKey, shouldShowTimestamp: shouldShowTimestamp },
      )
      return
    }

    const videoId = extractUrl(videoUrl)
    if (!videoId) {
      return
    }

    // 将 router.query 转换为 URLSearchParams
    const queryString = new URLSearchParams()
    Object.entries(router.query).forEach(([key, value]) => {
      if (value) {
        queryString.set(key, Array.isArray(value) ? value[0] : value)
      }
    })
    const pageNumber = extractPage(currentVideoUrl, queryString)
    setCurrentVideoId(videoId)
    setVideoTitle(videoUrl) // 临时使用URL，后续可以从API获取
    await summarize(
      { service: VideoService.Bilibili, videoId, pageNumber, ...formValues },
      { userKey, shouldShowTimestamp },
    )
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 10)
  }

  const onFormSubmit: SubmitHandler<VideoConfigSchema> = async (data) => {
    // 记录配置使用
    recordConfigUsage(data)
    await generateSummary(currentVideoUrl)
    analytics.track('GenerateButton Clicked')
  }

  useEffect(() => {
    // 如果正在从历史记录加载，不添加到历史记录（避免重复添加）
    if (isLoadingFromHistoryRef.current) {
      return
    }
    if (summary && !loading && currentVideoId) {
      // 优先从总结内容中提取视频主题
      let displayTitle = currentVideoId // 默认使用视频ID

      try {
        // 清理总结文本，移除可能的引号和转义字符
        let cleanSummary = summary
        if (cleanSummary.startsWith('"') && cleanSummary.endsWith('"')) {
          cleanSummary = cleanSummary.substring(1, cleanSummary.length - 1)
        }
        cleanSummary = cleanSummary.replace(/\\n/g, '\n')

        // 尝试解析结构化总结，提取视频主题
        const structuredData = parseStructuredSummary(cleanSummary)
        if (structuredData.topic && structuredData.topic.trim()) {
          displayTitle = structuredData.topic.trim()
        } else {
          // 如果解析失败，尝试直接匹配视频主题部分
          const topicMatch = cleanSummary.match(/##\s*视频主题\s*\n+([\s\S]*?)(?=\n+##|$)/i)
          if (topicMatch && topicMatch[1].trim()) {
            displayTitle = topicMatch[1].trim().replace(/^-\s*/, '')
          } else {
            // 如果都没有，使用API返回的标题或手动设置的标题
            const finalTitle = apiVideoTitle || videoTitle
            if (
              finalTitle &&
              !finalTitle.startsWith('http://') &&
              !finalTitle.startsWith('https://') &&
              finalTitle !== currentVideoId &&
              !finalTitle.match(/^BV[a-zA-Z0-9]+$/)
            ) {
              displayTitle = finalTitle
            }
          }
        }
      } catch (error) {
        console.error('[保存历史记录] 提取视频主题失败:', error)
        // 解析失败时，使用API返回的标题或手动设置的标题
        const finalTitle = apiVideoTitle || videoTitle
        if (
          finalTitle &&
          !finalTitle.startsWith('http://') &&
          !finalTitle.startsWith('https://') &&
          finalTitle !== currentVideoId &&
          !finalTitle.match(/^BV[a-zA-Z0-9]+$/)
        ) {
          displayTitle = finalTitle
        }
      }

      addToHistory({
        videoId: currentVideoId,
        videoUrl: currentVideoUrl,
        title: displayTitle,
        summary: summary,
        videoService: currentVideoUrl.includes('bilibili')
          ? 'bilibili'
          : currentVideoUrl.includes('douyin')
          ? 'douyin'
          : 'youtube',
        subtitlesArray: subtitlesArray,
      })
    }
  }, [summary, loading, currentVideoId, currentVideoUrl, videoTitle, apiVideoTitle, subtitlesArray])

  const handleSelectHistory = (history: VideoHistory) => {
    // 设置标记，阻止自动生成总结和添加到历史记录
    isLoadingFromHistoryRef.current = true

    // 先重置 loading 状态，确保不会显示加载中
    // 然后设置总结内容，确保显示正确的总结
    setSummary(history.summary)
    setCurrentVideoId(history.videoId)
    setCurrentVideoUrl(history.videoUrl)
    setVideoTitle(history.title || '')
    setApiVideoTitle(history.title || '')

    // 恢复字幕数据，使问答功能可用
    if (history.subtitlesArray && history.subtitlesArray.length > 0) {
      setSubtitlesArray(history.subtitlesArray)
    } else {
      setSubtitlesArray(null)
    }

    // 重置标记，允许后续的自动生成
    setTimeout(() => {
      isLoadingFromHistoryRef.current = false
      const summaryElement = document.getElementById('summary-display')
      if (summaryElement) {
        summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 500) // 增加延迟，确保所有状态更新完成
  }

  const handleNewSummary = () => {
    setCurrentVideoId('')
    setCurrentVideoUrl('')
    setVideoTitle('')
    setVideoAuthor('')
    resetSummary()
  }

  // 使用缓存字幕和新设置重新生成总结
  const handleResummarize = (customPrompt?: string) => {
    if (!subtitlesArray || subtitlesArray.length === 0) {
      toast({
        variant: 'destructive',
        title: '无法重新生成',
        description: '当前视频没有缓存的字幕数据，请重新总结该视频。',
      })
      return
    }

    const formValues = getValues()
    const videoConfig = {
      videoId: currentVideoId,
      service: currentVideoUrl.includes('bilibili')
        ? VideoService.Bilibili
        : currentVideoUrl.includes('douyin')
        ? VideoService.Douyin
        : VideoService.Youtube,
      ...formValues,
    }

    setShowStatusWindow(true)

    resummarize(
      videoConfig,
      { userKey, shouldShowTimestamp: formValues.showTimestamp },
      subtitlesArray,
      apiVideoTitle || videoTitle,
      videoDuration,
      customPrompt,
    )
  }

  const handleApiKeyChange = (e: any) => {
    setUserKey(e.target.value)
  }

  const handleInputChange = async (e: any) => {
    const value = e.target.value
    const regex = /((?:https?:\/\/|www\.)\S+)/g
    const matches = value.match(regex)
    if (matches && matches[0].includes('b23.tv')) {
      toast({ title: '正在自动转换此视频链接...' })
      const response = await fetch(`/api/b23tv?url=${matches[0]}`)
      const json = await response.json()
      setCurrentVideoUrl(json.url)
    } else {
      setCurrentVideoUrl(value)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // 如果使用新布局
  if (useNewLayout && mounted) {
    return (
      <>
        {/* 实时状态窗口 */}
        <ProcessingStatusWindow
          status={processingStatus}
          visible={showStatusWindow && (loading || processingStatus.stage !== 'idle')}
          onClose={() => setShowStatusWindow(false)}
        />
        <div
          className="flex overflow-hidden bg-white dark:bg-slate-900"
          style={{
            width: '100vw',
            height: 'calc(100vh - 64px)', // 减去 Header 高度（约64px）
            minHeight: 'calc(100vh - 64px)',
            maxHeight: 'calc(100vh - 64px)',
            position: 'relative',
          }}
        >
          {/* 左侧导航栏 - 20%宽度 */}
          <div
            className="flex-shrink-0 overflow-y-auto"
            style={{
              width: '20%',
              minWidth: '20%',
              maxWidth: '20%',
              height: '100%',
            }}
          >
            <LeftNavigation onSelectHistory={handleSelectHistory} onNewSummary={handleNewSummary} />
          </div>

          {/* 中间内容区 - 50%宽度 */}
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{
              width: '50%',
              minWidth: '50%',
              maxWidth: '50%',
              height: '100%',
            }}
          >
            {currentVideoId ? (
              <CenterContent
                videoId={currentVideoId}
                videoUrl={currentVideoUrl}
                videoTitle={videoTitle}
                videoAuthor={videoAuthor}
                isLoading={loading}
                onPlayerReady={setVideoPlayerController}
                subtitlesArray={subtitlesArray}
                subtitleSource={subtitleSource}
                summary={summary}
                userKey={userKey}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8">
                <UsageDescription />
                <TypingSlogan />
                <UsageAction />
                <UserKeyInput value={userKey} onChange={handleApiKeyChange} />
                <form onSubmit={handleSubmit(onFormSubmit)} className="mt-6 w-full max-w-2xl">
                  <div className="flex flex-col items-center">
                    <input
                      type="text"
                      value={currentVideoUrl}
                      onChange={handleInputChange}
                      className="w-[80%] appearance-none rounded-lg rounded-md border bg-transparent py-3 pl-4 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                      placeholder={'输入 bilibili.com/youtube.com 视频链接，按下「回车」'}
                    />
                    <div className="mt-4 flex justify-center">
                      <div style={{ height: '40px' }}>
                        <SubmitButton loading={loading} />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* 右侧信息栏 - 30%宽度 */}
          <div
            className="flex-shrink-0 overflow-y-auto"
            style={{
              width: '30%',
              minWidth: '30%',
              maxWidth: '30%',
              height: '100%',
            }}
          >
            <RightInfoPanel
              summary={summary}
              isLoading={loading}
              currentVideoUrl={currentVideoUrl}
              currentVideoId={currentVideoId}
              shouldShowTimestamp={shouldShowTimestamp}
              videoPlayerController={videoPlayerController}
              videoDuration={videoDuration}
              subtitlesArray={subtitlesArray}
              subtitleSource={subtitleSource}
              register={register}
              getValues={getValues}
              setValue={setValue}
              videoService={
                currentVideoUrl.includes('bilibili')
                  ? 'bilibili'
                  : currentVideoUrl.includes('douyin')
                  ? 'douyin'
                  : currentVideoUrl.includes('youtube') || currentVideoUrl.includes('youtu.be')
                  ? 'youtube'
                  : undefined
              }
              onResummarize={handleResummarize}
            />
          </div>
        </div>
      </>
    )
  }

  // 旧布局（保留作为备用）
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-900">
      {/* 左侧边栏 - 只在客户端挂载后显示 */}
      {mounted && showSidebar && (
        <aside className="w-80 border-r border-slate-200 dark:border-slate-800">
          <VideoHistorySidebar onSelectHistory={handleSelectHistory} />
        </aside>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 px-4 sm:px-0">
        {/* 切换边栏按钮 */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="fixed left-2 top-24 z-50 rounded-lg bg-sky-400 p-2 text-white hover:bg-sky-500 dark:bg-sky-600 dark:hover:bg-sky-700 sm:hidden"
          title={showSidebar ? '隐藏历史' : '显示历史'}
        >
          {showSidebar ? '✕' : '☰'}
        </button>

        <div className="mt-10 w-full sm:mt-40">
          <UsageDescription />
          <TypingSlogan />
          <UsageAction />
          <UserKeyInput value={userKey} onChange={handleApiKeyChange} />
          <form onSubmit={handleSubmit(onFormSubmit)} className="grid place-items-center">
            <input
              type="text"
              value={currentVideoUrl}
              onChange={handleInputChange}
              className="mx-auto mt-10 w-full appearance-none rounded-lg rounded-md border bg-transparent py-2 pl-2 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={'输入 bilibili.com/youtube.com 视频链接，按下「回车」'}
            />
            <SubmitButton loading={loading} />
          </form>

          <SummaryDisplay
            summary={summary}
            isLoading={loading}
            currentVideoUrl={currentVideoUrl}
            currentVideoId={currentVideoId}
            shouldShowTimestamp={shouldShowTimestamp}
            userKey={userKey}
            videoConfig={getValues()}
            onSummaryUpdate={setSummary}
            videoPlayerController={videoPlayerController}
          />

          {summary && !loading && (
            <SummaryResult
              summary={summary}
              currentVideoUrl={currentVideoUrl}
              currentVideoId={currentVideoId}
              shouldShowTimestamp={shouldShowTimestamp}
              userKey={userKey}
              videoConfig={getValues()}
              onSummaryUpdate={setSummary}
              videoPlayerController={videoPlayerController}
              videoDuration={videoDuration}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
