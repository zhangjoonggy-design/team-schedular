'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  showLabel?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, showLabel = true, className, size = 'md' }: ProgressBarProps) {
  const color =
    value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : value >= 20 ? 'bg-yellow-500' : 'bg-gray-300'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 bg-gray-200 rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-600 font-medium w-8 text-right">{value}%</span>
      )}
    </div>
  )
}
