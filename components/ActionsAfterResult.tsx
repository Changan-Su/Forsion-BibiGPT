import Link from 'next/link'
import React from 'react'
import { SaveNoteButton } from '~/components/SaveNoteButton'
import { EmailDialog } from '~/components/EmailDialog'
import { useSaveToFlomo } from '~/hooks/notes/flomo'
import useSaveToLark from '~/hooks/notes/lark'
import { useSaveToNotion } from '~/hooks/notes/notion'
import { useSaveToObsidian } from '~/hooks/notes/obsidian'
import { useSendEmail } from '~/hooks/notes/email'
import { useLocalStorage } from '~/hooks/useLocalStorage'

export function ActionsAfterResult({
  curVideo,
  onCopy,
  summaryNote,
}: {
  curVideo: string
  summaryNote: string
  onCopy: () => void
}) {
  const [flomoWebhook] = useLocalStorage<string>('user-flomo-webhook')
  const [larkWebhook] = useLocalStorage<string>('user-lark-webhook')
  const [notionToken] = useLocalStorage<string>('user-notion-token')
  const [notionDatabaseId] = useLocalStorage<string>('user-notion-database-id')
  const [emailAddress] = useLocalStorage<string>('user-email-address')

  const { loading: flomoLoading, save: flomoSave } = useSaveToFlomo(summaryNote, curVideo, flomoWebhook || '')
  const { loading: larkLoading, save: larkSave } = useSaveToLark(summaryNote, curVideo, larkWebhook || '')
  const { loading: notionLoading, save: notionSave } = useSaveToNotion(
    summaryNote,
    curVideo,
    notionToken || '',
    notionDatabaseId || '',
  )
  const { save: obsidianSave } = useSaveToObsidian(summaryNote, curVideo)
  const { loading: emailLoading, send: emailSend } = useSendEmail(summaryNote, curVideo)

  const hasNoteSetting = flomoWebhook || larkWebhook || (notionToken && notionDatabaseId)

  return (
    <div className="mx-auto mt-7 flex max-w-3xl flex-row-reverse gap-x-4">
      <a
        className="flex w-32 cursor-pointer items-center justify-center rounded-lg bg-pink-400 px-2 py-1 text-center font-medium text-white hover:bg-pink-400/80"
        href="https://space.bilibili.com/37648256"
        target="_blank"
        rel="noopener noreferrer"
      >
        （关注我 😛）
      </a>
      <a
        href={curVideo}
        className="flex w-24 cursor-pointer items-center justify-center rounded-lg bg-sky-400 px-2 py-1 text-center font-medium text-white hover:bg-sky-400/80"
        target="_blank"
        rel="noreferrer"
      >
        回到视频
      </a>
      <button
        className="w-24 cursor-pointer rounded-lg bg-sky-400 px-2 py-1 text-center font-medium text-white hover:bg-sky-400/80"
        onClick={onCopy}
      >
        一键复制
      </button>
      {!hasNoteSetting ? (
        <Link
          className="flex w-44 cursor-pointer items-center justify-center rounded-lg bg-green-400 px-2 py-1 text-center font-medium text-white hover:bg-green-400/80"
          href="/user/integration"
          target="_blank"
        >
          📒 一键保存到笔记
        </Link>
      ) : (
        <>
          {flomoWebhook && <SaveNoteButton onSave={flomoSave} loading={flomoLoading} text="一键保存到 Flomo" />}
          {larkWebhook && <SaveNoteButton onSave={larkSave} loading={larkLoading} text="推送给飞书 Webhook" />}
          {notionToken && notionDatabaseId && (
            <SaveNoteButton onSave={notionSave} loading={notionLoading} text="同步到 Notion" />
          )}
          <SaveNoteButton onSave={obsidianSave} loading={false} text="保存到 Obsidian" />
          <EmailDialog onSend={emailSend} loading={emailLoading} defaultEmail={emailAddress || ''}>
            <button className="flex w-44 cursor-pointer items-center justify-center rounded-lg bg-blue-400 px-2 py-1 text-center font-medium text-white hover:bg-blue-400/80">
              📧 发送邮件
            </button>
          </EmailDialog>
        </>
      )}
    </div>
  )
}
