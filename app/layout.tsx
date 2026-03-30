import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TeamScheduler - 팀 일정 관리',
  description: '팀 과제별 일정, 담당자, 진척율, 이슈를 한눈에 관리하세요',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className={`${geist.className} h-full bg-gray-50`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
