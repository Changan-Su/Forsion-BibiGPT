# 📌 Forsion-BibiGPT

**AI 音视频内容一键总结 & 聊天助手（Fork 用于接入 Forsion）**

> This repo is a fork from BibiGPT v1, enhanced with Forsion platform integration for better model access, API optimization, and architecture improvements.

这是从原仓库 BibiGPT v1 fork 出来的版本，目的是 **集成 Forsion 平台的能力（如模型接入 / API 优化 / 架构增强）** 并提供更先进、更可定制的 AI 媒体内容总结和对话服务。

原始项目是一个 **一键 AI 摘要音视频内容并提供对话交互的学习助手**，支持 Bilibili、YouTube、Twitter、TikTok、会议、播客、讲座等多种内容类型。

原项目地址：[https://bibigpt.co](https://bibigpt.co) | [备用地址](https://b.jimmylv.cn) | [浏览器插件](https://bibigpt.co/extension)

---

## ✨ 项目亮点 / Features

- 🔍 **自动内容摘要**
  从音频 / 视频提取语音/文字，基于 AI 生成 **摘要与要点**。

- 🎤 **音频转文字功能（新）**
  当视频没有字幕时，自动使用 Whisper API 将音频转换为文字，让无字幕视频也能被识别和总结。

- 📄 **直接显示总结内容（新）**
  AI 生成摘要后直接在页面展示，无需额外操作，快速获取核心信息。

- 🎬 **内置视频播放器（新）**
  支持直接在应用内播放目标视频，无需跳转外部平台，提升使用流畅度。

- 📚 **历史记录留存（新）**
  自动保存用户过往的音视频摘要记录，方便后续回溯、查看和管理。

- 💬 **智能对话交互**
  用户可以针对内容进行问答式对话，像 ChatGPT 一样互动。

- 🧠 **支持多种平台内容**
  包括：Bilibili、YouTube、Twitter、TikTok、本地文件、播客、会议等。

- ⚙️ **集成 Forsion 平台能力（本 Fork 的核心价值）**

  - Forsion 模型支持
  - 更灵活的 API 调度与费用控制
  - 功能扩展接口

---

## 📌 为什么这个 Fork？/ Why This Fork?

原始 BibiGPT 是一个通用的 AI 音视频摘要项目，但为了：

✔ **适配 Forsion 的模型和服务**
✔ **增强定制化能力（如接入自定义后端逻辑）**
✔ **更适合国内 / 学习用途 / 多种数据源处理流程**

我们创建了这个 fork，并计划进一步优化架构与功能。

---

## 🧩 核心功能（Forsion 版本）/ Core Features

| 功能 / Feature                         | 描述 / Description                                          |
| -------------------------------------- | ----------------------------------------------------------- |
| 内容提取 / Content Extraction          | 自动解析音视频语音流                                        |
| 音频转文字 / Audio Transcription       | 当视频没有字幕时，使用 Whisper API 自动转录音频为文字       |
| AI 摘要 / AI Summary                   | 自动生成简洁内容总结                                        |
| 直接展示总结 / Direct Summary Display  | AI 生成摘要后直接在页面展示，无需额外操作，快速获取核心信息 |
| 内置视频播放器 / Built-in Video Player | 支持直接在应用内播放目标视频，无需跳转外部平台              |
| 历史记录管理 / History Management      | 自动保存用户过往的音视频摘要记录，方便回溯、查看和管理      |
| 对话问答 / Q&A Chat                    | 提供智能问答交互                                            |
| Forsion 接入 / Forsion Integration     | 使用 Forsion 模型或 API 替代默认 GPT                        |
| 多平台适配 / Multi-Platform            | 支持各种来源媒体内容                                        |
| 可扩展 / Extensible                    | 模块化插件与扩展支持                                        |

---

## 🎬 项目演示 / Demo

[![BibiGPT音视频总结神器](./public/BibiGPT.gif)](https://twitter.com/Jimmy_JingLv/status/1630137750572728320?s=20)

🚀 原始项目首次发布: [【BibiGPT】AI 自动总结 B 站视频内容，GPT-3 智能提取并总结字幕](https://www.bilibili.com/video/BV1fX4y1Q7Ux/?vd_source=dd5a650b0ad84edd0d54bb18196ecb86)

---

## 🔧 技术原理 / How It Works

This project uses the [OpenAI ChatGPT API](https://openai.com/api/) (specifically, gpt-3.5-turbo) and [Vercel Edge functions](https://vercel.com/features/edge-functions) with streaming and [Upstash](https://console.upstash.com/) for Redis cache and rate limiting. It fetches the content on a Bilibili/YouTube video, sends it in a prompt to the GPT-3 API to summarize it via a Vercel Edge function, then streams the response back to the application.

本项目使用 [OpenAI ChatGPT API](https://openai.com/api/)（gpt-3.5-turbo）和 [Vercel Edge 函数](https://vercel.com/features/edge-functions) 实现流式响应，并使用 [Upstash](https://console.upstash.com/) 进行 Redis 缓存和速率限制。它获取 Bilibili/YouTube 视频内容，通过 Vercel Edge 函数将内容发送到 GPT-3 API 进行摘要，然后将响应流式传输回应用程序。

**Forsion 版本增强：**

- 支持切换使用 Forsion 平台的模型 API
- 更灵活的请求管理和费用控制
- 优化后的架构，支持高并发场景

---

## 🚀 快速上手 / Quick Start

### 📥 克隆仓库 / Clone Repository

```bash
git clone https://github.com/Changan-Su/Forsion-BibiGPT.git
cd Forsion-BibiGPT
```

### 📦 安装依赖 / Install Dependencies

```bash
npm install
# 或者 / or
yarn
```

### 🧠 配置环境变量 / Configure Environment Variables

在项目根目录新建 `.env` 文件，复制 `.example.env` 文件作为模板：

Create a `.env` file in the project root directory, copy `.example.env` as a template:

```bash
cp .example.env .env
```

#### 📋 必填配置项 / Required Configuration

##### 1. **OpenAI API** / OpenAI API

用于 AI 内容摘要和对话的核心服务。

Used for AI content summarization and chat.

```env
OPENAI_API_KEY=sk-xxx
OPENAI_API_BASE_URL=https://api.openai.com/v1
```

**获取方法 / How to Get:**

- 访问 [OpenAI Platform](https://platform.openai.com/account/api-keys)
- 登录并创建新的 API Key
- 复制 Key 并填入 `OPENAI_API_KEY`

**自定义 API 端点 / Custom API Endpoint:**

- `OPENAI_API_BASE_URL` 支持自定义 OpenAI 兼容的 API 端点
- 示例：`https://api.openai.com/v1`、`http://localhost:1234/v1`、`https://api.example.com/v1`
- 支持 Forsion 平台：设置为 Forsion 的 API 端点即可

**多 API Key 支持 / Multiple API Keys:**

- 支持配置多个 API Key，用逗号分隔：`OPENAI_API_KEY=sk-xxx1,sk-xxx2,sk-xxx3`
- 系统会自动随机选择使用

##### 2. **Bilibili 配置** / Bilibili Configuration

用于获取 Bilibili 视频字幕。

Used to fetch Bilibili video subtitles.

```env
BILIBILI_SESSION_TOKEN=your_session_token
```

**获取方法 / How to Get:**

1. 访问 [Bilibili](https://www.bilibili.com) 并登录
2. 按 `F12` 打开开发者控制台
3. 导航至 `Application` → `Cookies` → `https://www.bilibili.com`
4. 找到 `SESSDATA` Cookie，复制其值
5. 填入 `BILIBILI_SESSION_TOKEN`

##### 3. **SaveSubs 配置** / SaveSubs Configuration

用于从某些平台获取字幕。

Used to fetch subtitles from certain platforms.

```env
SAVESUBS_X_AUTH_TOKEN=your_auth_token
```

**获取方法 / How to Get:**

1. 访问 [SaveSubs](https://savesubs.com)
2. 按 `F12` 打开开发者控制台
3. 导航至 `Application` → `Cookies` → `https://savesubs.com`
4. 找到 `cf_clearance` Cookie，复制其值
5. 填入 `SAVESUBS_X_AUTH_TOKEN`

##### 4. **Redis 配置** / Redis Configuration

用于缓存和速率限制（推荐使用本地 Redis）。

Used for caching and rate limiting (recommended to use local Redis).

```env
# 本地开发使用
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Docker 部署使用
# REDIS_HOST=redis  # Docker Compose 服务名
```

**本地 Redis 安装 / Local Redis Installation:**

- **macOS**: `brew install redis` 然后 `brew services start redis`
- **Ubuntu/Debian**: `sudo apt-get install redis-server` 然后 `sudo systemctl start redis`
- **Windows**: 下载 Redis for Windows 或使用 WSL

**Docker 方式（推荐）:**

- 项目已包含 Docker Compose 配置，直接运行 `docker compose up -d` 即可
- Redis 服务会自动启动，使用 `redis:6379` 作为连接地址

##### 5. **Supabase 配置** / Supabase Configuration

用于用户认证和数据存储。

Used for user authentication and data storage.

```env
SUPABASE_HOSTNAME=xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_URL=https://${SUPABASE_HOSTNAME}
```

**获取方法 / How to Get:**

1. 访问 [Supabase](https://supabase.com/) 并登录
2. 创建新项目（Create New Project）
3. 进入项目设置（Settings / 齿轮图标）
4. 在 API 设置中：
   - 复制 `Project URL` 的域名部分到 `SUPABASE_HOSTNAME`（例如：`abc123.supabase.co`）
   - 复制 `anon public` key 到 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 📋 可选配置项 / Optional Configuration

##### 6. **Sentry 配置** / Sentry Configuration

用于错误监控和性能追踪（可选）。

Used for error monitoring and performance tracking (optional).

```env
SENTRY_AUTH_TOKEN=your_sentry_token
```

**获取方法 / How to Get:**

- 访问 [Sentry](https://docs.sentry.io/product/cli/configuration)
- 创建项目并获取 Auth Token

##### 7. **Lemon Squeezy 配置** / Lemon Squeezy Configuration

用于支付和订阅管理（可选）。

Used for payment and subscription management (optional).

```env
LEMON_API_KEY=your_lemon_api_key
```

**获取方法 / How to Get:**

- 访问 [Lemon Squeezy](https://www.lemonsqueezy.com)
- 在 API 设置中创建 API Key

##### 8. **Segment 配置** / Segment Configuration

用于数据分析（可选）。

Used for analytics (optional).

```env
NEXT_PUBLIC_SEGMENT_WRITEKEY=your_segment_writekey
```

**获取方法 / How to Get:**

- 访问 [Segment](https://segment.com)
- 创建项目并获取 Write Key

##### 9. **音频转文字配置** / Audio Transcription Configuration

启用音频转文字功能（当视频没有字幕时自动使用 Whisper API 转录音频）：

```env
# 启用/禁用音频转文字功能（默认：启用）
ENABLE_AUDIO_TRANSCRIPTION=true
```

**注意 / Note:**

- 音频转文字功能需要安装 **yt-dlp** 工具来提取视频音频流
- 安装方法：
  - **macOS**: `brew install yt-dlp`
  - **Linux**: `pip install yt-dlp` 或 `sudo apt install yt-dlp`
  - **Windows**: `pip install yt-dlp` 或从 [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp) 下载
- 音频文件大小限制：25MB（Whisper API 限制）
- 此功能会消耗额外的 OpenAI API 调用（Whisper API），请注意成本

##### 10. **站点配置** / Site Configuration

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
INTERNAL_API_HOSTNAME=api.example.com
```

#### 📝 完整配置示例 / Complete Configuration Example

查看 [`.example.env`](.example.env) 文件获取完整的配置模板。

See [`.example.env`](.example.env) file for complete configuration template.

> 💡 **提示 / Tips:**
>
> - 详细的运行步骤请参考：[中文部署文档](./deploy-ch.md)
> - Redis 配置说明请参考：[Redis 设置文档](./REDIS_SETUP.md)
> - 所有包含 `NEXT_PUBLIC_` 前缀的变量会暴露到客户端，请勿存放敏感信息
> - 使用 `#` 可以注释掉不需要的可选配置项

### 🧪 运行项目 / Run Project

```bash
npm run dev
```

应用默认运行在：

The application will be available at:

```
http://localhost:3000
```

> 📝 **注意**: 原版本默认端口是 `2014`，Forsion 版本默认使用 `3000`（Next.js 默认端口）

---

## 🐳 Docker 部署 / Docker Deployment

项目支持 Docker 部署，确保先配置好 `.env` 文件：

The project supports Docker deployment. Make sure to configure the `.env` file first:

```shell
# make sure setup .env file firstly
docker compose up -d
```

参考：[Docker 支持 PR](https://github.com/JimmyLv/BibiGPT/pull/133)

---

## 📌 Forsion 集成说明 / Forsion Integration

这个 fork 的核心改动是 **支持 Forsion 平台的模型接入和控制**：

The core changes in this fork are **supporting Forsion platform model access and control**:

1. **模型切换 / Model Switching**
   代码中可以优先调用 Forsion 的 API，而不是默认 OpenAI。
   The code can prioritize calling Forsion's API instead of the default OpenAI.

2. **费用 & 请求管理 / Cost & Request Management**
   你可以根据需要，添加本地缓存 / 计费策略。
   You can add local caching / billing strategies as needed.

3. **性能优化 / Performance Optimization**
   将处理逻辑和响应分离，更适合高并发场景。
   Separate processing logic and responses for better high-concurrency scenarios.

（未来计划：日志分析、任务队列、异步处理等）

(Planned: log analysis, task queues, asynchronous processing, etc.)

---

## 💰 成本优化 / Saving Costs

Projects like this can get expensive so in order to save costs if you want to make your own version and share it publicly, I recommend three things:

- [x] 1. Implement rate limiting so people can't abuse your site
- [x] 2. Implement caching to avoid expensive AI re-generations
- [x] 3. Use `text-curie-001` instead of `text-dacinci-003` in the `summarize` edge function

类似项目可能会产生高昂费用，因此为了节省成本，如果你想创建自己的版本并公开分享，建议：

- [x] 1. 实现速率限制，防止滥用
- [x] 2. 实现缓存，避免昂贵的 AI 重新生成
- [x] 3. 在 `summarize` edge 函数中使用 `text-curie-001` 而不是 `text-dacinci-003`

---

## 🚀 部署 / Deployment

Deploy the example using [Vercel](https://vercel.com?utm_source=github&utm_medium=readme&utm_campaign=vercel-examples)

使用 [Vercel](https://vercel.com) 部署示例项目。

Setup the env variables, by following the `./example.env` file.

按照 `./example.env` 文件配置环境变量。

---

## 📚 参与贡献 / Contributing

欢迎贡献者在下面方式参与：

Contributions are welcome in the following ways:

- 🔧 提交 PR 修复 bug 或增强功能 / Submit PRs to fix bugs or enhance features
- 📖 优化文档（本 README / 使用指南）/ Improve documentation (this README / usage guides)
- 📊 添加测试覆盖 / Add test coverage
- 🌐 增加更多平台支持（如播客、会议流媒体）/ Add support for more platforms (podcasts, meeting streams, etc.)

---

## 🤯 灵感来源 / Inspiration

Inspired by:

- [Nutlope/news-summarizer](https://github.com/Nutlope/news-summarizer)
- [zhengbangbo/chat-simplifier](https://github.com/zhengbangbo/chat-simplifier/)
- [lxfater/BilibiliSummary](https://github.com/lxfater/BilibiliSummary)

---

## 📝 协议 / License

本项目基于 **GPL-3.0 许可协议**，详见 LICENSE 文件。

This project is licensed under **GPL-3.0 License**. See the LICENSE file for details.

---

## 🎯 项目愿景 / Project Vision

让 **任何人都能快速用 AI 了解复杂音视频内容**

**Enable anyone to quickly understand complex audio/video content with AI**

✔ 适合学生、内容创作者 / Suitable for students, content creators  
✔ 适合教育资讯 & 媒体学习场景 / Suitable for educational information & media learning scenarios  
✔ 能被 Forsion 生态里的服务驱动与扩展 / Can be driven and extended by services in the Forsion ecosystem

---

## 📞 支持 & 联系方式 / Support & Contact

![](./public/wechat.jpg)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=JimmyLv/BibiGPT&type=Date)](https://star-history.com/#JimmyLv/BibiGPT&Date)

---

## 👥 Contributors

This project exists thanks to all the people who contribute.

<a href="https://github.com/JimmyLv/BibiGPT/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=JimmyLv/BibiGPT" />
</a>
