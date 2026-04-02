'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { StatusBadge, SeverityBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDate, STATUS_LABELS, SEVERITY_LABELS, PRIORITY_LABELS } from '@/lib/utils'
import { Plus, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Issue {
  id: string
  title: string
  description: string | null
  type: string
  severity: string
  status: string
  createdAt: string
  project: { id: string; name: string; color: string }
  reporter: { id: string; name: string; avatarColor: string }
  assignee: { id: string; name: string; avatarColor: string } | null
  task: { id: string; title: string } | null
}

const COLUMNS = [
  { id: 'OPEN', label: '오픈', color: 'bg-red-50 border-red-200' },
  { id: 'IN_PROGRESS', label: '진행중', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'RESOLVED', label: '해결됨', color: 'bg-green-50 border-green-200' },
  { id: 'CLOSED', label: '종료', color: 'bg-gray-50 border-gray-200' },
]

const TYPE_BADGE: Record<string, string> = {
  ISSUE: 'bg-red-100 text-red-700',
  RISK: 'bg-orange-100 text-orange-700',
}
const TYPE_LABEL: Record<string, string> = {
  ISSUE: '이슈',
  RISK: '리스크',
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [filter, setFilter] = useState({ projectId: '', severity: '' })
  const [formType, setFormType] = useState<'ISSUE' | 'RISK'>('ISSUE')
  const [form, setForm] = useState({
    title: '', description: '', severity: 'MEDIUM', projectId: '', assigneeId: '',
  })

  const fetchIssues = async () => {
    const params = new URLSearchParams()
    if (filter.projectId) params.set('projectId', filter.projectId)
    if (filter.severity) params.set('severity', filter.severity)
    const res = await fetch(`/api/issues?${params}`)
    setIssues(await res.json())
  }

  useEffect(() => {
    fetchIssues()
    fetch('/api/projects').then((r) => r.json()).then(setProjects)
    fetch('/api/users').then((r) => r.json()).then(setUsers)
  }, [filter])

  const openForm = (type: 'ISSUE' | 'RISK') => {
    setFormType(type)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, type: formType }),
    })
    setShowForm(false)
    setForm({ title: '', description: '', severity: 'MEDIUM', projectId: '', assigneeId: '' })
    fetchIssues()
  }

  const handleStatusChange = async (issue: Issue, status: string) => {
    await fetch(`/api/issues/${issue.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...issue, status }),
    })
    fetchIssues()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch(`/api/issues/${id}`, { method: 'DELETE' })
    setSelectedIssue(null)
    fetchIssues()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="이슈/리스크 관리" />
      <main className="flex-1 p-4 md:p-6">
        {/* 필터 & 추가 */}
        <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={filter.projectId}
              onChange={(e) => setFilter({ ...filter, projectId: e.target.value })}
            >
              <option value="">전체 프로젝트</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            >
              <option value="">전체 심각도</option>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openForm('ISSUE')}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600"
            >
              <Plus className="w-4 h-4" /> 이슈 등록
            </button>
            <button
              onClick={() => openForm('RISK')}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" /> 리스크 등록
            </button>
          </div>
        </div>

        {/* 칸반 보드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colIssues = issues.filter((i) => i.status === col.id)
            return (
              <div key={col.id} className={cn('rounded-xl border p-3', col.color)}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700 text-sm">{col.label}</h3>
                  <span className="bg-white rounded-full px-2 py-0.5 text-xs font-medium text-gray-600 border">
                    {colIssues.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colIssues.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="bg-white rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-sm font-medium text-gray-800 leading-tight">{issue.title}</p>
                        <SeverityBadge severity={issue.severity} />
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', TYPE_BADGE[issue.type] ?? 'bg-gray-100 text-gray-600')}>
                          {TYPE_LABEL[issue.type] ?? issue.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: issue.project.color }} />
                        <span className="text-xs text-gray-500 flex-1 truncate">{issue.project.name}</span>
                        {issue.assignee && (
                          <UserAvatar name={issue.assignee.name} avatarColor={issue.assignee.avatarColor} size="sm" />
                        )}
                      </div>
                    </div>
                  ))}
                  {colIssues.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">없음</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 등록 모달 */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                {formType === 'ISSUE' ? '이슈 등록' : '리스크 등록'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  required
                >
                  <option value="">프로젝트 선택</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={formType === 'ISSUE' ? '이슈 제목' : '리스크 제목'}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="설명 (선택)"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">심각도</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                        <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">담당자</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                      <option value="">미배정</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm">취소</button>
                  <button type="submit"
                    className={cn('flex-1 text-white rounded-lg py-2 text-sm font-medium', formType === 'ISSUE' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600')}>등록</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 상세 모달 */}
        {selectedIssue && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-800 text-lg">{selectedIssue.title}</h3>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', TYPE_BADGE[selectedIssue.type] ?? 'bg-gray-100 text-gray-600')}>
                    {TYPE_LABEL[selectedIssue.type] ?? selectedIssue.type}
                  </span>
                </div>
                <button onClick={() => setSelectedIssue(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <SeverityBadge severity={selectedIssue.severity} />
                  <StatusBadge status={selectedIssue.status} />
                </div>
                {selectedIssue.description && (
                  <p className="text-sm text-gray-600">{selectedIssue.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">프로젝트: </span>
                    <span className="font-medium">{selectedIssue.project.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">등록일: </span>
                    <span className="font-medium">{formatDate(selectedIssue.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">등록자: </span>
                    <UserAvatar name={selectedIssue.reporter.name} avatarColor={selectedIssue.reporter.avatarColor} size="sm" />
                    <span className="font-medium">{selectedIssue.reporter.name}</span>
                  </div>
                  {selectedIssue.assignee && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">담당자: </span>
                      <UserAvatar name={selectedIssue.assignee.name} avatarColor={selectedIssue.assignee.avatarColor} size="sm" />
                      <span className="font-medium">{selectedIssue.assignee.name}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">상태 변경</label>
                  <div className="flex flex-wrap gap-2">
                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                      <button
                        key={s}
                        onClick={() => { handleStatusChange(selectedIssue, s); setSelectedIssue({ ...selectedIssue, status: s }) }}
                        className={cn('px-3 py-1 rounded-full text-xs border transition-colors',
                          selectedIssue.status === s
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'text-gray-600 border-gray-300 hover:border-indigo-300')}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => handleDelete(selectedIssue.id)}
                  className="px-4 py-2 text-red-500 border border-red-200 rounded-lg text-sm hover:bg-red-50"
                >
                  삭제
                </button>
                <button onClick={() => setSelectedIssue(null)}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium">닫기</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
