'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderKanban, AlertTriangle, CalendarDays, Palmtree, Users, History } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/projects', label: '프로젝트', icon: FolderKanban },
  { href: '/issues', label: '이슈', icon: AlertTriangle },
  { href: '/calendar', label: '캘린더', icon: CalendarDays },
  { href: '/vacations', label: '휴가', icon: Palmtree },
  { href: '/team', label: '팀원', icon: Users },
  { href: '/history', label: '변경내역', icon: History },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 bg-gray-900 text-white min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-indigo-400">TeamScheduler</h1>
        <p className="text-xs text-gray-400 mt-0.5">팀 일정 관리</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 text-xs',
                active ? 'text-indigo-600' : 'text-gray-500'
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
