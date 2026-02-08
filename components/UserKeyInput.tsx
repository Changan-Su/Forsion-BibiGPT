import React from 'react'

export function UserKeyInput(props: { value: string | undefined; onChange: (e: any) => void }) {
  return (
    <div className="mt-6 w-full max-w-2xl text-lg text-slate-700 dark:text-slate-400">
      <input
        value={props.value}
        onChange={props.onChange}
        className="mx-auto w-full appearance-none rounded-lg rounded-md border bg-transparent py-2 pl-2 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
        placeholder={'API Key (可选)'}
      />
    </div>
  )
}
