export function extractSentenceWithTimestamp(sentence: string) {
  // 修正正则表达式，正确匹配 "- 0:10 -" 这样的格式
  // 第一组：时间戳（0:10 或 0:10:30）
  // 第二组：时间戳后面的内容（包括 - 和文本）
  return sentence.match(/^-?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(.*)/)
}
