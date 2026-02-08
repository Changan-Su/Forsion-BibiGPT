# 📝 变更日志

本文档用于记录项目的所有修改内容。

---

## 变更记录

### [未分类]

#### 2026-02-08

- 添加了「章节大纲」功能，支持将视频按逻辑章节拆分并生成详细描述
  - 修改了结构化总结 Prompt（`lib/openai/prompt.ts`），在 `getStructuredSummaryPrompt` 中新增 `## 章节大纲` 段落，要求 AI 将视频分为 4-8 个逻辑章节，每章包含时间戳、标题和 2-4 句详细描述
  - 新增 `ChapterItem` 接口和解析逻辑（`utils/formatSummary.ts`），支持从 AI 输出中提取 `### Timestamp Title` 格式的章节数据
  - 在 `StructuredSummaryDisplay.tsx` 中新增章节大纲卡片组件，使用青色主题展示编号徽章、可点击时间戳按钮、章节标题和描述段落
  - 在 `useSummaryTemplates.ts` 中新增「章节大纲」模板（detailLevel: 900, showTimestamp: true），并更新「详细总结」模板加入章节大纲说明
  - 实现了提示词广场分类按钮功能（`SummarySettingsDialog.tsx`），点击「产品营销」「短视频脚本」「提取笑点」「提取金句」按钮后自动加载对应的预设提示词到自定义输入框

#### 2026-02-07

- 添加了视频 AI 问答板块，支持基于视频字幕内容进行智能问答
  - 创建了问答 API 路由（`pages/api/qa.ts`），接收用户问题和字幕上下文，调用 OpenAI GPT-4o-mini 生成精准回答
    - 使用专用的系统 Prompt，指示 AI 根据字幕内容回答并引用时间戳
    - 支持多轮对话，保留最近 10 轮对话历史作为上下文
    - 复用现有的 API Key 选择机制（`selectApiKeyAndActivatedLicenseKey`）
  - 创建了 `useVideoQA` Hook（`hooks/useVideoQA.ts`），管理问答状态和逻辑
    - 维护对话消息列表，支持用户消息和 AI 回复
    - 自动将字幕数组转换为带时间戳的文本格式
    - 提供 `askQuestion`、`clearMessages` 等方法
    - 包含加载状态管理和错误处理
  - 创建了 `VideoQAPanel` 组件（`components/VideoQAPanel.tsx`），提供聊天式问答界面
    - 聊天气泡样式：用户消息靠右（蓝色），AI 回复靠左（灰色）
    - AI 回复中的时间戳（如 `[MM:SS]`）自动渲染为可点击按钮，点击可跳转视频对应位置
    - 空状态显示快捷问题建议，点击即可快速提问
    - 支持清空对话历史
    - 无字幕数据时显示友好提示
    - 自动滚动到最新消息
  - 修改了 `CenterContent` 组件（`components/layout/CenterContent.tsx`）
    - 新增 `subtitlesArray`、`subtitleSource`、`summary`、`userKey` 属性
    - 将视频下方空白区域替换为 AI 问答面板
    - 传递视频播放器控制器给问答面板，支持时间戳跳转
  - 修改了主页面（`pages/[...slug].tsx`），将字幕数据和用户 API Key 传递给 `CenterContent`

#### 2026-01-25

- **完善原文细读功能，确保所有视频都有内容**

  - 修复了当视频有描述文本时，音频转文字功能被跳过的问题
  - 移除了当存在描述文本时提前返回的逻辑，确保即使有描述文本也会尝试音频转文字
  - 当音频转文字失败时，如果有描述文本，会自动将描述文本转换为字幕格式显示在原文细读中
  - 当音频转文字失败且无描述文本时，如果有视频标题，会将标题转换为字幕格式
  - 确保所有视频都能在原文细读中显示内容（字幕、音频转文字、描述文本或标题）
  - 修改了 `lib/fetchSubtitle.ts`，优化了音频转文字的回退逻辑

- 完善了原文细读功能，支持显示视频字幕和音频转文字内容
  - 修改了 `pages/api/sumup.ts`，在流式响应的元数据中包含字幕数据（`subtitlesArray`）和来源标识（`subtitleSource`）
  - 修改了 `hooks/useSummarize.ts`，添加了字幕数据的接收和存储功能，包括 `subtitlesArray` 和 `subtitleSource` 状态
  - 修改了 `pages/[...slug].tsx`，将字幕数据从 `useSummarize` hook 传递给 `RightInfoPanel` 组件
  - 修改了 `components/layout/RightInfoPanel.tsx`，在"原文细读"模态框中完整显示字幕内容：
    - 如果视频有字幕，则一行行显示字幕内容，每行包含时间戳（如果启用）和文本内容
    - 如果是音频转文字，则显示相应的提示信息，并一行行显示转换后的文字内容
    - 支持点击时间戳跳转到视频对应位置（如果启用了时间戳显示）
    - 如果没有字幕，显示友好的提示信息
  - 现在用户可以点击"原文细读"按钮查看完整的视频字幕或音频转文字内容，方便进行详细阅读和对照
  - 增强了调试日志功能，在多个关键位置添加了字幕数据的日志输出：
    - 在 `pages/api/sumup.ts` 中，显示字幕内容预览和完整字幕文本（前 500 字符）
    - 在 `hooks/useSummarize.ts` 中，显示接收到的字幕数据详情和完整字幕文本（前 500 字符）
    - 在 `components/layout/RightInfoPanel.tsx` 中，显示字幕数据状态和完整字幕文本（前 1000 字符）
    - 在原文细读模态框中，开发环境下显示调试信息（字幕数据状态）
  - 这些日志可以帮助开发者快速定位字幕数据传递问题，并直接在控制台查看视频的字幕或音频转文字内容

#### YYYY-MM-DD

**修改内容：**

- **修改原因：**

- **影响范围：**

- **备注：**

- ***

#### 2026-01-XX

- 修复了音频转文字后总结格式问题，使其与有字幕的视频总结格式一致

  - 修改了 `getSmallSizeTranscripts` 函数（`lib/openai/getSmallSizeTranscripts.ts`），检测字幕是否包含时间戳格式（如 `[MM:SS]`），如果包含则使用换行符连接而不是空格
  - 修改了 `getStructuredSummaryPrompt` 函数（`lib/openai/prompt.ts`），当 transcript 包含时间戳格式时保留换行符，确保时间戳格式正确识别
  - 加强了 prompt 中关于时间戳提取的说明，明确要求从 `[MM:SS]` 格式提取时间戳并放在内容末尾
  - 加强了 prompt 中关于换行的说明，明确要求每个亮点和思考问题答案对必须使用换行符分隔
  - 修改了 `parseStructuredSummary` 函数（`utils/formatSummary.ts`），添加了处理没有换行符情况的逻辑，当总结文本没有换行符但包含 markdown 标题时，自动添加换行符以确保正确解析
  - 现在音频转文字后的总结会正确显示换行、时间跳转按钮和思维导图内容，格式与有字幕的视频总结一致

- 添加了实时状态显示功能，实时显示视频处理进度和状态
  - 创建了 `ProcessingStatusWindow` 组件（`components/ProcessingStatusWindow.tsx`），提供可移动的状态窗口
  - 支持拖拽移动窗口位置，窗口会自动限制在可视区域内
  - 实时显示处理进度，包括：
    - 提取字幕阶段（10-30%）
    - 转录音频阶段（40%，当字幕不存在时）
    - 生成总结阶段（60-95%）
    - 完成状态（100%）
  - 显示处理阶段图标和颜色标识：
    - 📥 提取字幕（蓝色）
    - 🎤 转录音频（蓝色）
    - ✨ 生成总结（蓝色）
    - ✅ 完成（绿色）
    - ❌ 错误（红色）
  - 显示进度条和百分比
  - 显示处理阶段指示器（提取内容、处理中、生成总结）
  - 支持关闭窗口（点击关闭按钮）
  - 修改了 API 路由（`pages/api/sumup.ts`），添加进度事件推送（SSE 格式）
  - 修改了 `useSummarize` hook（`hooks/useSummarize.ts`），接收并处理进度事件
  - 在主界面（`pages/[...slug].tsx`）集成了状态窗口组件
  - 状态窗口在处理过程中自动显示，处理完成后可手动关闭
  - 窗口位置默认在右上角，用户可拖拽到任意位置

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
