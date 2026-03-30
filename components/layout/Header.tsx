'use client'

import { useSession, signOut } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'

export function Header({ title }: { title?: string }) {
  const { data: session } = useSession()

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between">
      <h2 className="text-base md:text-lg font-semibold text-gray-800">{title || 'TeamScheduler'}</h2>
      {session?.user && (
        <div className="flex items-center gap-2">
          <UserAvatar
            name={session.user.name ?? ''}
            avatarColor={(session.user as any).avatarColor ?? '#6366f1'}
            size="sm"
          />
          <span className="hidden md:block text-sm text-gray-700">{session.user.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  )
}
