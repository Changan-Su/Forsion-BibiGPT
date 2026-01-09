import { reduceBilibiliSubtitleTimestamp } from '~/utils/reduceSubtitleTimestamp'
import { fetchBilibiliSubtitleUrls } from './fetchBilibiliSubtitleUrls'

export async function fetchBilibiliSubtitle(
  videoId: string,
  pageNumber?: null | string,
  shouldShowTimestamp?: boolean,
) {
  try {
    const res = await fetchBilibiliSubtitleUrls(videoId, pageNumber)
    const { title, desc, dynamic, duration, subtitle } = res || {}
    const hasDescription = desc || dynamic
    const descriptionText = hasDescription ? `${desc} ${dynamic}` : undefined
    const subtitleList = subtitle?.list
    if (!subtitleList || subtitleList?.length < 1) {
      return { title, subtitlesArray: null, descriptionText, duration }
    }

    const betterSubtitle = subtitleList.find(({ lan }: { lan: string }) => lan === 'zh-CN') || subtitleList[0]
    const subtitleUrl = betterSubtitle?.subtitle_url?.startsWith('//')
      ? `https:${betterSubtitle?.subtitle_url}`
      : betterSubtitle?.subtitle_url
    console.log('subtitle_url', subtitleUrl)

    const subtitleResponse = await fetch(subtitleUrl)
    const subtitles = await subtitleResponse.json()
    const transcripts = reduceBilibiliSubtitleTimestamp(subtitles?.body, shouldShowTimestamp)
    return { title, subtitlesArray: transcripts, descriptionText, duration }
  } catch (error) {
    console.error('Error fetching Bilibili subtitle:', error)
    return { title: videoId, subtitlesArray: null, descriptionText: undefined, duration: undefined }
  }
}

// const res = await pRetry(async () => await fetchBilibiliSubtitles(videoId), {
//   onFailedAttempt: (error) => {
//     console.log(
//       `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`
//     );
//   },
//   retries: 2,
// });
// @ts-ignore
