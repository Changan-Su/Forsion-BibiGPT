'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ProcessingStage =
  | 'idle'
  | 'fetching_subtitle'
  | 'transcribing_audio'
  | 'generating_summary'
  | 'completed'
  | 'error'

export interface ProcessingStatus {
  stage: ProcessingStage
  message: string
  progress?: number // 0-100
  error?: string
}

interface ProcessingStatusWindowProps {
  status: ProcessingStatus
  visible: boolean
  onClose?: () => void
}

export function ProcessingStatusWindow({ status, visible, onClose }: ProcessingStatusWindowProps) {
  const [position, setPosition] = useState({ x: 0, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  // 初始化位置（客户端）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: window.innerWidth - 320, y: 80 })
    }
  }, [])

  // 处理拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!windowRef.current) return
    const rect = windowRef.current.getBoundingClientRect()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // 限制窗口在可视区域内
  useEffect(() => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height

      setPosition((prev) => {
        const nextX = Math.max(0, Math.min(prev.x, maxX))
        const nextY = Math.max(0, Math.min(prev.y, maxY))
        if (nextX === prev.x && nextY === prev.y) {
          return prev
        }
        return { x: nextX, y: nextY }
      })
    }
  }, [position.x, position.y])

  const getStageIcon = () => {
    switch (status.stage) {
      case 'idle':
        return '⏸️'
      case 'fetching_subtitle':
        return '📥'
      case 'transcribing_audio':
        return '🎤'
      case 'generating_summary':
        return '✨'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⏳'
    }
  }

  const getStageColor = () => {
    switch (status.stage) {
      case 'idle':
        return 'bg-gray-100 dark:bg-gray-800'
      case 'fetching_subtitle':
      case 'transcribing_audio':
      case 'generating_summary':
        return 'bg-blue-100 dark:bg-blue-900'
      case 'completed':
        return 'bg-green-100 dark:bg-green-900'
      case 'error':
        return 'bg-red-100 dark:bg-red-900'
      default:
        return 'bg-gray-100 dark:bg-gray-800'
    }
  }

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={windowRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* 标题栏 - 可拖拽 */}
        <div
          className={`flex items-center justify-between rounded-t-lg px-4 py-2 ${getStageColor()}`}
          onMouseDown={handleMouseDown as any}
          style={{ cursor: 'grab' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{getStageIcon()}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">处理状态</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              title="关闭"
            >
              ✕
            </button>
          )}
        </div>

        {/* 内容区域 */}
        <div className="px-4 py-3">
          {/* 状态消息 */}
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{status.message}</p>
            {status.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{status.error}</p>}
          </div>

          {/* 进度条 */}
          {status.progress !== undefined && status.stage !== 'error' && (
            <div className="mb-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <motion.div
                  className={`h-full ${
                    status.stage === 'completed' ? 'bg-green-500 dark:bg-green-400' : 'bg-blue-500 dark:bg-blue-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${status.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{status.progress}%</p>
            </div>
          )}

          {/* 阶段指示器 */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div
              className={`h-2 w-2 rounded-full ${
                status.stage === 'fetching_subtitle' ||
                status.stage === 'transcribing_audio' ||
                status.stage === 'generating_summary' ||
                status.stage === 'completed'
                  ? 'bg-blue-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <span>提取内容</span>
            <div
              className={`h-2 w-2 rounded-full ${
                status.stage === 'transcribing_audio' ||
                status.stage === 'generating_summary' ||
                status.stage === 'completed'
                  ? 'bg-blue-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <span>处理中</span>
            <div
              className={`h-2 w-2 rounded-full ${
                status.stage === 'generating_summary' || status.stage === 'completed'
                  ? 'bg-blue-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <span>生成总结</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
