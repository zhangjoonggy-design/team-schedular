'use client'

import { useState, useEffect, use } from 'react'
import { Header } from '@/components/layout/Header'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { StatusBadge, SeverityBadge } from '@/components/shared/StatusBadge'
import { UserAvatarGroup } from '@/components/shared/UserAvatar'
import { formatDate, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils'
import { ChevronDown, ChevronRight, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const PHASE_COLORS: Record<string, string> = {
  '분석':   '#3b82f6',
  '설계':   '#8b5cf6',
  '구현':   '#22c55e',
  '테스트': '#f59e0b',
  '이행':   '#ef4444',
  '안정화': '#14b8a6',
}
const PHASE_NAMES = ['분석', '설계', '구현', '테스트', '이행', '안정화']

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
  devPl: { id: string; name: string } | null
}

interface Member {
  id: string
  name: string
  avatarColor: string
  position?: string
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
  bizPm: { id: string; name: string } | null
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
  onEdit: (task: Task, parent?: Task) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progress, setProgress] = useState(task.progressPercent)

  useEffect(() => {
    setProgress(task.progressPercent)
  }, [task.progressPercent])

  const progressToStatus = (pct: number) =>
    pct === 100 ? 'DONE' : pct >= 1 ? 'IN_PROGRESS' : 'TODO'

  const handleProgressSave = () => {
    onUpdate(task.id, { progressPercent: progress, status: progressToStatus(progress) })
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
            <div className="flex items-center gap-1 w-full min-w-[80px]">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="flex-1 min-w-0"
              />
              <span className="text-xs w-8 flex-shrink-0">{progress}%</span>
              <button onClick={handleProgressSave} className="text-xs text-indigo-600 flex-shrink-0">저장</button>
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
          onEdit={(editTask) => onEdit(editTask, task)}
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
  projectStartDate,
  projectEndDate,
  onClose,
  onSave,
}: {
  projectId: string
  parentTaskId?: string
  members: Member[]
  allUsers: (Member & { position?: string })[]
  projectStartDate?: string | null
  projectEndDate?: string | null
  onClose: () => void
  onSave: () => void
}) {
  const devPlUsers = allUsers.filter((u) => u.position === '개발 PL')
  const [form, setForm] = useState({
    title: '',
    status: 'TODO',
    priority: 'MEDIUM',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    assigneeIds: [] as string[],
    devPlId: '',
  })
  const [dateAlert, setDateAlert] = useState<string | null>(null)

  const projStart = projectStartDate ? projectStartDate.slice(0, 10) : null
  const projEnd = projectEndDate ? projectEndDate.slice(0, 10) : null

  const validateDates = (): string | null => {
    if (form.startDate && projStart && form.startDate < projStart)
      return `시작일(${form.startDate})이 프로젝트 시작일(${projStart})보다 앞설 수 없습니다.`
    if (form.dueDate && projEnd && form.dueDate > projEnd)
      return `마감일(${form.dueDate})이 프로젝트 종료일(${projEnd})을 초과할 수 없습니다.`
    if (form.startDate && form.dueDate && form.startDate > form.dueDate)
      return '시작일은 마감일보다 이전이어야 합니다.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const error = validateDates()
    if (error) { setDateAlert(error); return }
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
        {(projStart || projEnd) && (
          <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 mb-3">
            프로젝트 허용 기간: {projStart ?? '?'} ~ {projEnd ?? '?'}
          </p>
        )}
        {dateAlert && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-3">
            <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-medium text-red-700">일정 범위 초과</p>
              <p className="text-xs text-red-600 mt-0.5">{dateAlert}</p>
            </div>
            <button type="button" onClick={() => setDateAlert(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
        )}
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
                value={form.startDate}
                min={projStart ?? undefined}
                max={projEnd ?? undefined}
                onChange={(e) => { setDateAlert(null); setForm({ ...form, startDate: e.target.value }) }} />
            </div>
            <div>
              <label className="text-xs text-gray-500">마감일</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.dueDate}
                min={projStart ?? undefined}
                max={projEnd ?? undefined}
                onChange={(e) => { setDateAlert(null); setForm({ ...form, dueDate: e.target.value }) }} />
            </div>
          </div>
          {!parentTaskId && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">개발 PL</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.devPlId} onChange={(e) => setForm({ ...form, devPlId: e.target.value })}>
                <option value="">선택 안 함</option>
                {devPlUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
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
  parentTask,
  members,
  allUsers,
  projectStartDate,
  projectEndDate,
  onClose,
  onSave,
}: {
  task: Task
  parentTask?: Task
  members: Member[]
  allUsers: Member[]
  projectStartDate?: string | null
  projectEndDate?: string | null
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
  const [dateAlert, setDateAlert] = useState<string | null>(null)

  const toggleAssignee = (userId: string) => {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(userId)
        ? f.assigneeIds.filter((id) => id !== userId)
        : [...f.assigneeIds, userId],
    }))
  }

  const projStart = parentTask
    ? (parentTask.startDate ? parentTask.startDate.slice(0, 10) : null)
    : (projectStartDate ? projectStartDate.slice(0, 10) : null)
  const projEnd = parentTask
    ? (parentTask.dueDate ? parentTask.dueDate.slice(0, 10) : null)
    : (projectEndDate ? projectEndDate.slice(0, 10) : null)

  const validateDates = (): string | null => {
    const rangeLabel = parentTask ? '상위 과제' : '프로젝트'
    if (form.startDate && projStart && form.startDate < projStart)
      return `시작일(${form.startDate})이 ${rangeLabel} 시작일(${projStart})보다 앞설 수 없습니다.`
    if (form.dueDate && projEnd && form.dueDate > projEnd)
      return `마감일(${form.dueDate})이 ${rangeLabel} 종료일(${projEnd})을 초과할 수 없습니다.`
    if (form.startDate && form.dueDate && form.startDate > form.dueDate)
      return '시작일은 마감일보다 이전이어야 합니다.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const error = validateDates()
    if (error) {
      setDateAlert(error)
      return
    }
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
        <h3 className="font-semibold text-gray-800 mb-4">
          {parentTask ? `상세 일정 수정 — ${task.title}` : '과제 수정'}
        </h3>
        {(projStart || projEnd) && (
          <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 mb-3">
            {parentTask ? '상위 과제' : '프로젝트'} 허용 기간: {projStart ?? '?'} ~ {projEnd ?? '?'}
          </p>
        )}
        {/* 날짜 오류 안내 팝업 */}
        {dateAlert && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-3">
            <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-medium text-red-700">일정 범위 초과</p>
              <p className="text-xs text-red-600 mt-0.5">{dateAlert}</p>
            </div>
            <button onClick={() => setDateAlert(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
        )}
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
                value={form.startDate}
                min={projStart ?? undefined}
                max={projEnd ?? undefined}
                onChange={(e) => { setDateAlert(null); setForm({ ...form, startDate: e.target.value }) }} />
            </div>
            <div>
              <label className="text-xs text-gray-500">마감일</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={form.dueDate}
                min={projStart ?? undefined}
                max={projEnd ?? undefined}
                onChange={(e) => { setDateAlert(null); setForm({ ...form, dueDate: e.target.value }) }} />
            </div>
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

function GanttChart({ tasks }: { tasks: Task[] }) {
  const DAY_MS = 86400000
  const tasksWithDates = tasks.filter((t) => t.startDate && t.dueDate)

  if (tasksWithDates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        시작일과 마감일이 설정된 과제가 없습니다.
      </div>
    )
  }

  const allTs = tasksWithDates.flatMap((t) => {
    const pts = [new Date(t.startDate!).getTime(), new Date(t.dueDate!).getTime()]
    ;(t.subTasks ?? []).forEach((s) => {
      if (s.startDate) pts.push(new Date(s.startDate).getTime())
      if (s.dueDate) pts.push(new Date(s.dueDate).getTime())
    })
    return pts
  })

  const chartStart = new Date(Math.min(...allTs))
  chartStart.setDate(chartStart.getDate() - 3)
  chartStart.setHours(0, 0, 0, 0)
  const chartEnd = new Date(Math.max(...allTs))
  chartEnd.setDate(chartEnd.getDate() + 3)
  chartEnd.setHours(0, 0, 0, 0)

  const totalDays = Math.ceil((chartEnd.getTime() - chartStart.getTime()) / DAY_MS)
  const dayW = totalDays <= 30 ? 24 : totalDays <= 90 ? 16 : totalDays <= 180 ? 10 : 6
  const chartWidth = totalDays * dayW

  const getX = (date: string | null) => {
    if (!date) return 0
    const d = new Date(date); d.setHours(0, 0, 0, 0)
    return Math.round((d.getTime() - chartStart.getTime()) / DAY_MS) * dayW
  }
  const getW = (s: string, e: string) => {
    const sd = new Date(s); sd.setHours(0, 0, 0, 0)
    const ed = new Date(e); ed.setHours(0, 0, 0, 0)
    return Math.max(dayW, (Math.round((ed.getTime() - sd.getTime()) / DAY_MS) + 1) * dayW)
  }

  const months: { label: string; x: number; w: number }[] = []
  const mc = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1)
  while (mc <= chartEnd) {
    const nx = new Date(mc.getFullYear(), mc.getMonth() + 1, 1)
    const x = Math.max(0, Math.round((mc.getTime() - chartStart.getTime()) / DAY_MS)) * dayW
    const ex = Math.min(chartWidth, Math.round((nx.getTime() - chartStart.getTime()) / DAY_MS) * dayW)
    months.push({ label: `${mc.getFullYear()}.${String(mc.getMonth() + 1).padStart(2, '0')}`, x, w: ex - x })
    mc.setMonth(mc.getMonth() + 1)
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayX = today >= chartStart && today <= chartEnd
    ? Math.round((today.getTime() - chartStart.getTime()) / DAY_MS) * dayW
    : null

  const NAME_W = 192

  return (
    <div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: NAME_W + chartWidth }}>
          {/* 헤더 */}
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div className="flex-shrink-0 py-2 px-3 text-xs font-medium text-gray-500 border-r border-gray-200" style={{ width: NAME_W }}>
              과제명
            </div>
            <div className="flex" style={{ width: chartWidth }}>
              {months.map((m, i) => (
                <div key={i} style={{ width: m.w, minWidth: m.w }} className="py-2 px-2 text-xs font-medium text-gray-500 border-r border-gray-100 truncate">
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* 과제 행 */}
          {tasksWithDates.map((task) => {
            const phases = (task.subTasks ?? [])
              .filter((s) => PHASE_NAMES.includes(s.title) && s.startDate && s.dueDate)
              .sort((a, b) => PHASE_NAMES.indexOf(a.title) - PHASE_NAMES.indexOf(b.title))

            return (
              <div key={task.id} className="flex items-center border-b border-gray-100 hover:bg-indigo-50/30" style={{ minHeight: 56 }}>
                <div className="flex-shrink-0 py-2 px-3 border-r border-gray-100" style={{ width: NAME_W }}>
                  <p className="text-sm font-medium text-gray-800 truncate" title={task.title}>{task.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(task.startDate)} ~ {formatDate(task.dueDate)}</p>
                </div>
                <div className="relative flex-shrink-0" style={{ width: chartWidth, height: 56 }}>
                  {/* 월 구분선 */}
                  {months.map((m, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-gray-100" style={{ left: m.x + m.w }} />
                  ))}
                  {/* 오늘 선 */}
                  {todayX !== null && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-400 opacity-70 z-10" style={{ left: todayX }} />
                  )}
                  {/* 전체 기간 배경바 */}
                  <div className="absolute rounded-full opacity-10"
                    style={{ left: getX(task.startDate), width: getW(task.startDate!, task.dueDate!), top: '50%', transform: 'translateY(-50%)', height: 30, backgroundColor: '#6366f1' }} />
                  {/* 단계 바 */}
                  {phases.length > 0 ? phases.map((phase) => {
                    const isDone = phase.status === 'DONE' || phase.progressPercent === 100
                    const phaseColor = PHASE_COLORS[phase.title] ?? '#6366f1'
                    return (
                      <div key={phase.id}
                        className="absolute rounded-sm overflow-hidden cursor-default"
                        style={{
                          left: getX(phase.startDate),
                          width: getW(phase.startDate!, phase.dueDate!),
                          top: '50%', transform: 'translateY(-50%)',
                          height: 30,
                          backgroundColor: phaseColor + '30',
                          border: `1.5px solid ${phaseColor}`,
                        }}
                        title={`${phase.title}: ${phase.progressPercent}% | ${formatDate(phase.startDate)} ~ ${formatDate(phase.dueDate)}`}
                      >
                        {/* 진척율 채우기 */}
                        <div className="absolute top-0 left-0 bottom-0 transition-all duration-300"
                          style={{ width: `${phase.progressPercent}%`, backgroundColor: phaseColor, opacity: isDone ? 1 : 0.8 }} />
                        {/* 완료 시 대각선 패턴 오버레이 */}
                        {isDone && (
                          <div className="absolute inset-0 opacity-20"
                            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 3px, transparent 3px, transparent 8px)' }} />
                        )}
                        {/* 레이블 */}
                        <div className="absolute inset-0 flex items-center px-1.5 gap-0.5">
                          {isDone && <span className="text-white text-[10px] font-bold drop-shadow-sm select-none">✓</span>}
                          <span className="text-white text-[10px] font-semibold truncate select-none drop-shadow-sm">{phase.title}</span>
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="absolute rounded-sm flex items-center overflow-hidden"
                      style={{ left: getX(task.startDate), width: getW(task.startDate!, task.dueDate!), top: '50%', transform: 'translateY(-50%)', height: 30, backgroundColor: '#6366f1' }}>
                      <span className="text-white text-[10px] font-semibold px-1.5 truncate select-none">{task.title}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* 범례 */}
      <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50">
        {PHASE_NAMES.map((name) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: PHASE_COLORS[name] }} />
            <span className="text-xs text-gray-600">{name}</span>
          </div>
        ))}
        {todayX !== null && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-red-400 flex-shrink-0" />
            <span className="text-xs text-gray-600">오늘</span>
          </div>
        )}
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
  const [editingTaskParent, setEditingTaskParent] = useState<Task | undefined>(undefined)
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'tasks' | 'gantt' | 'issues'>('tasks')

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${id}`, { cache: 'no-store' })
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
      .then((data) => {
        setAllUsers(data.map((u: any) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor, position: u.position })))
      })
      .catch(() => {})
  }, [id])

  const handleUpdateTask = async (taskId: string, data: any) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await fetchProject()
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('과제를 삭제하시겠습니까?')) return
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    fetchProject()
  }

  if (!project) return <div className="p-6 text-gray-400">로딩중...</div>

  const allTasks = [...project.tasks, ...project.tasks.flatMap((t) => t.subTasks)]
  // 프로젝트 진척율 = 상위 과제 진척율의 평균 (1/과제 수 * 100 기준)
  const overallProgress = project.tasks.length > 0
    ? Math.round(project.tasks.reduce((s, t) => s + t.progressPercent, 0) / project.tasks.length)
    : 0

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={project.name} />
      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* 프로젝트 헤더 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              {(() => {
                const devPlNames = [...new Set(project.tasks.map(t => t.devPl?.name).filter(Boolean))]
                const hasBizPm = !!project.bizPm
                const hasDevPl = devPlNames.length > 0
                if (!hasBizPm && !hasDevPl) return null
                return (
                  <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                    {hasBizPm && <span><span className="text-gray-400">현업 PM :</span> {project.bizPm!.name}</span>}
                    {hasDevPl && <span><span className="text-gray-400">개발 PL :</span> {devPlNames.join(', ')}</span>}
                  </p>
                )
              })()}
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
            onClick={() => setActiveTab('gantt')}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 'gantt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            간트 차트
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
                      onEdit={(task, parent) => { setEditingTask(task); setEditingTaskParent(parent) }}
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

        {activeTab === 'gantt' && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">단계별 간트 차트</h2>
              <p className="text-xs text-gray-400 mt-0.5">분석 15% · 설계 20% · 구현 30% · 테스트 25% · 이행 3% · 안정화 7%</p>
            </div>
            <GanttChart tasks={project.tasks} />
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
            projectStartDate={project.startDate}
            projectEndDate={project.endDate}
            onClose={() => { setShowAddTask(false); setAddingSubtaskTo(undefined) }}
            onSave={fetchProject}
          />
        )}
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            parentTask={editingTaskParent}
            members={project.members.map((m) => m.user)}
            allUsers={allUsers}
            projectStartDate={project.startDate}
            projectEndDate={project.endDate}
            onClose={() => { setEditingTask(null); setEditingTaskParent(undefined) }}
            onSave={fetchProject}
          />
        )}
      </main>
    </div>
  )
}
