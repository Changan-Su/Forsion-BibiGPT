export function extractUrl(videoUrl: string) {
  // 支持 Bilibili 和抖音的视频URL格式
  // Bilibili: https://www.bilibili.com/video/BV1xx411c7mD
  // Douyin: https://www.douyin.com/video/1234567890
  const matchResult = videoUrl.match(/\/video\/([^\/\?]+)/)
  if (!matchResult) {
    return
  }
  return matchResult[1]
}

/**
 * 提取抖音视频ID
 * 支持格式：
 * - https://www.douyin.com/video/1234567890
 * - https://v.douyin.com/xxxxx (短链接，需要解析)
 */
export function extractDouyinVideoId(videoUrl: string): string | undefined {
  // 标准格式: https://www.douyin.com/video/1234567890
  const standardMatch = videoUrl.match(/douyin\.com\/video\/([^\/\?]+)/)
  if (standardMatch) {
    return standardMatch[1]
  }

  // 短链接格式: https://v.douyin.com/xxxxx
  // 注意：短链接需要先解析，这里只提取短链接ID
  const shortLinkMatch = videoUrl.match(/v\.douyin\.com\/([^\/\?]+)/)
  if (shortLinkMatch) {
    // 返回短链接ID，后续可以通过解析获取真实视频ID
    return shortLinkMatch[1]
  }

  return undefined
}

export function extractPage(currentVideoUrl: string, searchParams: URLSearchParams) {
  const queryString = currentVideoUrl.split('?')[1]
  const urlParams = new URLSearchParams(queryString)
  return searchParams.get('p') || urlParams.get('p')
}
