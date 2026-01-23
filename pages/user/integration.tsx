import React from 'react'
import { useLocalStorage } from '~/hooks/useLocalStorage'

export default function IntegrationPage() {
  const [flomoWebhook, setFlomoWebhook] = useLocalStorage<string>('user-flomo-webhook')
  const handleFlomoWebhook = (e: any) => {
    setFlomoWebhook(e.target.value)
  }

  const [larkWebhook, setLarkWebhook] = useLocalStorage<string>('user-lark-webhook')
  const handleLarkWebhook = (e: any) => {
    setLarkWebhook(e.target.value)
  }

  const [notionToken, setNotionToken] = useLocalStorage<string>('user-notion-token')
  const handleNotionToken = (e: any) => {
    setNotionToken(e.target.value)
  }

  const [notionDatabaseId, setNotionDatabaseId] = useLocalStorage<string>('user-notion-database-id')
  const handleNotionDatabaseId = (e: any) => {
    setNotionDatabaseId(e.target.value)
  }

  const [emailAddress, setEmailAddress] = useLocalStorage<string>('user-email-address')
  const handleEmailAddress = (e: any) => {
    setEmailAddress(e.target.value)
  }

  return (
    <div className="p-4">
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-4 flex h-48 flex-col justify-center rounded bg-gray-50 p-6 dark:bg-gray-800">
          <h2 className="text-2xl dark:text-gray-500">Flomo 浮墨笔记</h2>
          <div className="text-lg text-slate-700 dark:text-slate-400">
            <input
              value={flomoWebhook}
              onChange={handleFlomoWebhook}
              className="mx-auto my-4 w-full appearance-none rounded-lg rounded-md border bg-transparent py-2 pl-2 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                '填写您的 Flomo API Webhook 链接，它应该类似这样: https://flomoapp.com/iwh/M000000y/d8d123456....'
              }
            />
            <div className="relin-paragraph-target mt-1 text-base text-slate-500">
              <div>
                如何获取你自己的 Flomo 专属记录 API
                <a
                  href="https://v.flomoapp.com/mine?source=incoming_webhook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-6 mt-4 pl-2 font-semibold text-sky-500 dark:text-sky-400"
                >
                  https://v.flomoapp.com/mine?source=incoming_webhook
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-4 flex h-48 flex-col justify-center rounded bg-gray-50 p-6 dark:bg-gray-800">
          <h2 className="text-2xl dark:text-gray-500">飞书 Webhook</h2>
          <div className="text-lg text-slate-700 dark:text-slate-400">
            <input
              value={larkWebhook}
              onChange={handleLarkWebhook}
              className="mx-auto my-4 w-full appearance-none rounded-lg rounded-md border bg-transparent py-2 pl-2 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                '填写您的飞书 Webhook 链接，它应该类似这样:https://open.feishu.cn/open-apis/bot/v2/hook/4794.....bb19b'
              }
            />
            <div className="relin-paragraph-target mt-1 text-base text-slate-500">
              <div>
                如何获取你自己的飞书 Webhook API 地址
                <a
                  href="https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN?lang=zh-CN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-6 mt-4 pl-2 font-semibold text-sky-500 dark:text-sky-400"
                >
                  https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN?lang=zh-CN
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-4 flex h-48 flex-col justify-center rounded bg-gray-50 p-6 dark:bg-gray-800">
          <h2 className="text-2xl dark:text-gray-500">Notion</h2>
          <div className="text-lg text-slate-700 dark:text-slate-400">
            <input
              value={notionToken || ''}
              onChange={handleNotionToken}
              className="mx-auto my-4 w-full appearance-none rounded-lg rounded-md border bg-transparent py-2 pl-2 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="填写您的 Notion Integration Token"
            />
            <input
              value={notionDatabaseId || ''}
              onChange={handleNotionDatabaseId}
              className="mx-auto my-4 w-full appearance-none rounded-lg rounded-md border bg-transparent py-2 pl-2 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="填写您的 Notion Database ID"
            />
            <div className="relin-paragraph-target mt-1 text-base text-slate-500">
              <div>
                如何获取 Notion Integration Token 和 Database ID
                <a
                  href="https://www.notion.so/help/add-and-manage-connections-with-the-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-6 mt-4 pl-2 font-semibold text-sky-500 dark:text-sky-400"
                >
                  https://www.notion.so/help/add-and-manage-connections-with-the-api
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-4 flex h-48 flex-col justify-center rounded bg-gray-50 p-6 dark:bg-gray-800">
          <h2 className="text-2xl dark:text-gray-500">Obsidian</h2>
          <div className="text-lg text-slate-700 dark:text-slate-400">
            <p className="text-base text-slate-500">
              Obsidian 集成通过下载 Markdown 文件实现。点击"保存到 Obsidian"按钮后，将自动下载 Markdown
              文件，您可以将文件保存到 Obsidian 知识库中。
            </p>
          </div>
        </div>
        <div className="mb-4 flex h-48 flex-col justify-center rounded bg-gray-50 p-6 dark:bg-gray-800">
          <h2 className="text-2xl dark:text-gray-500">Email 发送</h2>
          <div className="text-lg text-slate-700 dark:text-slate-400">
            <input
              value={emailAddress || ''}
              onChange={handleEmailAddress}
              className="mx-auto my-4 w-full appearance-none rounded-lg rounded-md border bg-transparent py-2 pl-2 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="填写您的默认接收邮箱地址"
            />
            <div className="relin-paragraph-target mt-1 text-base text-slate-500">
              <div>
                注意：需要在服务器端配置邮件服务（Resend 或 SendGrid）
                <br />
                配置环境变量：EMAIL_SERVICE、RESEND_API_KEY 或 SENDGRID_API_KEY
              </div>
            </div>
          </div>
        </div>
        <div className="mb-4 flex h-48 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
          <p className="text-2xl text-gray-400 dark:text-gray-500">💺 虚位以待，欢迎 PR！</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
            <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
          </div>
          <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
            <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
          </div>
          <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
            <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
          </div>
          <div className="flex h-28 items-center justify-center rounded bg-gray-50 dark:bg-gray-800">
            <p className="text-2xl text-gray-400 dark:text-gray-500">+</p>
          </div>
        </div>
      </div>
    </div>
  )
}
