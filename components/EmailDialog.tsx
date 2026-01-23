import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'

interface EmailDialogProps {
  onSend: (to: string, subject?: string) => Promise<void>
  loading: boolean
  defaultEmail?: string
  children?: React.ReactNode
  trigger?: React.ReactNode
}

export function EmailDialog({
  onSend,
  loading,
  defaultEmail,
  children,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EmailDialogProps & { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [email, setEmail] = useState(defaultEmail || '')
  const [subject, setSubject] = useState('')

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      return
    }
    await onSend(email, subject || undefined)
    setOpen(false)
  }

  // 如果是受控模式（有 open 和 onOpenChange），不需要 DialogTrigger
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!isControlled && children && !trigger && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>发送邮件</DialogTitle>
          <DialogDescription>输入接收邮箱地址和邮件主题（可选）</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">邮箱地址</Label>
            <input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:ring-offset-slate-900 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-400"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject">邮件主题（可选）</Label>
            <input
              id="subject"
              placeholder="BibiGPT 视频总结"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:ring-offset-slate-900 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-400"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSend} disabled={loading || !email || !email.includes('@')}>
            {loading ? '发送中...' : '发送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
