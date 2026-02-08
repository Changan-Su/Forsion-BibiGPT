import React, { useState } from 'react'
import { UseFormReturn } from 'react-hook-form/dist/types/form'
import { Settings } from 'lucide-react'
import { SummarySettingsDialog } from '~/components/SummarySettingsDialog'

interface SummarySettingsButtonProps {
  register: any
  getValues: UseFormReturn['getValues']
  setValue: UseFormReturn['setValue']
  videoService?: string
  onResummarize?: (customPrompt?: string) => void
  hasSubtitles?: boolean
  isLoading?: boolean
}

export function SummarySettingsButton({
  register,
  getValues,
  setValue,
  videoService,
  onResummarize,
  hasSubtitles,
  isLoading,
}: SummarySettingsButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        style={{ width: '100px', height: '32px' }}
      >
        <Settings className="h-4 w-4" />
        自定义
      </button>
      <SummarySettingsDialog
        open={open}
        onOpenChange={setOpen}
        register={register}
        getValues={getValues}
        setValue={setValue}
        videoService={videoService}
        onResummarize={onResummarize}
        hasSubtitles={hasSubtitles}
        isLoading={isLoading}
      />
    </>
  )
}
