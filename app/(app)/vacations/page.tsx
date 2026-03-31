'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDate, VACATION_TYPE_LABELS } from '@/lib/utils'
import { Plus, Users, CalendarDays } from 'lucide-react'

interface Vacation {
  id: string
  startDate: string
  endDate: string
  type: string
  status: string
  note: string | null
  startTime: string | null
  endTime: string | null
  user: { id: string; name: string; avatarColor: string }
}

interface UserInfo {
  id: string
  name: string
  avatarColor: string
}

interface UserSummary extends UserInfo {
  vacations: Vacation[]
  approvedDays: number
  pendingDays: number
  byType: Record<string, number>
}

function calcDays(v: Vacation): number {
  if (v.type === 'HALF_DAY') return 0.5
  const start = new Date(v.startDate)
  const end = new Date(v.endDate)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function buildSummaries(users: UserInfo[], vacations: Vacation[]): UserSummary[] {
  return users.map((user) => {
    const uvs = vacations.filter((v) => v.user.id === user.id)
    const approved = uvs.filter((v) => v.status === 'APPROVED')
    const pending = uvs.filter((v) => v.status === 'PENDING')

    const approvedDays = approved.reduce((sum, v) => sum + calcDays(v), 0)
    const pendingDays = pending.reduce((sum, v) => sum + calcDays(v), 0)

    const byType: Record<string, number> = {}
    for (const v of approved) {
      byType[v.type] = (byType[v.type] ?? 0) + calcDays(v)
    }

    return { ...user, vacations: uvs, approvedDays, pendingDays, byType }
  })
}

// 팀원별 상세 모달
function UserDetailModal({ summary, onClose }: { summary: UserSummary; onClose: () => void }) {
  const sorted = [...summary.vacations].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )

  const typeColors: Record<string, string> = {
    ANNUAL: 'bg-indigo-100 text-indigo-700',
    SICK: 'bg-red-100 text-red-700',
    HALF_DAY: 'bg-amber-100 text-amber-700',
    REMOTE: 'bg-green-100 text-green-700',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <UserAvatar name={summary.name} avatarColor={summary.avatarColor} size="lg" />
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{summary.name}</h3>
              <p className="text-sm text-gray-500">휴가 사용 내역</p>
            </div>
          </div>
          {/* 요약 칩 */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-lg px-3 py-1.5">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm font-semibold">승인 {summary.approvedDays}일</span>
            </div>
            {summary.pendingDays > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 rounded-lg px-3 py-1.5">
                <span className="text-sm font-semibold">대기 {summary.pendingDays}일</span>
              </div>
            )}
            {Object.entries(summary.byType).map(([type, days]) => (
              <div key={type} className={`text-xs rounded-lg px-2.5 py-1.5 font-medium ${typeColors[type] ?? 'bg-gray-100 text-gray-600'}`}>
                {VACATION_TYPE_LABELS[type] ?? type} {days}일
              </div>
            ))}
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">휴가 신청 내역이 없습니다</p>
          ) : (
            sorted.map((v) => {
              const days = calcDays(v)
              return (
                <div key={v.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[v.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {VACATION_TYPE_LABELS[v.type] ?? v.type}
                      </span>
                      <StatusBadge status={v.status} />
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {formatDate(v.startDate)}
                      {v.startDate !== v.endDate && ` ~ ${formatDate(v.endDate)}`}
                    </p>
                    {v.note && <p className="text-xs text-gray-400 mt-0.5">{v.note}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-800">{days}일</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

// 팀원별 현황 탭
function TeamSummaryTab({ summaries }: { summaries: UserSummary[] }) {
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)

  return (
    <>
      <p className="text-xs text-gray-400 mb-3">카드를 더블클릭하면 상세 내역을 확인할 수 있습니다</p>
      <div className="grid md:grid-cols-2 gap-3">
        {summaries.map((s) => (
          <div
            key={s.id}
            onDoubleClick={() => setSelectedUser(s)}
            className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer select-none hover:border-indigo-300 hover:shadow-sm transition-all group"
            title="더블클릭으로 상세보기"
          >
            <div className="flex items-center gap-3 mb-3">
              <UserAvatar name={s.name} avatarColor={s.avatarColor} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{s.name}</p>
                <p className="text-xs text-gray-400">{s.vacations.length}건 신청</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-600">{s.approvedDays}</p>
                <p className="text-xs text-gray-500">사용일수</p>
              </div>
            </div>

            {/* 유형별 세부 */}
            {Object.keys(s.byType).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(s.byType).map(([type, days]) => (
                  <span key={type} className="text-xs bg-indigo-50 text-indigo-600 rounded-md px-2 py-0.5 font-medium">
                    {VACATION_TYPE_LABELS[type] ?? type} {days}일
                  </span>
                ))}
                {s.pendingDays > 0 && (
                  <span className="text-xs bg-amber-50 text-amber-600 rounded-md px-2 py-0.5 font-medium">
                    대기중 {s.pendingDays}일
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-300">사용 내역 없음</p>
            )}
          </div>
        ))}
      </div>

      {selectedUser && (
        <UserDetailModal summary={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </>
  )
}

export default function VacationsPage() {
  const { data: session } = useSession()
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'all' | 'mine' | 'summary'>('all')
  const [form, setForm] = useState({ startDate: '', endDate: '', type: 'ANNUAL', note: '', targetUserId: '', startTime: '09:00', endTime: '18:00' })
  const [formError, setFormError] = useState('')

  const fetchVacations = async () => {
    const res = await fetch('/api/vacations')
    setVacations(await res.json())
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data.map((u: any) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor })))
  }

  useEffect(() => {
    fetchVacations()
    fetchUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const res = await fetch('/api/vacations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, userId: form.targetUserId || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setFormError(data.error ?? '오류가 발생했습니다.'); return }
    setShowForm(false)
    setFormError('')
    setForm({ startDate: '', endDate: '', type: 'ANNUAL', note: '', targetUserId: '', startTime: '09:00', endTime: '18:00' })
    fetchVacations()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('휴가를 삭제하시겠습니까?')) return
    await fetch(`/api/vacations/${id}`, { method: 'DELETE' })
    fetchVacations()
  }

  const isAdmin = (session?.user as any)?.role === 'ADMIN'
  const userId = session?.user?.id

  const filteredVacations = tab === 'mine'
    ? vacations.filter((v) => v.user.id === userId)
    : vacations

  const summaries = buildSummaries(users, vacations)

  const TABS = [
    { key: 'all', label: '전체 일정' },
    { key: 'mine', label: '내 신청' },
    { key: 'summary', label: <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />팀원별 현황</span> },
  ] as const

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="휴가 관리" />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> 휴가 등록
          </button>
        </div>

        {/* 팀원별 현황 탭 */}
        {tab === 'summary' && <TeamSummaryTab summaries={summaries} />}

        {/* 전체/내 신청 탭 */}
        {tab !== 'summary' && (
          <>

            {/* 휴가 목록 */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="divide-y divide-gray-100">
                {filteredVacations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12">휴가 신청 내역이 없습니다</p>
                ) : (
                  filteredVacations.map((v) => (
                    <div key={v.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                      <UserAvatar name={v.user.name} avatarColor={v.user.avatarColor} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-800">{v.user.name}</p>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                            {VACATION_TYPE_LABELS[v.type]}
                          </span>
                          <StatusBadge status={v.status} />
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatDate(v.startDate)} ~ {formatDate(v.endDate)}
                          <span className="ml-1 text-gray-400">({calcDays(v)}일)</span>
                        </p>
                        {v.type === 'HALF_DAY' && v.startTime && v.endTime && (
                          <p className="text-xs text-amber-600 mt-0.5">{v.startTime} ~ {v.endTime}</p>
                        )}
                        {v.note && <p className="text-xs text-gray-400 mt-0.5">{v.note}</p>}
                      </div>
                      {(v.user.id === userId || isAdmin) && (
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* 휴가 등록 모달 */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h3 className="font-semibold text-gray-800 mb-4">휴가 등록</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                {isAdmin && (
                  <div>
                    <label className="text-xs text-gray-500">대상 팀원</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      value={form.targetUserId} onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}>
                      <option value="">내 휴가</option>
                      {users.filter((u) => u.id !== userId).map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500">휴가 종류</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {Object.entries(VACATION_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">시작일</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.type === 'HALF_DAY' ? e.target.value : form.endDate })} required />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">종료일</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      value={form.type === 'HALF_DAY' ? form.startDate : form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      disabled={form.type === 'HALF_DAY'}
                      required />
                  </div>
                </div>
                {/* 반차 시간 선택 */}
                {form.type === 'HALF_DAY' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-700">반차 시간 선택</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">시작 시간</label>
                        <select className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm mt-1 bg-white"
                          value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}>
                          {Array.from({ length: 25 }, (_, i) => {
                            const h = Math.floor(i / 2) + 8
                            const m = i % 2 === 0 ? '00' : '30'
                            if (h > 19) return null
                            const val = `${String(h).padStart(2, '0')}:${m}`
                            return <option key={val} value={val}>{val}</option>
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">종료 시간</label>
                        <select className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm mt-1 bg-white"
                          value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}>
                          {Array.from({ length: 25 }, (_, i) => {
                            const h = Math.floor(i / 2) + 8
                            const m = i % 2 === 0 ? '00' : '30'
                            if (h > 20) return null
                            const val = `${String(h).padStart(2, '0')}:${m}`
                            return <option key={val} value={val}>{val}</option>
                          })}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-amber-600">
                      {form.startTime} ~ {form.endTime} ({(() => {
                        const [sh, sm] = form.startTime.split(':').map(Number)
                        const [eh, em] = form.endTime.split(':').map(Number)
                        const diff = (eh * 60 + em - sh * 60 - sm) / 60
                        return diff > 0 ? `${diff}시간` : '-'
                      })()})
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500">사유 (선택)</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="예: 개인 휴가"
                    value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-600">{formError}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setShowForm(false); setFormError('') }}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm">취소</button>
                  <button type="submit"
                    className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">등록</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
