import { Poppins } from 'next/font/google'
import clsx from 'clsx'
import React from 'react'
import SignIn from '~/components/SignIn'
import { BASE_DOMAIN } from '~/utils/constants'
const poppins = Poppins({ weight: '800', subsets: ['latin'] })

export default function Header({ showSingIn }: { showSingIn: (show: boolean) => void }) {
  return (
    <header className="supports-backdrop-blur:bg-white/60 max-w-8xl sticky top-0 z-40 mx-auto w-full flex-none border-b border-slate-900/10 bg-white/95 pt-2 backdrop-blur  transition-colors duration-500 dark:border-slate-50/[0.06] dark:border-slate-300/10 dark:bg-transparent lg:z-50 lg:mx-0 lg:border-0 lg:border-b lg:border-slate-900/10 lg:px-8">
      <div className="flex items-center justify-between px-3 sm:px-3">
        <div className="flex items-center space-x-3">
          <a href={BASE_DOMAIN}>
            <h2 className={clsx('text-lg sm:text-2xl', poppins.className)}>
              <span className="text-sky-400">青鸟收藏夹</span>
            </h2>
          </a>
        </div>
        <div className="flex shrink-0 items-center space-x-2 sm:space-x-5">
          <SignIn showSingIn={showSingIn} />
        </div>
      </div>
    </header>
  )
}
