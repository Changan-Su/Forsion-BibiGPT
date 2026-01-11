import { limitTranscriptByteLength } from '~/lib/openai/getSmallSizeTranscripts'
import { VideoConfig } from '~/lib/types'
import { DEFAULT_LANGUAGE, PROMPT_LANGUAGE_MAP } from '~/utils/constants/language'

interface PromptConfig {
  language?: string
  sentenceCount?: string
  shouldShowTimestamp?: boolean
}

export function getExamplePrompt() {
  return {
    input: `标题: "【BiliGPT】AI 自动总结 B站 视频内容，GPT-3 智能提取并总结字幕"
视频字幕: "2.06 - 哈喽哈喽 这里是机密的频道 今天给大家整个活叫哔哩哔哩gp t  6.71 - 选择插着gp t的爆火 作为软件工程师的我也按捺不住 去需要把哔哩哔哩的url贴进来  21.04 - 然后你就点击一键总结 稍等片刻 你就可以获得这样一份精简的总结`,
    output: `视频概述：BiliGPT 是一款自动总结B站视频内容的 AI 工具

- 2.06 - 作为软件工程师的我按捺不住去开发了 BiliGPT
- 21.04 - 只需要粘贴哔哩哔哩的URL，一键总结为精简内容`,
  }
}

export function getSystemPrompt(promptConfig: PromptConfig) {
  // [gpt-3-youtube-summarizer/main.py at main · tfukaza/gpt-3-youtube-summarizer](https://github.com/tfukaza/gpt-3-youtube-summarizer/blob/main/main.py)
  console.log('prompt config: ', promptConfig)
  const { language = '中文', sentenceCount = '5', shouldShowTimestamp } = promptConfig
  // @ts-ignore
  const enLanguage = PROMPT_LANGUAGE_MAP[language]
  // 我希望你是一名专业的视频内容编辑，帮我用${language}总结视频的内容精华。请你将视频字幕文本进行总结（字幕中可能有错别字，如果你发现了错别字请改正），然后以无序列表的方式返回，不要超过5条。记得不要重复句子，确保所有的句子都足够精简，清晰完整，祝你好运！
  const betterPrompt = `I want you to act as an educational content creator. You will help students summarize the essence of the video in ${enLanguage}. Please summarize the video subtitles (there may be typos in the subtitles, please correct them) and return them in an unordered list format. Please do not exceed ${sentenceCount} items, and make sure not to repeat any sentences and all sentences are concise, clear, and complete. Good luck!`
  // const timestamp = ' ' //`（类似 10:24）`;
  // 我希望你是一名专业的视频内容编辑，帮我用${language}总结视频的内容精华。请先用一句简短的话总结视频梗概。然后再请你将视频字幕文本进行总结（字幕中可能有错别字，如果你发现了错别字请改正），在每句话的最前面加上时间戳${timestamp}，每句话开头只需要一个开始时间。请你以无序列表的方式返回，请注意不要超过5条哦，确保所有的句子都足够精简，清晰完整，祝你好运！
  const promptWithTimestamp = `I would like you to act as a professional video content editor. You will help students summarize the essence of the video in ${enLanguage}. Please start by summarizing the whole video in one short sentence (there may be typos in the subtitles, please correct them). Then, please summarize the video subtitles, each subtitle should has the start timestamp (e.g. 12.4 -) so that students can select the video part. Please return in an unordered list format, make sure not to exceed ${sentenceCount} items and all sentences are concise, clear, and complete. Good luck!`

  return shouldShowTimestamp ? promptWithTimestamp : betterPrompt
}
export function getUserSubtitlePrompt(title: string, transcript: any, videoConfig: VideoConfig) {
  const videoTitle = title?.replace(/\n+/g, ' ').trim()
  const videoTranscript = limitTranscriptByteLength(transcript).replace(/\n+/g, ' ').trim()
  const language = videoConfig.outputLanguage || DEFAULT_LANGUAGE
  const sentenceCount = videoConfig.sentenceNumber || 7
  const emojiTemplateText = videoConfig.showEmoji ? '[Emoji] ' : ''
  const emojiDescriptionText = videoConfig.showEmoji ? 'Choose an appropriate emoji for each bullet point. ' : ''
  const shouldShowAsOutline = Number(videoConfig.outlineLevel) > 1
  const wordsCount = videoConfig.detailLevel ? (Number(videoConfig.detailLevel) / 100) * 2 : 15
  const outlineTemplateText = shouldShowAsOutline ? `\n    - Child points` : ''
  const outlineDescriptionText = shouldShowAsOutline
    ? `Use the outline list, which can have a hierarchical structure of up to ${videoConfig.outlineLevel} levels. `
    : ''
  const prompt = `Your output should use the following template:\n## Summary\n## Highlights\n- ${emojiTemplateText}Bulletpoint${outlineTemplateText}\n\nYour task is to summarise the text I have given you in up to ${sentenceCount} concise bullet points, starting with a short highlight, each bullet point is at least ${wordsCount} words. ${outlineDescriptionText}${emojiDescriptionText}Use the text above: {{Title}} {{Transcript}}.\n\nReply in ${language} Language.`

  return `Title: "${videoTitle}"\nTranscript: "${videoTranscript}"\n\nInstructions: ${prompt}`
}

export function getStructuredSummaryPrompt(
  title: string,
  transcript: any,
  videoConfig: VideoConfig,
  duration?: number,
) {
  const videoTitle = title?.replace(/\n+/g, ' ').trim()
  const videoTranscript = limitTranscriptByteLength(transcript).replace(/\n+/g, ' ').trim()
  const language = videoConfig.outputLanguage || DEFAULT_LANGUAGE

  // 添加时长约束
  let durationConstraint = ''
  if (duration && duration > 0) {
    const { secondsToTimeString } = require('~/utils/videoDuration')
    const durationFormatted = secondsToTimeString(duration)
    durationConstraint = `\n\nIMPORTANT: This video has a total duration of ${durationFormatted} (${duration} seconds). ALL timestamps you generate (e.g., MM:SS or HH:MM:SS) MUST be ≤ this duration. If any content corresponds to a time beyond the duration, automatically adjust it to the closest valid time or skip that timestamp. NEVER generate timestamps that exceed ${durationFormatted}.`
  }

  const prompt = `You are a professional video content analyzer. Please analyze the video and generate a comprehensive structured summary in ${language} Language.${durationConstraint}

Your output MUST follow this EXACT format (copy the structure precisely):

## 摘要
[Write a complete paragraph (2-4 sentences) summarizing the video content. Do NOT use bullet points or lists. Write as a flowing paragraph.]

## 亮点
[emoji] [Content description. Write naturally, include key details. Add timestamp at the END if applicable, format: MM:SS or HH:MM:SS]
[emoji] [Content description with timestamp at the end if applicable]
[Continue with 5-8 highlights, each starting with an emoji]
#标签1 #标签2 #标签3 [Add 3-5 relevant hashtags at the end]

## 思考
[Question as a title/subheading, without "问题：" prefix]
[Answer content. Add timestamp at the END of the answer if applicable, format: MM:SS or HH:MM:SS]

[Next question as title]
[Answer with timestamp at end if applicable]

[Continue with 3-5 questions and answers]

## 术语解释
[Term Name]: [Explanation content]
[Term Name]: [Explanation content]
[Continue with 3-5 terms, each on a new line]

## 阅读全文

## AI 润色

## AI 改写
## 视频主题
[Video topic/title in one line]

## 时间线总结

[Timestamp] - [emoji] [Brief title/heading]

Screenshot at [seconds]s

[Detailed description paragraph explaining what happens at this timestamp]

[Next timestamp entry]
[Continue with chronological timeline entries]

Requirements:
1. Use EXACT markdown headers: ## 摘要, ## 亮点, ## 思考, ## 术语解释, ## 阅读全文, ## AI 润色, ## AI 改写, ## 视频主题, ## 时间线总结
2. 摘要 must be a complete paragraph, NOT a list
3. 亮点: Start each line with emoji, write natural content, add timestamp at the END if applicable. End with hashtags line
4. 思考: Question as title (no "问题：" prefix), answer as content with timestamp at END if applicable
5. 术语解释: Format as "Term: Explanation" (one per line, no bullet points)
6. Include the three section headers: ## 阅读全文, ## AI 润色, ## AI 改写 (these are just headers, no content needed)
7. 视频主题: One line title
8. 时间线总结: Format as "Timestamp - emoji Title" followed by "Screenshot at Xs" and detailed paragraph
9. **CRITICAL TIMESTAMP HANDLING**: 
   - If the transcript contains timestamps in formats like "[MM:SS]" (e.g., "[0:49]"), "[HH:MM:SS]" (e.g., "[1:23:45]"), or "[seconds]" (e.g., "[49]"), you MUST extract these timestamps from the transcript
   - When generating highlights, ALWAYS include the corresponding timestamp at the END of each highlight in MM:SS or HH:MM:SS format
   - When generating reflections, ALWAYS include the corresponding timestamp at the END of each answer in MM:SS or HH:MM:SS format
   - Example: If transcript has "[0:49] passengers enjoy afternoon tea", your highlight should be "☕️ passengers enjoy afternoon tea 0:49"
   - Example: If transcript has "[49] content", convert to "0:49" format
   - If the transcript does NOT contain timestamps, you can omit timestamps or estimate based on content position
10. Ensure all timestamps are accurate and correspond to the video content
11. There may be typos in the subtitles, please correct them
12. All content should be in ${language} Language
13. Write naturally and engagingly, similar to the example format

Title: "${videoTitle}"
Transcript: "${videoTranscript}"

Please generate the structured summary now:`

  return prompt
}

export function getUserSubtitleWithTimestampPrompt(title: string, transcript: any, videoConfig: VideoConfig) {
  const videoTitle = title?.replace(/\n+/g, ' ').trim()
  const videoTranscript = limitTranscriptByteLength(transcript).replace(/\n+/g, ' ').trim()
  const language = videoConfig.outputLanguage || DEFAULT_LANGUAGE
  const sentenceCount = videoConfig.sentenceNumber || 7
  const emojiTemplateText = videoConfig.showEmoji ? '[Emoji] ' : ''
  const wordsCount = videoConfig.detailLevel ? (Number(videoConfig.detailLevel) / 100) * 2 : 15
  const promptWithTimestamp = `Act as the author and provide exactly ${sentenceCount} bullet points for the text transcript given in the format [seconds] - [text] \nMake sure that:\n    - Please start by summarizing the whole video in one short sentence\n    - Then, please summarize with each bullet_point is at least ${wordsCount} words\n    - each bullet_point start with \"- \" or a number or a bullet point symbol\n    - each bullet_point should has the start timestamp, use this template: - seconds - ${emojiTemplateText}[bullet_point]\n    - there may be typos in the subtitles, please correct them\n    - Reply all in ${language} Language.`
  const videoTranscripts = limitTranscriptByteLength(JSON.stringify(videoTranscript))
  return `Title: ${videoTitle}\nTranscript: ${videoTranscripts}\n\nInstructions: ${promptWithTimestamp}`
}

export function getStructuredSummaryWithTimestampPrompt(
  title: string,
  transcript: any,
  videoConfig: VideoConfig,
  duration?: number,
) {
  return getStructuredSummaryPrompt(title, transcript, videoConfig, duration)
}
