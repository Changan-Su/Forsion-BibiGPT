# 📝 变更日志

本文档用于记录项目的所有修改内容。

---

## 变更记录

### [未分类]

#### YYYY-MM-DD

**修改内容：**

- **修改原因：**

- **影响范围：**

- **备注：**

- ***

## 变更分类

### 功能新增

#### 2026-01-13

### 功能新增

#### 2026-01-XX

- 添加了一键分享功能，支持多种分享方式
  - 创建了 `ShareButton` 组件（`components/ShareButton.tsx`），提供分享功能
  - 支持分享到微信（使用微信 JS-SDK，需要配置）
  - 支持分享到微博（使用微博分享 API，直接跳转到微博发布页面）
  - 支持分享到小红书（跳转到小红书创作者中心发布页面，同时复制内容到剪贴板）
  - 支持链接分享（复制分享链接到剪贴板）
  - 分享按钮位于总结列的最后，点击后显示分享方式选择菜单
  - 在 `StructuredSummaryDisplay` 组件中集成了分享按钮
  - 分享内容包含视频标题、总结摘要和原视频链接
  - 提供了友好的用户提示和错误处理
  - 小红书分享功能已优化，现在可以像微博一样直接跳转到发布页面

#### 2026-01-XX

- 实现了全局搜索功能，支持搜索历史记录中的视频

  - 在 `LeftNavigation` 组件（`components/layout/LeftNavigation.tsx`）中实现了全局搜索功能
  - 支持按视频标题、视频链接、视频 ID 或总结内容进行搜索
  - 实时搜索，输入关键词即时显示匹配结果
  - 显示搜索结果数量，每个结果卡片包含视频来源、时间、标题、链接和查看按钮
  - 点击搜索结果可以跳转到对应的历史记录并查看总结
  - 优化了搜索体验，包括空状态提示和未找到结果的提示

- 优化了历史记录显示，从总结内容中提取视频主题作为标题

  - 修改了历史记录保存逻辑（`pages/[...slug].tsx`），优先从总结内容中提取"视频主题"部分作为历史记录标题
  - 使用 `parseStructuredSummary` 函数解析结构化总结，提取 `topic` 字段
  - 如果无法从总结中提取视频主题，则回退到使用 API 返回的标题或手动设置的标题
  - 更新了 `VideoHistorySidebar` 组件（`components/VideoHistorySidebar.tsx`），确保显示真实的视频标题而不是 URL 链接或视频 ID
  - 移除了历史记录中的摘要预览部分，只保留视频标题（简介），使历史记录更加简洁，便于用户快速分辨和查找视频

- 添加了笔记集成功能，支持一键同步到 Notion、Obsidian 知识库，以及通过 Email 发送总结结果

  - 实现了 Notion 集成功能
    - 创建了 Notion API 路由（`pages/api/notes/notion.ts`），支持通过 Notion API 创建页面
    - 创建了 `useSaveToNotion` hook（`hooks/notes/notion.ts`），提供 Notion 同步功能
    - 支持配置 Notion Integration Token 和 Database ID
    - 在用户集成设置页面（`pages/user/integration.tsx`）添加了 Notion 配置界面
    - 在 `ActionsAfterResult` 组件中添加了"同步到 Notion"按钮
    - 同步的内容包括视频总结、原视频链接和标签
  - 实现了 Obsidian 集成功能
    - 创建了 `useSaveToObsidian` hook（`hooks/notes/obsidian.ts`），提供 Obsidian 保存功能
    - 通过下载 Markdown 文件的方式实现，用户可以将文件保存到 Obsidian 知识库
    - 生成的 Markdown 文件包含视频总结、原视频链接、生成时间和标签
    - 文件名格式：`BibiGPT-{日期}-{视频ID}.md`
    - 在 `ActionsAfterResult` 组件中添加了"保存到 Obsidian"按钮
  - 实现了 Email 发送功能
    - 创建了 Email API 路由（`pages/api/notes/email.ts`），支持通过邮件服务发送总结结果
    - 支持多种邮件服务：Resend（推荐）、SendGrid、SMTP
    - 创建了 `useSendEmail` hook（`hooks/notes/email.ts`），提供邮件发送功能
    - 创建了 `EmailDialog` 组件（`components/EmailDialog.tsx`），提供邮件发送对话框
    - 支持配置默认接收邮箱地址
    - 邮件内容包含视频总结、原视频链接，支持 HTML 和纯文本格式
    - 在用户集成设置页面添加了 Email 配置说明
    - 在 `ActionsAfterResult` 组件中添加了"发送邮件"按钮
  - 更新了用户集成设置页面（`pages/user/integration.tsx`）
    - 添加了 Notion 配置区域，支持输入 Integration Token 和 Database ID
    - 添加了 Obsidian 使用说明
    - 添加了 Email 配置区域和说明
    - 移除了"Notion (coming soon)"占位符
  - 更新了 `ActionsAfterResult` 组件（`components/ActionsAfterResult.tsx`）
    - 集成了 Notion、Obsidian 和 Email 功能
    - 添加了相应的按钮和对话框
    - 保持了与现有 Flomo 和飞书集成的兼容性
  - 在右侧信息面板（RightInfoPanel）中添加了"笔记集成"按钮
    - 在导出按钮旁边添加了"笔记集成"下拉菜单按钮
    - 菜单包含所有可用的笔记集成选项：
      - Flomo（如果已配置，显示"同步到 Flomo"，否则显示"配置 Flomo"）
      - 飞书（如果已配置，显示"推送到飞书"，否则显示"配置飞书"）
      - Notion（如果已配置，显示"同步到 Notion"，否则显示"配置 Notion"）
      - Obsidian（直接可用，显示"保存到 Obsidian"）
      - Email（显示"发送邮件"，打开邮件发送对话框）
    - 未配置的集成选项会显示"配置"链接，点击后跳转到集成设置页面
    - 菜单底部添加了"管理集成设置"链接，方便用户快速访问设置页面
    - 已配置的集成选项会显示加载状态（同步中/推送中）
    - 更新了 `EmailDialog` 组件，支持通过 `trigger` 属性自定义触发元素

- 添加了小红书视频内容总结功能
  - 创建了小红书处理模块（lib/xiaohongshu/）
  - 实现了小红书视频 ID 提取逻辑，支持多种 URL 格式
  - 实现了小红书视频内容获取功能（基于爬虫技术）
  - 在 VideoService 枚举中添加了 Xiaohongshu 类型
  - 更新了 fetchSubtitle 函数以支持小红书平台

#### 2026-01-XX

- 添加了个性化总结功能，包括用户偏好设置、智能推荐和自定义模板
  - 实现了用户偏好设置功能
    - 创建了 `useUserPreferences` hook（`hooks/useUserPreferences.ts`），用于管理用户总结偏好
    - 支持设置默认的详细程度、要点个数、大纲层级、输出语言等配置
    - 自动记录用户配置使用情况，用于智能推荐
    - 偏好设置存储在 localStorage 中，持久化保存
    - 创建了 `UserPreferencesSettings` 组件（`components/UserPreferencesSettings.tsx`），提供偏好设置界面
    - 支持保存和重置偏好设置
  - 实现了智能推荐功能
    - 创建了 `useSmartRecommendation` hook（`hooks/useSmartRecommendation.ts`），根据用户历史记录推荐合适的总结配置
    - 优先推荐用户最常用的配置组合
    - 根据视频平台类型（B 站、YouTube、抖音）推荐不同的配置
    - 在 `PromptOptions` 组件中集成了智能推荐提示
    - 支持一键应用推荐配置，显示推荐理由和置信度
  - 实现了自定义模板功能
    - 创建了 `useSummaryTemplates` hook（`hooks/useSummaryTemplates.ts`），用于管理总结模板
    - 支持创建、编辑、删除自定义模板
    - 每个模板可以包含自定义 Prompt、配置参数和描述
    - 提供了默认模板（默认、详细总结、简洁总结）
    - 创建了 `SummaryTemplateManager` 组件（`components/SummaryTemplateManager.tsx`），提供模板管理界面
  - 创建了用户偏好设置页面（`pages/user/preferences.tsx`）
    - 整合了偏好设置和模板管理功能
    - 提供统一的个性化设置界面
  - 更新了主界面（`pages/[...slug].tsx`）
    - 集成了用户偏好设置和智能推荐功能
    - 在生成总结时自动记录配置使用情况
    - 在 `PromptOptions` 组件中显示智能推荐提示
  - 更新了用户下拉菜单（`components/user-dropdown.tsx`）
    - 添加了"个性化设置"链接，方便用户快速访问偏好设置页面
  - 创建了总结设置对话框（`components/SummarySettingsDialog.tsx`）
    - 将个性化设置集成到统一的对话框中
    - 包含两个标签页："默认配置"和"自定义总结"
    - "默认配置"标签页包含智能推荐、时间戳、Emoji、输出语言、要点个数、大纲层级、详细程度等设置
    - "自定义总结"标签页包含提示词输入、模板选择、提示词广场等功能
    - 支持选择和应用自定义模板
    - 提供清除和确认总结按钮
  - 创建了自定义设置按钮（`components/SummarySettingsButton.tsx`）
    - 在右侧信息面板的"原文细读"按钮旁边添加了"自定义"按钮
    - 点击后打开总结设置对话框
    - 方便用户快速访问和配置总结设置
    - 按钮样式与"原文细读"按钮保持一致
  - 优化了主界面布局
    - 移除了主界面中的 PromptOptions 组件（设置已集成到对话框中）
    - 简化了主界面，所有设置统一在对话框中管理

#### 2026-01-XX

- 添加了多种格式的导出功能

  - 实现了 PDF 格式导出功能
    - 使用 html2canvas 将页面元素转换为图片
    - 使用 jsPDF 将图片转换为 PDF 文档
    - 支持多页 PDF 自动分页
    - 保留原始样式和布局
    - 导出文件格式为 `.pdf`
  - 实现了 Word 格式导出功能
    - 使用 html-docx-js-typescript 库将 HTML 内容转换为 Word 文档
    - 支持从 DOM 元素或文本内容导出
    - 保留文本格式和样式
    - 导出文件格式为 `.docx`，便于后续编辑
  - 实现了 Markdown 格式导出功能
    - 直接将摘要内容保存为 Markdown 文件
    - 保持原始文本格式
    - 导出文件格式为 `.md`
  - 在右侧信息面板（RightInfoPanel）的导出菜单中集成了所有导出选项
  - 导出菜单包含：
    - 📄 导出 PDF (保留样式)
    - 📝 导出 Word (便于编辑)
    - ⬇️ 导出 Markdown
    - 🗺️ 导出思维导图 (HTML)
  - 添加了导出状态提示（导出中...）
  - 添加了错误处理和用户提示
  - 创建了 `utils/exportFile.ts` 工具文件，统一管理所有导出功能

- 完善了思维导图板块功能
  - 将原本的"亮点"标签页替换为"思维导图"标签页
  - 实现了从结构化总结数据自动生成思维导图的功能
  - 思维导图支持可交互操作（缩放、拖拽、展开/折叠节点）
  - 思维导图内容包含：
    - 视频主题（根节点）
    - 摘要分支（按句子分割为子节点）
    - 亮点分支（包含 emoji 和时间戳）
    - 思考分支（问题作为父节点，答案作为子节点）
    - 术语解释分支（术语作为父节点，解释作为子节点）
    - 时间线总结分支（时间戳和标题作为节点）
  - 添加了思维导图导出功能，可导出为可交互的 HTML 文件
  - 导出的 HTML 文件可在浏览器中独立打开，支持完整的交互功能
  - 在导出菜单中添加了"导出思维导图 (HTML)"选项
  - 使用 markmap 库实现思维导图的渲染和交互
  - 创建了 `structuredSummaryToMindMapMarkdown` 函数，将结构化数据转换为思维导图 markdown 格式
  - 在 `RightInfoPanel` 组件中集成了 `MindMapDisplay` 组件
  - 思维导图会根据摘要内容自动更新

#### 2026-01-XX

- 添加了抖音平台视频总结功能

  - 创建了抖音处理模块（lib/douyin/）
  - 实现了抖音视频 ID 提取逻辑，支持多种 URL 格式：
    - https://www.douyin.com/video/1234567890（标准格式）
    - https://v.douyin.com/xxxxx（短链接格式）
  - 在 VideoService 枚举中添加了 Douyin 类型
  - 更新了 fetchSubtitle 函数以支持抖音平台
  - 更新了 URL 提取逻辑（utils/extractUrl.ts）以支持抖音链接识别
  - 更新了前端界面（pages/[...slug].tsx），支持抖音视频链接识别和处理
  - 实现了抖音音频提取功能（lib/audio/fetchAudioUrl.ts），使用 yt-dlp 下载音频
  - 抖音视频通常没有字幕，主要依赖音频转文字功能（Whisper API）
  - 参考 Bilibili 和 YouTube 的实现方式，保持代码风格一致
  - 支持通过 yt-dlp 获取视频标题和时长信息
  - 添加了 cookies 支持，解决抖音反爬虫问题：

    - 支持从浏览器直接读取 cookies（推荐）：通过 `DOUYIN_COOKIES_FROM_BROWSER` 环境变量
      - 支持浏览器：chrome, chromium, edge, firefox, opera, safari, brave, vivaldi
      - 示例：`DOUYIN_COOKIES_FROM_BROWSER=chrome`
    - 支持使用 cookies 文件（备用方案）：通过 `DOUYIN_COOKIES_FILE` 环境变量
      - 示例：`DOUYIN_COOKIES_FILE=/path/to/cookies.txt`
    - 如果未配置，默认尝试使用 chrome 浏览器的 cookies

  - 更新了 URL 提取逻辑以支持小红书链接
  - 更新了前端界面，支持小红书视频播放器

- 完善了 YouTube 视频总结功能

  - 实现了完整的 YouTube 字幕提取功能，支持多层级回退机制
  - 优先使用 yt-dlp 提取字幕（如果服务器已安装 yt-dlp）
  - 回退到 savesubs.com 服务（如果配置了 SAVESUBS_X_AUTH_TOKEN）
  - 最后回退到音频转文字功能（使用 Whisper API）
  - 创建了 YouTube 字幕解析工具（lib/youtube/parseYoutubeSubtitle.ts），支持 SRT、VTT、JSON 格式
  - 实现了使用 yt-dlp 提取字幕的功能（lib/youtube/fetchYoutubeSubtitleWithYtDlp.ts）
  - 完善了 savesubs.com 服务集成（lib/youtube/fetchYoutubeSubtitleWithSavesubs.ts）
  - 更新了 fetchYoutubeSubtitle.ts 实现多层级回退机制
  - 改进了错误处理逻辑，提供更清晰的错误信息
  - 支持多种 YouTube URL 格式（通过 get-video-id 包）
  - 字幕语言优先级：中文 > 英文 > 自动生成

  - 支持的小红书 URL 格式：
    - https://www.xiaohongshu.com/explore/1234567890
    - https://www.xiaohongshu.com/discovery/item/1234567890
    - https://xhslink.com/xxxxx
  - 实现了小红书爬虫功能，参考：https://github.com/Changan-Su/XHS-Importer
  - 从小红书页面提取视频信息：标题、描述、作者、时长、视频 URL
  - 实现了小红书视频播放功能：
    - 从页面 HTML 中提取视频 URL（支持 h264 和 h265 格式）
    - 使用 HTML5 video 标签直接播放小红书视频
    - 支持视频跳转功能（seekTo）
  - 小红书视频通常没有字幕，主要依赖视频描述和音频转录功能
  - 不需要像 Bilibili 那样提供 SESSION_TOKEN，使用爬虫技术直接获取内容

#### 2026-01-12

- 添加了 Chrome-Devtools MCP 服务器配置
  - 在 Cursor 的 MCP 配置文件中添加了 Chrome-Devtools MCP 服务器
  - 使用 `npx chrome-devtools-mcp@latest` 命令运行
  - 支持浏览器自动化操作和前端调试功能

### 功能优化

#### YYYY-MM-DD

-

### 问题修复

#### YYYY-MM-DD

#### 2026-01-17

- 修复了 YouTube 视频时间跳转功能

  - 修复了点击时间戳按钮无法跳转到对应时间点的问题
  - 参考 Bilibili 实现，改进了 YouTube 播放器的 `seekTo` 方法
  - 修复了 YouTube IFrame API 的 `postMessage` 消息格式（需要使用 JSON.stringify 包装）
  - 在 YouTube iframe URL 中添加了 `origin` 参数，确保 IFrame API 正常工作
  - 添加了错误处理和备用跳转方案
  - 添加了 iframe 加载完成的回调，确保播放器就绪后再进行跳转操作

- 优化了 YouTube 音频转文字功能

  - 调整了音频下载策略，优先转换为 MP3 格式（Whisper API 支持最好，避免 webm 解析问题）
  - 如果下载的是 webm 格式，自动使用 ffmpeg 转换为 MP3（Whisper API 无法解析 webm 文件的时长）
  - 参考 Bilibili 实现，改进了 `fetchYoutubeAudio` 函数：
    - 支持多种 YouTube URL 格式（watch 和 shorts）
    - 在下载音频前先获取视频信息（标题和时长）
    - 返回视频时长信息，与 Bilibili 实现保持一致
  - 修复了 Whisper API 错误："webm duration parsing requires full EBML parser" 的问题
  - 下载策略优先级：
    1. 优先转换为 MP3（需要 ffmpeg，最可靠）
    2. 回退到下载 M4A/MP3 格式（Whisper API 支持）
    3. 最后尝试下载最佳音频格式（如果是 webm，会自动转换）

-

### 文档更新

#### YYYY-MM-DD

-

### 代码重构

#### YYYY-MM-DD

-

### 其他变更

#### YYYY-MM-DD

- ***

_最后更新时间：_
