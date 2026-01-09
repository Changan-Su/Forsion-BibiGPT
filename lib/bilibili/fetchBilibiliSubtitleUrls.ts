import { find, sample } from '~/utils/fp'

type BilibiliSubtitles = {
  lan: string
  subtitle_url: string
}

interface BilibiliVideoInfo {
  title: string
  desc?: string
  dynamic?: string
  duration?: number // 视频时长（秒数）
  subtitle?: {
    list: BilibiliSubtitles[]
  }
}
export const fetchBilibiliSubtitleUrls = async (
  videoId: string,
  pageNumber?: null | string,
): Promise<BilibiliVideoInfo> => {
  const sessdata = sample(process.env.BILIBILI_SESSION_TOKEN?.split(','))
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    Host: 'api.bilibili.com',
    Cookie: `SESSDATA=${sessdata}`,
  }
  const commonConfig: RequestInit = {
    method: 'GET',
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    headers,
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
  }

  const params = videoId.startsWith('av') ? `?aid=${videoId.slice(2)}` : `?bvid=${videoId}`
  const requestUrl = `https://api.bilibili.com/x/web-interface/view${params}`
  console.log(`fetch`, requestUrl)
  const response = await fetch(requestUrl, commonConfig)
  const json = await response.json()

  // support multiple parts of video
  if (pageNumber || json?.data?.pages?.length > 0) {
    const { aid, pages } = json?.data || {}
    const targetPage = find(pages, { page: Number(pageNumber || 1) }) || pages[0]
    const { cid, duration } = targetPage || {}

    // https://api.bilibili.com/x/player/v2?aid=865462240&cid=1035524244
    const pageUrl = `https://api.bilibili.com/x/player/v2?aid=${aid}&cid=${cid}`
    const res = await fetch(pageUrl, commonConfig)
    const j = await res.json()

    // r.data.subtitle.subtitles
    return { ...json.data, duration, subtitle: { list: j.data.subtitle.subtitles } }
  }

  // return json.data.View;
  // { code: -404, message: '啥都木有', ttl: 1 }
  // 单P视频，从pages[0]获取duration，如果没有则从data.duration获取
  const duration = json?.data?.pages?.[0]?.duration || json?.data?.duration || undefined
  return { ...json.data, duration }
}
