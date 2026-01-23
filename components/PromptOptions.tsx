import React, { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form/dist/types/form'
import { PROMPT_LANGUAGE_MAP } from '~/utils/constants/language'
import { useSmartRecommendation } from '~/hooks/useSmartRecommendation'
import { useToast } from '~/hooks/use-toast'

export function PromptOptions({
  register,
  getValues,
  setValue,
  videoService,
}: {
  // TODO: add types
  register: any
  getValues: UseFormReturn['getValues']
  setValue: UseFormReturn['setValue']
  videoService?: string
}) {
  const shouldShowTimestamp = getValues('showTimestamp')
  const { recommendConfigByVideoType } = useSmartRecommendation()
  const { toast } = useToast()
  const [recommendation, setRecommendation] = useState<ReturnType<typeof recommendConfigByVideoType> | null>(null)

  useEffect(() => {
    const rec = recommendConfigByVideoType(videoService)
    setRecommendation(rec)
  }, [videoService, recommendConfigByVideoType])

  const handleApplyRecommendation = () => {
    if (!recommendation) return

    const { config } = recommendation
    if (config.detailLevel !== undefined) setValue('detailLevel', config.detailLevel)
    if (config.sentenceNumber !== undefined) setValue('sentenceNumber', config.sentenceNumber)
    if (config.outlineLevel !== undefined) setValue('outlineLevel', config.outlineLevel)
    if (config.outputLanguage !== undefined) setValue('outputLanguage', config.outputLanguage)
    if (config.showTimestamp !== undefined) setValue('showTimestamp', config.showTimestamp)
    if (config.showEmoji !== undefined) setValue('showEmoji', config.showEmoji)
    if (config.enableStream !== undefined) setValue('enableStream', config.enableStream)

    toast({
      title: '已应用推荐配置',
      description: recommendation.reason,
    })
  }

  return (
    <div>
      {recommendation && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">💡 智能推荐</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {recommendation.reason} (置信度: {Math.round(recommendation.confidence * 100)}%)
            </p>
          </div>
          <button
            onClick={handleApplyRecommendation}
            className="ml-4 rounded-md bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
          >
            应用推荐
          </button>
        </div>
      )}
      <div className="mt-6 grid grid-cols-2 items-center gap-x-10 gap-y-2 md:mt-10 md:grid-cols-3 md:gap-y-6">
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" value="" className="peer sr-only" {...register('showTimestamp')} />
          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-sky-800"></div>
          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">是否显示时间戳</span>
        </label>
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" className="peer sr-only" {...register('showEmoji')} />
          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-sky-800"></div>
          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">是否显示Emoji</span>
        </label>
        <div>
          <label htmlFor="outputLanguage" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            输出语言
          </label>
          <select
            id="outputLanguage"
            className="block w-full rounded-md border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:border-sky-500 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-sky-500 dark:focus:ring-sky-500"
            {...register('outputLanguage')}
          >
            {Object.keys(PROMPT_LANGUAGE_MAP).map((k: string) => (
              <option key={PROMPT_LANGUAGE_MAP[k]} value={PROMPT_LANGUAGE_MAP[k]}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sentenceNumber" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            要点个数
            <span className="text-gray-500">(≤{getValues('sentenceNumber')})</span>
          </label>
          <input
            id="sentenceNumber"
            type="range"
            min={3}
            max={10}
            step={1}
            className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
            {...register('sentenceNumber', {
              valueAsNumber: true,
            })}
          />
        </div>
        <div>
          <label htmlFor="outlineLevel" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            大纲层级
            <span className="text-gray-500">(≤{getValues('outlineLevel')})</span>
          </label>
          <input
            id="outlineLevel"
            type="range"
            min={1}
            max={5}
            step={1}
            className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
            disabled={shouldShowTimestamp}
            {...register('outlineLevel', {
              valueAsNumber: true,
            })}
          />
        </div>
        <div>
          <label htmlFor="detailLevel" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            详细程度
            <span className="text-gray-500">(≤{getValues('detailLevel')})</span>
          </label>
          <input
            id="detailLevel"
            type="range"
            min={300}
            max={1000}
            step={10}
            className="h-2 w-full cursor-pointer rounded-lg bg-gray-200 accent-black dark:bg-gray-700"
            {...register('detailLevel', {
              valueAsNumber: true,
            })}
          />
        </div>
      </div>
    </div>
  )
}
