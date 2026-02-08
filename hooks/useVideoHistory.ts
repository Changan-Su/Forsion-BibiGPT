import { useLocalStorage } from '~/hooks/useLocalStorage'
import { CommonSubtitleItem } from '~/lib/types'

export interface VideoHistory {
  id: string
  videoId: string
  videoUrl: string
  title: string
  summary: string
  timestamp: number
  videoService: string
  subtitlesArray?: CommonSubtitleItem[] | null
}

export function useVideoHistory() {
  const [history, setHistory] = useLocalStorage<VideoHistory[]>('video-history', [])

  const addToHistory = (video: Omit<VideoHistory, 'id' | 'timestamp'>) => {
    const newEntry: VideoHistory = {
      ...video,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    }

    setHistory((prev: VideoHistory[]) => {
      const filtered = (prev || []).filter((item) => item.videoId !== video.videoId)
      return [newEntry, ...filtered].slice(0, 50) // 最多保存50条
    })
  }

  const removeFromHistory = (id: string) => {
    setHistory((prev: VideoHistory[]) => (prev || []).filter((item) => item.id !== id))
  }

  const clearHistory = () => {
    setHistory([])
  }

  const getVideoSummary = (videoId: string) => {
    return history.find((item) => item.videoId === videoId)
  }

  return {
    history: history || [],
    addToHistory,
    removeFromHistory,
    clearHistory,
    getVideoSummary,
  }
}
