'use client'

import { useState, useEffect, use } from 'react'
import { Header } from '@/components/layout/Header'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { StatusBadge, SeverityBadge } from '@/components/shared/StatusBadge'
import { UserAvatarGroup } from '@/components/shared/UserAvatar'
import { formatDate, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  progressPercent: number
  startDate: string | null
  dueDate: string | null
  estimatedHours: number | null
  assignees: { user: { id: string; name: string; avatarColor: string } }[]
  subTasks: Task[]
  issues: any[]
}

interface Member {
  id: string
  name: string
  avatarColor: string
}

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  status: string
  startDate: string | null
  endDate: string | null
  owner: { id: string; name: string; avatarColor: string }
  members: { user: Member }[]
  tasks: Task[]
  issues: any[]
}

function TaskRow({
  task,
  level = 0,
  onUpdate,
  onAddSubtask,
  onDelete,
  onEdit,
}: {
  task: Task
  level?: number
  onUpdate: (id: string, data: any) => void
  onAddSubtask: (parentId: string) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progress, setProgress] = useState(task.progressPercent)

  const handleProgressSave = () => {
    onUpdate(task.id, { progressPercent: progress })
    setEditingProgress(false)
  }

  const handleStatusChange = (status: string) => {
    const newProgress = status === 'DONE' ? 100 : status === 'TODO' ? 0 : task.progressPercent
    onUpdate(task.id, { status, progressPercent: newProgress })
  }

  return (
    <>
      <tr className={cn('border-b border-gray-100 hover:bg-gray-50 group', level > 0 ? 'bg-gray-50/50' : '')}>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${level * 20}px` }}>
            {task.subTasks.length > 0 ? (
              <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 p-0.5">
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span
              className="text-sm text-gray-800 font-medium cursor-pointer hover:text-indigo-600"
              onDoubleClick={() => onEdit(task)}
              title="더블클릭하여 수정"
            >{task.title}</span>
            {task.issues.length > 0 && (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 ml-1" aria-label="이슈 있음" />
            )}
          </div>
        </td>
        <td className="py-2.5 px-3">
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs border-none bg-transparent cursor-pointer focus:outline-none"
          >
            {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'].map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </td>
        <td className="py-2.5 px-3 hidden md:table-cell">
          <span className={cn('text-xs font-medium', PRIORITY_COLORS[task.priority])}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </td>
        <td className="py-2.5 px-3">
          <UserAvatarGroup users={task.assignees.map((a) => a.user)} />
        </td>
        <td className="py-2.5 px-3 hidden md:table-cell">
          <span className="text-xs text-gray-500">{formatDate(task.dueDate)}</span>
        </td>
        <td className="py-2.5 px-3">
          {editingProgress ? (
            <div className="flex items-center gap-1">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-xs w-8">{progress}%</span>
              <button onClick={handleProgressSave} className="text-xs text-indigo-600">저장</button>
            </div>
          ) : (
            <button onClick={() => setEditingProgress(true)} className="w-full text-left">
              <ProgressBar value={task.progressPercent} size="sm" className="min-w-[80px]" />
            </button>
          )}
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {level === 0 && (
              <button
                onClick={() => onAddSubtask(task.id)}
                className="p-1 text-gray-400 hover:text-indigo-600"
                title="하위 과제 추가"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-400 hover:text-red-500"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && task.subTasks.map((sub) => (
        <TaskRow
          key={sub.id}
          task={sub}
          level={level + 1}
          onUpdate={onUpdate}
          onAddSubtask={onAddSubtask}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </>
  )
}

function AddTaskModal({
  projectId,
  parentTaskId,
  members,
  allUsers,
  onClose,
  onSave,
}: {
  projectId: string
  parentTaskId?: string
  members: Member[]
  allUsers: Member[]
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    title: '',
    status: 'TODO',
    priority: 'MEDIUM',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    assigneeIds: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        projectId,
        parentTaskId: parentTaskId ?? null,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
      }),
    })
    onSave()
    onClose()
  }

  const toggleAssignee = (userId: string) => {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(userId)
        ? f.assigneeIds.filter((id) => id !== userId)
        : [...f.assigneeIds, userId],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-gray-800 mb-4">
          {parentTaskId ? '하위 과제 추가' : '과제 추가'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="과제명"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">상태</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'].map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">우선순위</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">시작일</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">마감일</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">예상 작업시간 (h)</label>
            <input type="number" min={0} className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              placeholder="예: 8"
              value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">담당자</label>
            {allUsers.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                등록된 팀원이 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allUsers.map((u) => {
                  const selected = form.assigneeIds.includes(u.id)
                  const isProjectMember = members.some((m) => m.id === u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className={cn(
                        'flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs border transition-colors',
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
                      )}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: u.avatarColor }}
                      >
                        {u.name[0]}
                      </span>
                      {u.name}
                      {!isProjectMember && (
                        <span className={cn('text-[9px]', selected ? 'text-indigo-200' : 'text-gray-400')}>외부</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm">취소</button>
            <button type="submit"
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">추가</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditTaskModal({
  task,
  members,
  allUsers,
  onClose,
  onSave,
}: {
  task: Task
  members: Member[]
  allUsers: Member[]
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    title: task.title,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate ? task.startDate.slice(0, 10) : '',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    estimatedHours: task.estimatedHours != null ? String(task.estimatedHours) : '',
    assigneeIds: task.assignees.map((a) => a.user.id),
  })

  const toggleAssignee = (userId: string) => {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(userId)
        ? f.assigneeIds.filter((id) => id !== userId)
        : [...f.assigneeIds, userId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
      }),
    })
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-gray-800 mb-4">과제 수정</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="과제명"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">상태</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'].map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">우선순위</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">시작일</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">마감일</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">예상 작업시간 (h)</label>
            <input type="number" min={0} className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              placeholder="예: 8"
              value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">담당자</label>
            {allUsers.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">등록된 팀원이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allUsers.map((u) => {
                  const selected = form.assigneeIds.includes(u.id)
                  const isProjectMember = members.some((m) => m.id === u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleAssignee(u.id)}
                      className={cn(
                        'flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs border transition-colors',
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'
                      )}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: u.avatarColor }}
                      >
                        {u.name[0]}
                      </span>
                      {u.name}
                      {!isProjectMember && (
                        <span className={cn('text-[9px]', selected ? 'text-indigo-200' : 'text-gray-400')}>외부</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm">취소</button>
            <button type="submit"
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">저장</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [allUsers, setAllUsers] = useState<Member[]>([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'tasks' | 'issues'>('tasks')

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${id}`)
    if (!res.ok) {
      const errText = await res.text()
      console.error('프로젝트 로딩 실패:', res.status, errText)
      try { console.error('상세 에러:', JSON.parse(errText).detail) } catch {}
      return
    }
    setProject(await res.json())
  }

  useEffect(() => {
    fetchProject()
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => setAllUsers(data.map((u: any) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor }))))
      .catch(() => {})
  }, [id])

  const handleUpdateTask = async (taskId: string, data: any) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    fetchProject()
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('과제를 삭제하시겠습니까?')) return
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    fetchProject()
  }

  if (!project) return <div className="p-6 text-gray-400">로딩중...</div>

  const allTasks = [...project.tasks, ...project.tasks.flatMap((t) => t.subTasks)]
  const totalHours = allTasks.reduce((s, t) => s + (t.estimatedHours ?? 1), 0)
  const weightedProgress = allTasks.reduce((s, t) => s + t.progressPercent * (t.estimatedHours ?? 1), 0)
  const overallProgress = totalHours > 0 ? Math.round(weightedProgress / totalHours) : 0

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={project.name} />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* 프로젝트 헤더 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-sm text-gray-500 mt-1">{project.description}</p>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">전체 진척율</span>
              <span className="font-bold text-gray-900">{overallProgress}%</span>
            </div>
            <ProgressBar value={overallProgress} showLabel={false} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{project.tasks.length}</p>
              <p className="text-xs text-gray-500">총 과제</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">
                {allTasks.filter((t) => t.status === 'DONE').length}
              </p>
              <p className="text-xs text-gray-500">완료</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-500">
                {project.issues.filter((i) => i.status === 'OPEN').length}
              </p>
              <p className="text-xs text-gray-500">오픈 이슈</p>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('tasks')}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 'tasks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            과제 목록
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 'issues' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            이슈 ({project.issues.length})
          </button>
        </div>

        {activeTab === 'tasks' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">과제 목록</h2>
              <button
                onClick={() => { setAddingSubtaskTo(undefined); setShowAddTask(true) }}
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> 과제 추가
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 bg-gray-50">
                    <th className="text-left py-2.5 px-3 font-medium">과제명</th>
                    <th className="text-left py-2.5 px-3 font-medium">상태</th>
                    <th className="text-left py-2.5 px-3 font-medium hidden md:table-cell">우선순위</th>
                    <th className="text-left py-2.5 px-3 font-medium">담당자</th>
                    <th className="text-left py-2.5 px-3 font-medium hidden md:table-cell">마감일</th>
                    <th className="text-left py-2.5 px-3 font-medium">진척율</th>
                    <th className="py-2.5 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {project.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onUpdate={handleUpdateTask}
                      onAddSubtask={(parentId) => { setAddingSubtaskTo(parentId); setShowAddTask(true) }}
                      onDelete={handleDeleteTask}
                      onEdit={setEditingTask}
                    />
                  ))}
                </tbody>
              </table>
              {project.tasks.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">과제가 없습니다. 과제를 추가해보세요.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">이슈 목록</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {project.issues.map((issue) => (
                <div key={issue.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-800">{issue.title}</p>
                      {issue.description && (
                        <p className="text-sm text-gray-500 mt-1">{issue.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <SeverityBadge severity={issue.severity} />
                        <StatusBadge status={issue.status} />
                        {issue.task && <span className="text-xs text-gray-400">→ {issue.task.title}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {formatDate(issue.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {project.issues.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">이슈가 없습니다</div>
              )}
            </div>
          </div>
        )}

        {showAddTask && (
          <AddTaskModal
            projectId={id}
            parentTaskId={addingSubtaskTo}
            members={project.members.map((m) => m.user)}
            allUsers={allUsers}
            onClose={() => { setShowAddTask(false); setAddingSubtaskTo(undefined) }}
            onSave={fetchProject}
          />
        )}
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            members={project.members.map((m) => m.user)}
            allUsers={allUsers}
            onClose={() => setEditingTask(null)}
            onSave={fetchProject}
          />
        )}
      </main>
    </div>
  )
}
