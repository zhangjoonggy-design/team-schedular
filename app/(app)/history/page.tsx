'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'

interface ActivityLog {
  id: string
  action: string
  entity: string
  entityId: string
  entityName: string
  userId: string | null
  userName: string | null
  detail: string | null
  createdAt: string
}

const ENTITY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'PROJECT', label: '프로젝트' },
  { value: 'TASK', label: '과제' },
  { value: 'ISSUE', label: '이슈' },
  { value: 'VACATION', label: '휴가' },
  { value: 'USER', label: '팀원' },
]

const ACTION_LABELS: Record<string, string> = {
  CREATE: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
}

const ENTITY_LABELS: Record<string, string> = {
  PROJECT: '프로젝트',
  TASK: '과제',
  ISSUE: '이슈',
  VACATION: '휴가',
  USER: '팀원',
}

const ENTITY_COLORS: Record<string, string> = {
  PROJECT: 'bg-indigo-100 text-indigo-700',
  TASK: 'bg-purple-100 text-purple-700',
  ISSUE: 'bg-orange-100 text-orange-700',
  VACATION: 'bg-teal-100 text-teal-700',
  USER: 'bg-gray-100 text-gray-700',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export default function HistoryPage() {
  const defaultRange = getDefaultDateRange()
  const [entity, setEntity] = useState('')
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (entity) params.set('entity', entity)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const res = await fetch(`/api/history?${params}`)
    setLogs(await res.json())
    setLoading(false)
  }, [entity, startDate, endDate])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="변경 내역 조회" />
      <main className="flex-1 p-4 md:p-6 space-y-4">

        {/* 필터 영역 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* 구분 필터 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">구분</label>
              <div className="flex gap-1.5 flex-wrap">
                {ENTITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEntity(opt.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      entity === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 기간 필터 */}
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">시작일</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <span className="text-gray-400 mb-2">~</span>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">종료일</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 결과 영역 */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">
              변경 내역
              {!loading && <span className="ml-2 text-gray-400 font-normal">{logs.length}건</span>}
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">로딩중...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">조회된 내역이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="text-left px-4 py-2.5 font-medium">일시</th>
                    <th className="text-left px-4 py-2.5 font-medium">구분</th>
                    <th className="text-left px-4 py-2.5 font-medium">액션</th>
                    <th className="text-left px-4 py-2.5 font-medium">대상</th>
                    <th className="text-left px-4 py-2.5 font-medium">처리자</th>
                    <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    const detail = log.detail ? (() => { try { return JSON.parse(log.detail) } catch { return null } })() : null
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 text-sm">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ENTITY_COLORS[log.entity] ?? 'bg-gray-100 text-gray-600')}>
                            {ENTITY_LABELS[log.entity] ?? log.entity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600')}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium max-w-[200px] truncate">
                          {log.entityName}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {log.userName ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell max-w-[240px]">
                          {detail ? Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join(' · ') : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
