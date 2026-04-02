import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { KR_HOLIDAYS } from '@/lib/holidays'

const PHASES = [
  { name: '분석',   ratio: 0.15 },
  { name: '설계',   ratio: 0.20 },
  { name: '구현',   ratio: 0.30 },
  { name: '테스트', ratio: 0.25 },
  { name: '이행',   ratio: 0.03 },
  { name: '안정화', ratio: 0.07 },
]

function isHolidayOrWeekend(d: Date): boolean {
  const dow = d.getDay()
  const ymd = d.toISOString().slice(0, 10)
  return dow === 0 || dow === 6 || KR_HOLIDAYS.has(ymd)
}

// 기준일에서 가장 가까운 월요일(1) 또는 목요일(4)을 반환 (공휴일·주말 제외)
function nearestMonOrThu(date: Date): Date {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)

  // ±6일 범위에서 가장 가까운 월/목 탐색
  let best: Date | null = null
  let bestDist = Infinity
  for (let offset = -6; offset <= 6; offset++) {
    const c = new Date(base)
    c.setDate(base.getDate() + offset)
    const dow = c.getDay()
    if ((dow === 1 || dow === 4) && Math.abs(offset) < bestDist) {
      bestDist = Math.abs(offset)
      best = c
    }
  }

  // 공휴일이면 이후 가장 가까운 월/목으로 이동
  let result = new Date(best!)
  for (let i = 0; i < 14; i++) {
    if (!isHolidayOrWeekend(result)) break
    result.setDate(result.getDate() + 1)
    while (result.getDay() !== 1 && result.getDay() !== 4) {
      result.setDate(result.getDate() + 1)
    }
  }
  return result
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const task = await prisma.task.create({
    data: {
      projectId: body.projectId,
      parentTaskId: body.parentTaskId ?? null,
      title: body.title,
      description: body.description,
      status: body.status ?? 'TODO',
      priority: body.priority ?? 'MEDIUM',
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      progressPercent: body.progressPercent ?? 0,
      estimatedHours: body.estimatedHours ?? null,
      devPlId: body.devPlId || null,
    },
  })

  if (body.assigneeIds?.length) {
    await prisma.taskAssignee.createMany({
      data: body.assigneeIds.map((userId: string) => ({ taskId: task.id, userId })),
    })
  }

  const project = await prisma.project.findUnique({ where: { id: body.projectId }, select: { name: true } })

  // 최상위 과제에 시작일·마감일이 있으면 단계별 일정을 하위 과제로 자동 생성
  if (!body.parentTaskId && body.startDate && body.dueDate) {
    const start = new Date(body.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(body.dueDate)
    end.setHours(0, 0, 0, 0)
    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

    let cursor = new Date(start)
    for (const phase of PHASES) {
      const days = Math.max(1, Math.round(totalDays * phase.ratio))
      const rawEnd = new Date(cursor)
      rawEnd.setDate(rawEnd.getDate() + days - 1)

      // 마감일은 가장 가까운 월요일 또는 목요일 (공휴일 제외)
      const phaseEnd = nearestMonOrThu(rawEnd)

      const subTask = await prisma.task.create({
        data: {
          projectId: body.projectId,
          parentTaskId: task.id,
          title: phase.name,
          status: 'TODO',
          priority: body.priority ?? 'MEDIUM',
          startDate: new Date(cursor),
          dueDate: phaseEnd,
          progressPercent: 0,
        },
      })

      if (body.assigneeIds?.length) {
        await prisma.taskAssignee.createMany({
          data: body.assigneeIds.map((userId: string) => ({ taskId: subTask.id, userId })),
        })
      }

      const assigneeNames = body.assigneeIds?.length
        ? (await prisma.user.findMany({ where: { id: { in: body.assigneeIds } }, select: { name: true } })).map((u: { name: string }) => u.name).join(', ')
        : undefined
      await logActivity({ action: 'CREATE', entity: 'SUBTASK', entityId: subTask.id, entityName: phase.name, userId: session.user!.id, userName: session.user!.name, detail: { 과제: task.title, 프로젝트: project?.name, 시작일: new Date(cursor).toISOString().slice(0, 10), 마감일: phaseEnd.toISOString().slice(0, 10), ...(assigneeNames ? { 투입인력: assigneeNames } : {}) } })

      cursor.setDate(cursor.getDate() + days)
    }
  }

  await logActivity({ action: 'CREATE', entity: 'TASK', entityId: task.id, entityName: task.title, userId: session.user!.id, userName: session.user!.name, detail: { 프로젝트: project?.name } })

  return NextResponse.json(task, { status: 201 })
}
