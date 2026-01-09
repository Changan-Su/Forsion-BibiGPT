import { YoutubeSubtitleItem, reduceYoutubeSubtitleTimestamp } from '~/utils/reduceSubtitleTimestamp'

export async function fetchYoutubeSubtitle(
  videoId: string,
  shouldShowTimestamp?: boolean,
): Promise<{
  title: string
  subtitlesArray?: null | any[]
  descriptionText?: string
}> {
  try {
    // YouTube API endpoint to get video info
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`)

    if (!response.ok) {
      console.error('Failed to fetch YouTube video')
      return { title: videoId, subtitlesArray: null, descriptionText: undefined }
    }

    // Note: YouTube subtitle extraction requires more complex processing
    // For now, return empty subtitles as a placeholder
    console.log('YouTube subtitle extraction not fully implemented')
    return {
      title: videoId,
      subtitlesArray: null,
      descriptionText: undefined,
    }
  } catch (error) {
    console.error('Error fetching YouTube subtitle:', error)
    return { title: videoId, subtitlesArray: null, descriptionText: undefined }
  }
}
