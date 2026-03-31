'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDate } from '@/lib/utils'
import { Plus, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: string
  avatarColor: string
  createdAt: string
  projectMembers?: { projectId: string }[]
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
  avatarColor: string
  projectIds: string[]
  taskIds: string[]
}

const DEFAULT_FORM: FormState = {
  name: '', email: '', password: '', role: 'MEMBER',
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
    setForm({ ...form, taskIds: form.taskIds.includes(taskId) ? form.taskIds.filter(id => id !== taskId) : [...form.taskIds, taskId] })
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{user.name}</h3>
                        {user.role === 'ADMIN' && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">관리자</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-4 pr-5">
                      {/* 최종 마감일 */}
                      {(() => {
                        if (activeTasks.length === 0) {
                          return (
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-400">미투입</p>
                              <p className="text-xs text-gray-400">최종 투입일</p>
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
                  {activeTasks.length > 0 && (() => {
                    const isExpanded = expandedTaskUsers.has(user.id)
                    const visibleTasks = isExpanded ? activeTasks : activeTasks.slice(0, 4)
                    return (
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-500 font-medium mb-2">담당 과제</p>
                        <div className={isExpanded ? 'max-h-56 overflow-y-auto space-y-1.5 pr-1' : 'space-y-1.5'}>
                          {visibleTasks.map((a) => {
                            const isOverdue = a.task.dueDate && new Date(a.task.dueDate) < today
                            return (
                              <div key={a.task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.task.project.color }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-700 truncate">
                                    {a.task.parentTask
                                      ? `${a.task.project.name} - ${a.task.parentTask.title} - ${a.task.title}`
                                      : `${a.task.project.name} - ${a.task.title}`}
                                  </p>
                                </div>
                                {a.task.dueDate && (
                                  <p className={`text-xs flex-shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                    {isOverdue ? '지연' : formatDate(a.task.dueDate)}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {activeTasks.length > 4 && (
                          <button
                            onClick={() => toggleExpandedTasks(user.id)}
                            className="w-full text-xs text-indigo-500 hover:text-indigo-700 text-center py-1 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            {isExpanded ? '접기 ▲' : `+${activeTasks.length - 4}개 더 있음 ▼`}
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
