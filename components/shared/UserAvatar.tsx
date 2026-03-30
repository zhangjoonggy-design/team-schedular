'use client'

import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string
  avatarColor: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ name, avatarColor, size = 'md', className }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: avatarColor }}
      title={name}
    >
      {initials}
    </div>
  )
}

export function UserAvatarGroup({
  users,
  max = 3,
}: {
  users: { id: string; name: string; avatarColor: string }[]
  max?: number
}) {
  const visible = users.slice(0, max)
  const rest = users.length - max

  return (
    <div className="flex -space-x-1">
      {visible.map((user) => (
        <UserAvatar key={user.id} name={user.name} avatarColor={user.avatarColor} size="sm" className="ring-2 ring-white" />
      ))}
      {rest > 0 && (
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 ring-2 ring-white">
          +{rest}
        </div>
      )}
    </div>
  )
}
