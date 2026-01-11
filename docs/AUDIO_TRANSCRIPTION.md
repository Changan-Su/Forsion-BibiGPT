# 🎤 音频转文字功能说明

## 功能概述

当视频没有字幕时，系统会自动尝试使用 OpenAI Whisper API 将音频转换为文字，然后进行总结。这让你可以处理没有字幕的视频内容。

## 工作原理

1. **字幕提取优先**：首先尝试从视频平台提取已有的字幕文件
2. **音频转文字回退**：如果字幕不存在，系统会：
   - 使用 yt-dlp 提取视频的音频流
   - 下载音频文件
   - 使用 OpenAI Whisper API 将音频转换为文字
   - 将转录结果转换为字幕格式
3. **智能摘要**：使用转换后的文字进行 AI 摘要和总结

## 前置要求

### 1. 安装 yt-dlp

音频转文字功能需要 **yt-dlp** 工具来提取视频音频流。

**macOS:**

```bash
brew install yt-dlp
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt install yt-dlp
# 或
pip install yt-dlp
```

**Windows:**

```bash
pip install yt-dlp
# 或从 https://github.com/yt-dlp/yt-dlp 下载可执行文件
```

**验证安装:**

```bash
yt-dlp --version
```

### 2. OpenAI API Key

确保已配置 `OPENAI_API_KEY` 环境变量，Whisper API 使用相同的 API Key。

### 3. 环境变量配置

在 `.env` 文件中添加（可选，默认启用）：

```env
# 启用/禁用音频转文字功能（默认：启用）
ENABLE_AUDIO_TRANSCRIPTION=true
```

## 使用方式

### 自动模式（推荐）

音频转文字功能默认启用，无需额外配置。当视频没有字幕时，系统会自动尝试音频转文字。

### 禁用音频转文字

如果需要禁用此功能（例如为了节省 API 成本），可以在 `.env` 文件中设置：

```env
ENABLE_AUDIO_TRANSCRIPTION=false
```

## 支持的平台

- ✅ **Bilibili**：支持通过 yt-dlp 提取音频
- ✅ **YouTube**：支持通过 yt-dlp 提取音频
- ⚠️ **其他平台**：需要确认 yt-dlp 是否支持

## 限制和注意事项

### 文件大小限制

- Whisper API 限制音频文件大小为 **25MB**
- 如果音频文件超过 25MB，转文字会失败
- 对于较长的视频，可能需要先截取音频片段

### 处理时间

- 音频转文字需要额外的处理时间（下载音频 + API 调用）
- 预计比纯字幕提取多花费 **2-5 分钟**（取决于视频长度）

### API 成本

- Whisper API 按使用量计费
- 成本取决于音频长度（约 $0.006/分钟）
- 建议监控 API 使用情况

### 准确性

- Whisper API 提供高精度的语音识别
- 但对于背景音乐较大的视频，准确性可能下降
- 建议优先使用平台提供的字幕

## 故障排除

### 问题 1: "yt-dlp 未安装"

**症状：** 日志显示 "yt-dlp 未安装，无法进行音频转文字"

**解决方案：**

1. 确认 yt-dlp 已正确安装：`yt-dlp --version`
2. 确认 yt-dlp 在系统 PATH 中
3. 重新安装 yt-dlp（见前置要求）

### 问题 2: "音频文件太大"

**症状：** 错误信息显示 "Audio file too large: XX MB (max 25MB)"

**解决方案：**

- 当前版本暂不支持自动截取音频
- 建议使用有字幕的视频，或等待后续更新

### 问题 3: "音频转文字失败"

**症状：** API 返回错误

**可能原因：**

1. OpenAI API Key 无效或余额不足
2. 网络连接问题
3. 音频格式不支持

**解决方案：**

1. 检查 OpenAI API Key 配置
2. 检查网络连接
3. 查看详细错误日志

### 问题 4: 处理时间过长

**症状：** 音频转文字需要很长时间

**解决方案：**

- 这是正常现象，音频转文字需要下载音频文件和 API 调用
- 可以通过禁用音频转文字功能来避免额外处理时间

## 技术细节

### 工作流程

```
视频 URL
  ↓
提取字幕（优先）
  ↓
字幕存在？ → 是 → 使用字幕
  ↓ 否
检查音频转文字是否启用
  ↓
是 → 使用 yt-dlp 提取音频
  ↓
下载音频文件
  ↓
检查文件大小（< 25MB）
  ↓
调用 Whisper API
  ↓
转换为字幕格式
  ↓
进行 AI 摘要
```

### API 调用

- **Whisper API**: `POST /v1/audio/transcriptions`
- **模型**: `whisper-1`
- **响应格式**: `verbose_json`（包含时间戳）

## 未来改进

- [ ] 支持音频自动截取（处理超过 25MB 的视频）
- [ ] 添加进度提示（处理长时间音频时）
- [ ] 支持更多音频格式
- [ ] 优化音频提取速度
- [ ] 添加音频转文字的缓存机制

## 相关文件

- `lib/audio/transcribeAudio.ts` - Whisper API 集成
- `lib/audio/fetchAudioUrl.ts` - 音频提取逻辑
- `lib/fetchSubtitle.ts` - 字幕提取和音频转文字回退逻辑
- `pages/api/sumup.ts` - API 路由处理

## 参考链接

- [OpenAI Whisper API 文档](https://platform.openai.com/docs/guides/speech-to-text)
- [yt-dlp 文档](https://github.com/yt-dlp/yt-dlp)
- [Whisper API 定价](https://openai.com/pricing)
