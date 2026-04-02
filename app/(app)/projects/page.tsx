'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Plus, AlertTriangle, Trash2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  status: string
  startDate: string | null
  endDate: string | null
  progress: number
  memberCount: number
  owner: { id: string; name: string; avatarColor: string }
  bizPm: { id: string; name: string } | null
  _count: { issues: number }
  tasks: { devPl: { id: string; name: string } | null }[]
}

interface UserOption {
  id: string
  name: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [bizPmUsers, setBizPmUsers] = useState<UserOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#6366f1',
    status: 'ACTIVE',
    startDate: '',
    endDate: '',
    bizPmId: '',
  })

  const fetchProjects = async () => {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data)
    setLoading(false)
  }

  const fetchBizPmUsers = async () => {
    const res = await fetch('/api/users')
    const data = await res.json()
    setBizPmUsers(data.filter((u: any) => u.position === '현업 PM'))
  }

  useEffect(() => { fetchProjects(); fetchBizPmUsers() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    setForm({ name: '', description: '', color: '#6366f1', status: 'ACTIVE', startDate: '', endDate: '', bizPmId: '' })
    fetchProjects()
  }

  const handleDelete = async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`"${projectName}" 프로젝트를 삭제하시겠습니까?\n과제, 이슈 등 모든 관련 데이터가 함께 삭제됩니다.`)) return
    setDeletingId(projectId)
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    setDeletingId(null)
    fetchProjects()
  }

  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#f97316']

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="프로젝트" />
      <main className="flex-1 p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">총 {projects.length}개 프로젝트</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> 프로젝트 추가
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h3 className="font-semibold text-gray-800 mb-4">새 프로젝트</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="프로젝트명"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="설명 (선택)"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">시작일</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">종료일</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">현업 PM</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    value={form.bizPmId} onChange={(e) => setForm({ ...form, bizPmId: e.target.value })}>
                    <option value="">선택 안 함</option>
                    {bizPmUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">색상</label>
                  <div className="flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-6 h-6 rounded-full border-2 ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm">취소</button>
                  <button type="submit"
                    className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">생성</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">로딩중...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <Link
                  href={`/projects/${project.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow block"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                        <h3 className="font-semibold text-gray-800 leading-tight truncate">{project.name}</h3>
                      </div>
                      {(() => {
                        const devPlNames = [...new Set(project.tasks.map(t => t.devPl?.name).filter(Boolean))]
                        const hasBizPm = !!project.bizPm
                        const hasDevPl = devPlNames.length > 0
                        if (!hasBizPm && !hasDevPl) return null
                        return (
                          <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                            {hasBizPm && <span><span className="text-gray-400">현업 PM :</span> {project.bizPm!.name}</span>}
                            {hasDevPl && <span><span className="text-gray-400">개발 PL :</span> {devPlNames.join(', ')}</span>}
                          </p>
                        )
                      })()}
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                  {project.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>진척율</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <ProgressBar value={project.progress} showLabel={false} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{project.tasks.length}개 과제</span>
                    {project._count.issues > 0 && (
                      <span className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="w-3 h-3" />
                        이슈 {project._count.issues}건
                      </span>
                    )}
                  </div>
                  {(project.startDate || project.endDate || project.memberCount > 0) && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between gap-2">
                      <span>{formatDate(project.startDate)} ~ {formatDate(project.endDate)}</span>
                      {project.memberCount > 0 && (
                        <span className="text-indigo-500 font-medium flex-shrink-0">
                          총 {project.memberCount}명 투입 중
                        </span>
                      )}
                    </div>
                  )}
                </Link>

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => handleDelete(e, project.id, project.name)}
                  disabled={deletingId === project.id}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="프로젝트 삭제"
                >
                  {deletingId === project.id
                    ? <span className="text-xs text-gray-400">삭제중...</span>
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
