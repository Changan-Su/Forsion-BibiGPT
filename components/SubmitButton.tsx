import Image from 'next/image'
import React from 'react'

export function SubmitButton({ loading }: { loading: boolean }) {
  if (!loading) {
    return (
      <button
        className="z-10 h-10 rounded-2xl border-gray-500 bg-sky-400 px-6 text-lg font-medium text-white transition hover:bg-sky-500"
        type="submit"
        style={{ height: '40px' }}
      >
        一键总结
      </button>
    )
  }

  return (
    <button
      className="z-10 h-10 cursor-not-allowed rounded-2xl border-gray-500 bg-sky-400 px-6 text-lg font-medium transition hover:bg-sky-500"
      disabled
      style={{ height: '40px' }}
    >
      <div className="flex items-center justify-center text-white">
        <Image src="/loading.svg" alt="Loading..." width={28} height={28} />
      </div>
    </button>
  )
}
