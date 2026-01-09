import { extractSentenceWithTimestamp } from '~/utils/extractSentenceWithTimestamp'
import { extractTimestamp, trimSeconds } from '~/utils/extractTimestamp'

export default function videoIdSentence({
  videoId,
  videoUrl,
  sentence,
}: {
  videoId: string
  videoUrl: string
  sentence: string
}) {
  const isBiliBili = videoUrl.includes('bilibili.com')
  const baseUrl = isBiliBili
    ? `https://www.bilibili.com/video/${videoId}/?t=`
    : `https://youtube.com/watch?v=${videoId}&t=`

  const matchResult = extractSentenceWithTimestamp(sentence)
  if (matchResult) {
    // matchResult[1] 是时间戳如 "0:10" 或 "0:45"
    const timestampStr = matchResult[1]
    const parts = timestampStr.split(':')
    const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1])

    const timestamp = timestampStr
    const content = matchResult[2]

    return (
      <li className="mb-2 list-disc">
        <a
          href={`${encodeURI(baseUrl + seconds)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="z-10 text-sky-400 hover:text-sky-600"
        >
          {timestamp}
        </a>
        {` - ${content}`}
      </li>
    )
  }
  return <li className="mb-2 list-disc">{sentence}</li>
}
