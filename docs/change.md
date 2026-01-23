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

- 添加了小红书视频内容总结功能
  - 创建了小红书处理模块（lib/xiaohongshu/）
  - 实现了小红书视频 ID 提取逻辑，支持多种 URL 格式
  - 实现了小红书视频内容获取功能（基于爬虫技术）
  - 在 VideoService 枚举中添加了 Xiaohongshu 类型
  - 更新了 fetchSubtitle 函数以支持小红书平台
  - 更新了 URL 提取逻辑以支持小红书链接
  - 更新了前端界面，支持小红书视频播放器
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
