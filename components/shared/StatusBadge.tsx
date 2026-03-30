'use client'

import { STATUS_LABELS, STATUS_COLORS, SEVERITY_LABELS, SEVERITY_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', SEVERITY_COLORS[severity] ?? 'bg-gray-100 text-gray-700')}>
      {SEVERITY_LABELS[severity] ?? severity}
    </span>
  )
}
