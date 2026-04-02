'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDate } from '@/lib/utils'
import { Plus, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

const POSITION_OPTIONS = [
  { value: '', label: '선택 안 함' },
  { value: '프로젝트 PM', label: '프로젝트 PM' },
  { value: '현업 PM',    label: '현업 PM' },
  { value: '개발 PL',   label: '개발 PL' },
  { value: '개발자',    label: '개발자' },
  { value: '디자이너',  label: '디자이너' },
  { value: '퍼블',      label: '퍼블' },
  { value: '기획',      label: '기획' },
  { value: 'SM개발',    label: 'SM개발' },
]

const POSITION_COLORS: Record<string, string> = {
  '프로젝트 PM': 'bg-indigo-100 text-indigo-700',
  '현업 PM':    'bg-blue-100 text-blue-700',
  '개발 PL':   'bg-violet-100 text-violet-700',
  '개발자':    'bg-green-100 text-green-700',
  '디자이너':  'bg-pink-100 text-pink-700',
  '퍼블':      'bg-orange-100 text-orange-700',
  '기획':      'bg-amber-100 text-amber-700',
  'SM개발':    'bg-teal-100 text-teal-700',
}

interface User {
  id: string
  name: string
  email: string
  role: string
  position: string
  avatarColor: string
  createdAt: string
  projectMembers?: { projectId: string; project: { id: string; name: string; color: string } }[]
  taskAssignments?: {
    task: {
      id: string
      title: string
      status: string
      dueDate: string | null
      parentTaskId: string | null
      parentTask: { title: string } | null
      project: { name: string; color: string }
    }
  }[]
}

interface ProjectTask {
  id: string
  title: string
  status: string
  parentTaskId: string | null
}

interface Project {
  id: string
  name: string
  color: string
  tasks: ProjectTask[]
}

const PHASE_ORDER = ['분석', '설계', '구현', '테스트', '이행', '안정화']

const AVATAR_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#8b5cf6', '#f97316', '#ec4899',
]

type FormState = {
  name: string
  email: string
  password: string
  role: string
  position: string
  avatarColor: string
  projectIds: string[]
  taskIds: string[]
}

const DEFAULT_FORM: FormState = {
  name: '', email: '', password: '', role: 'MEMBER', position: '',
  avatarColor: '#6366f1', projectIds: [], taskIds: [],
}

// 프로젝트+과제 선택 UI (등록/수정 공용)
function ProjectTaskSelector({
  projects,
  projectIds,
  taskIds,
  expandedProjects,
  onToggleProject,
  onToggleTask,
  onToggleExpand,
}: {
  projects: Project[]
  projectIds: string[]
  taskIds: string[]
  expandedProjects: Set<string>
  onToggleProject: (id: string) => void
  onToggleTask: (id: string) => void
  onToggleExpand: (id: string) => void
}) {
  if (projects.length === 0) return <p className="text-xs text-gray-400">등록된 프로젝트가 없습니다.</p>

  return (
    <>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
        {projects.map((project) => {
          const isSelected = projectIds.includes(project.id)
          const isExpanded = expandedProjects.has(project.id)
          return (
            <div key={project.id}>
              <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50">
                <input
                  type="checkbox"
                  id={`proj-${project.id}`}
                  checked={isSelected}
                  onChange={() => onToggleProject(project.id)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                <label htmlFor={`proj-${project.id}`} className="flex-1 text-sm font-medium text-gray-700 cursor-pointer">
                  {project.name}
                </label>
                {project.tasks.length > 0 && (
                  <button type="button" onClick={() => onToggleExpand(project.id)} className="p-0.5 text-gray-400 hover:text-gray-600">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {isSelected && isExpanded && project.tasks.length > 0 && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {project.tasks.map((task) => (
                    <div key={task.id} className={cn(
                      'flex items-center gap-2 px-3 py-2 hover:bg-gray-100',
                      task.parentTaskId ? 'pl-12' : 'pl-8'
                    )}>
                      <input
                        type="checkbox"
                        id={`task-${task.id}`}
                        checked={taskIds.includes(task.id)}
                        onChange={() => onToggleTask(task.id)}
                        className="w-3.5 h-3.5 rounded accent-indigo-600"
                      />
                      <label htmlFor={`task-${task.id}`} className="text-xs cursor-pointer flex-1 flex items-center gap-1">
                        {task.parentTaskId && <span className="text-gray-300">└</span>}
                        <span className={task.parentTaskId ? 'text-gray-500' : 'text-gray-700 font-medium'}>{task.title}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {(projectIds.length > 0 || taskIds.length > 0) && (
        <p className="text-xs text-indigo-600 mt-1">프로젝트 {projectIds.length}개, 과제 {taskIds.length}개 선택됨</p>
      )}
    </>
  )
}

// 등록/수정 공용 모달
function UserFormModal({
  title,
  form,
  setForm,
  projects,
  expandedProjects,
  setExpandedProjects,
  error,
  onSubmit,
  onClose,
  isEdit,
}: {
  title: string
  form: FormState
  setForm: (f: FormState) => void
  projects: Project[]
  expandedProjects: Set<string>
  setExpandedProjects: (s: Set<string>) => void
  error: string
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  isEdit: boolean
}) {
  const toggleProject = (projectId: string) => {
    const selected = form.projectIds.includes(projectId)
    if (selected) {
      const projectTaskIds = projects.find(p => p.id === projectId)?.tasks.map(t => t.id) ?? []
      setForm({ ...form, projectIds: form.projectIds.filter(id => id !== projectId), taskIds: form.taskIds.filter(id => !projectTaskIds.includes(id)) })
    } else {
      setForm({ ...form, projectIds: [...form.projectIds, projectId] })
      setExpandedProjects(new Set([...expandedProjects, projectId]))
    }
  }

  const toggleTask = (taskId: string) => {
    // 클릭한 과제가 부모 과제(parentTaskId === null)인 경우 하위과제도 함께 선택/해제
    const ownerProject = projects.find(p => p.tasks.some(t => t.id === taskId))
    const clickedTask = ownerProject?.tasks.find(t => t.id === taskId)
    const subTaskIds = clickedTask?.parentTaskId === null
      ? (ownerProject?.tasks.filter(t => t.parentTaskId === taskId).map(t => t.id) ?? [])
      : []
    const allIds = [taskId, ...subTaskIds]

    if (form.taskIds.includes(taskId)) {
      setForm({ ...form, taskIds: form.taskIds.filter(id => !allIds.includes(id)) })
    } else {
      setForm({ ...form, taskIds: [...new Set([...form.taskIds, ...allIds])] })
    }
  }

  const toggleExpand = (projectId: string) => {
    const next = new Set(expandedProjects)
    next.has(projectId) ? next.delete(projectId) : next.add(projectId)
    setExpandedProjects(next)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-gray-800 text-lg mb-5">{title}</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="홍길동" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="hong@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEdit ? '비밀번호 변경 (비워두면 유지)' : '초기 비밀번호'}
            </label>
            <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={isEdit ? '변경할 경우에만 입력' : '6자 이상'}
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              required={!isEdit} minLength={form.password ? 6 : undefined} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">권한</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="MEMBER">팀원</option>
              <option value="ADMIN">관리자</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
              {POSITION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">아바타 색상</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setForm({ ...form, avatarColor: color })}
                  className={cn('w-8 h-8 rounded-full border-2 transition-transform',
                    form.avatarColor === color ? 'border-gray-800 scale-110' : 'border-transparent')}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <UserAvatar name={form.name || '미리보기'} avatarColor={form.avatarColor} size="md" />
              <span className="text-xs text-gray-500">미리보기</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로젝트 및 과제 배정
              <span className="ml-1 text-xs text-gray-400 font-normal">(선택사항)</span>
            </label>
            <ProjectTaskSelector
              projects={projects}
              projectIds={form.projectIds}
              taskIds={form.taskIds}
              expandedProjects={expandedProjects}
              onToggleProject={toggleProject}
              onToggleTask={toggleTask}
              onToggleExpand={toggleExpand}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50">취소</button>
            <button type="submit"
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">
              {isEdit ? '저장' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTaskUsers, setExpandedTaskUsers] = useState<Set<string>>(new Set())
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const toggleExpandedTasks = (userId: string) => {
    setExpandedTaskUsers((prev) => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    setUsers(await res.json())
    setLoading(false)
  }

  const fetchProjects = async () => {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data.map((p: any) => {
      const sorted: ProjectTask[] = []
      // 과제 → 하위 과제 순서로 정렬 (상태 무관하게 전체 표시)
      for (const t of p.tasks) {
        sorted.push({ id: t.id, title: t.title, status: t.status, parentTaskId: null })
        const subs = (t.subTasks ?? []).slice().sort((a: any, b: any) => {
          const ai = PHASE_ORDER.indexOf(a.title)
          const bi = PHASE_ORDER.indexOf(b.title)
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
        })
        for (const s of subs) {
          sorted.push({ id: s.id, title: s.title, status: s.status, parentTaskId: t.id })
        }
      }
      return { id: p.id, name: p.name, color: p.color, tasks: sorted }
    }))
  }

  useEffect(() => {
    fetchUsers()
    fetchProjects()
  }, [])

  // 더블클릭 → 편집 모달 오픈
  const handleDoubleClick = (user: User) => {
    setEditingUser(user)
    // 현재 담당 과제 ID 목록
    const currentTaskIds = (user.taskAssignments ?? []).map(a => a.task.id)
    // 현재 소속 프로젝트 ID 목록
    const currentProjectIds = (user.projectMembers ?? []).map(m => m.projectId)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      position: user.position ?? '',
      avatarColor: user.avatarColor,
      projectIds: currentProjectIds,
      taskIds: currentTaskIds,
    })
    // 현재 배정된 프로젝트는 기본 펼침
    setExpandedProjects(new Set(currentProjectIds))
    setError('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? '오류가 발생했습니다.'); return }
    closeModal()
    fetchUsers()
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch(`/api/users/${editingUser!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? '오류가 발생했습니다.'); return }
    closeModal()
    fetchUsers()
  }

  const closeModal = () => {
    setShowForm(false)
    setEditingUser(null)
    setForm(DEFAULT_FORM)
    setExpandedProjects(new Set())
    setError('')
  }

  const today = new Date()

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="팀원" />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">총 {users.length}명의 팀원 <span className="text-gray-400 text-xs ml-1">· 카드를 더블클릭하면 수정할 수 있습니다</span></p>
          <button onClick={() => { setShowForm(true); setError('') }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> 팀원 등록
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">로딩중...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {users.map((user) => {
              const activeTasks = user.taskAssignments ?? []
              const overdueTasks = activeTasks.filter(a => a.task.dueDate && new Date(a.task.dueDate) < today)
              return (
                <div
                  key={user.id}
                  onDoubleClick={() => handleDoubleClick(user)}
                  className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer select-none hover:border-indigo-300 hover:shadow-sm transition-all group relative"
                  title="더블클릭하여 수정"
                >
                  {/* 수정 힌트 아이콘 */}
                  <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400 absolute top-4 right-4 transition-colors" />

                  <div className="flex items-center gap-3 mb-4">
                    <UserAvatar name={user.name} avatarColor={user.avatarColor} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800">{user.name}</h3>
                        {user.position && (
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', POSITION_COLORS[user.position] ?? 'bg-gray-100 text-gray-600')}>
                            {user.position}
                          </span>
                        )}
                        {user.role === 'ADMIN' && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">관리자</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-4 pr-5">
                      {/* 최종 마감일 */}
                      {(() => {
                        const hasProjects = (user.projectMembers ?? []).length > 0
                        if (activeTasks.length === 0) {
                          return (
                            <div className="text-right">
                              <p className={`text-sm font-medium ${hasProjects ? 'text-indigo-500' : 'text-gray-400'}`}>
                                {hasProjects ? '투입' : '미투입'}
                              </p>
                              <p className="text-xs text-gray-400">투입 상태</p>
                            </div>
                          )
                        }
                        const dueDates = activeTasks
                          .map(a => a.task.dueDate)
                          .filter(Boolean)
                          .map(d => new Date(d!))
                        const latestDate = dueDates.length > 0
                          ? new Date(Math.max(...dueDates.map(d => d.getTime())))
                          : null
                        const isOverdue = latestDate && latestDate < today
                        return (
                          <div className="text-right">
                            <p className={`text-sm font-medium ${isOverdue ? 'text-red-500' : 'text-gray-900'}`}>
                              {latestDate ? formatDate(latestDate.toISOString()) : '-'}
                            </p>
                            <p className="text-xs text-gray-500">최종 투입일</p>
                          </div>
                        )
                      })()}
                      <div className="w-px h-8 bg-gray-200" />
                      {/* 진행중 과제 */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{activeTasks.length}</p>
                        <p className="text-xs text-gray-500">진행중 과제</p>
                        {overdueTasks.length > 0 && (
                          <p className="text-xs text-red-500 font-medium">{overdueTasks.length}개 지연</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* 현업PM · SM개발: 프로젝트 목록 표시 */}
                  {['현업 PM', 'SM개발'].includes(user.position) && (user.projectMembers ?? []).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs text-gray-400 font-medium">투입 프로젝트</p>
                      {(user.projectMembers ?? []).map((pm) => (
                        <div key={pm.projectId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pm.project.color }} />
                          <span className="text-xs font-medium text-gray-700">{pm.project.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 일반 역할: 과제 목록 표시 */}
                  {!['현업 PM', 'SM개발'].includes(user.position) && activeTasks.length > 0 && (() => {
                    const isExpanded = expandedTaskUsers.has(user.id)

                    // 프로젝트 → 과제 → 상세과제 계층 구조 빌드
                    const projectMap = new Map<string, {
                      color: string
                      parentMap: Map<string, { subtasks: Array<{ id: string; title: string; dueDate: string | null }> }>
                    }>()
                    for (const a of activeTasks) {
                      const projName = a.task.project.name
                      if (!projectMap.has(projName)) {
                        projectMap.set(projName, { color: a.task.project.color, parentMap: new Map() })
                      }
                      const proj = projectMap.get(projName)!
                      if (a.task.parentTaskId && a.task.parentTask) {
                        const parentTitle = a.task.parentTask.title
                        if (!proj.parentMap.has(parentTitle)) {
                          proj.parentMap.set(parentTitle, { subtasks: [] })
                        }
                        proj.parentMap.get(parentTitle)!.subtasks.push({ id: a.task.id, title: a.task.title, dueDate: a.task.dueDate })
                      } else {
                        if (!proj.parentMap.has(a.task.title)) {
                          proj.parentMap.set(a.task.title, { subtasks: [] })
                        }
                      }
                    }

                    const projectEntries = Array.from(projectMap.entries())

                    return (
                      <div className="space-y-2 mt-3">
                        <p className="text-xs text-gray-400 font-medium">담당 과제</p>
                        <div className={isExpanded ? 'max-h-64 overflow-y-auto pr-0.5 space-y-2' : 'max-h-40 overflow-hidden space-y-2'}>
                          {projectEntries.map(([projName, proj]) => {
                            const parentEntries = Array.from(proj.parentMap.entries())
                            return (
                              /* 프로젝트 박스: 왼쪽 컬러 바 + 테두리 + 그림자 */
                              <div key={projName} className="rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ borderLeftColor: proj.color, borderLeftWidth: 4 }}>

                                {/* 1단계: 프로젝트 헤더 */}
                                <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: proj.color + '14' }}>
                                  <span className="text-xs font-bold truncate" style={{ color: proj.color }}>{projName}</span>
                                </div>

                                {/* 2단계: 과제 목록 */}
                                <div className="bg-white divide-y divide-gray-100">
                                  {parentEntries.map(([parentTitle, group]) => (
                                    <div key={parentTitle} className="px-3 pt-2 pb-1.5">

                                      {/* 과제명 */}
                                      <span className="text-xs font-semibold text-gray-700">{parentTitle}</span>

                                      {/* 3단계: 상세과제 — 들여쓰기 박스 */}
                                      {group.subtasks.length > 0 && (
                                        <div className="mt-1.5 ml-2 rounded-md bg-gray-50 border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                                          {group.subtasks.map((sub) => {
                                            const isOverdue = sub.dueDate && new Date(sub.dueDate) < today
                                            return (
                                              <div key={sub.id} className="flex items-center justify-between gap-2 px-2.5 py-1">
                                                <span className="text-[11px] text-gray-400 truncate">{sub.title}</span>
                                                {sub.dueDate && (
                                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                                                    isOverdue ? 'bg-red-100 text-red-500' : 'bg-white text-gray-400 border border-gray-200'
                                                  }`}>
                                                    {isOverdue ? '지연' : formatDate(sub.dueDate)}
                                                  </span>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {activeTasks.length > 3 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpandedTasks(user.id) }}
                            className="w-full text-xs text-gray-400 hover:text-indigo-500 text-center py-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            {isExpanded ? '접기 ▲' : '더 보기 ▼'}
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 팀원 등록 모달 */}
      {showForm && (
        <UserFormModal
          title="팀원 등록"
          form={form}
          setForm={setForm}
          projects={projects}
          expandedProjects={expandedProjects}
          setExpandedProjects={setExpandedProjects}
          error={error}
          onSubmit={handleCreate}
          onClose={closeModal}
          isEdit={false}
        />
      )}

      {/* 팀원 수정 모달 */}
      {editingUser && (
        <UserFormModal
          title={`${editingUser.name} 수정`}
          form={form}
          setForm={setForm}
          projects={projects}
          expandedProjects={expandedProjects}
          setExpandedProjects={setExpandedProjects}
          error={error}
          onSubmit={handleUpdate}
          onClose={closeModal}
          isEdit={true}
        />
      )}
    </div>
  )
}
