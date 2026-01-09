/**
 * 将秒数转换为 MM:SS 或 HH:MM:SS 格式
 * @param seconds 总秒数
 * @returns 格式化的时间字符串，如 "20:08" 或 "1:20:08"
 */
export function secondsToTimeString(seconds: number): string {
  if (!seconds || seconds < 0) {
    return '00:00'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * 将时间字符串（MM:SS 或 HH:MM:SS）转换为秒数
 * @param timeString 时间字符串，如 "20:08" 或 "1:20:08"
 * @returns 总秒数
 */
export function timeStringToSeconds(timeString: string): number {
  if (!timeString) return 0

  // 支持 4位数字格式：0830
  if (/^\d{4}$/.test(timeString)) {
    const minutes = parseInt(timeString.substring(0, 2), 10)
    const seconds = parseInt(timeString.substring(2), 10)
    return minutes * 60 + seconds
  }

  const parts = timeString.split(':')
  if (parts.length === 2) {
    // MM:SS
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
  } else if (parts.length === 3) {
    // HH:MM:SS
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)
  }

  return 0
}

/**
 * 校验并修正时间点，确保不超过视频最大时长
 * @param timestamp 时间戳字符串，如 "23:50"
 * @param maxDurationSeconds 视频最大时长（秒数）
 * @param autoFix 是否自动修正为最大时长（默认true）
 * @returns 修正后的时间戳字符串，如果autoFix为false且超时则返回null
 */
export function validateAndFixTimestamp(
  timestamp: string,
  maxDurationSeconds: number,
  autoFix: boolean = true,
): string | null {
  if (!timestamp || !maxDurationSeconds) {
    return timestamp || null
  }

  const timestampSeconds = timeStringToSeconds(timestamp)

  if (timestampSeconds > maxDurationSeconds) {
    if (autoFix) {
      console.warn(
        `[时间校验] 时间点 ${timestamp} (${timestampSeconds}秒) 超出视频时长 ${maxDurationSeconds}秒，已修正为最大时长`,
      )
      return secondsToTimeString(maxDurationSeconds)
    } else {
      console.warn(
        `[时间校验] 时间点 ${timestamp} (${timestampSeconds}秒) 超出视频时长 ${maxDurationSeconds}秒，已过滤`,
      )
      return null
    }
  }

  return timestamp
}
