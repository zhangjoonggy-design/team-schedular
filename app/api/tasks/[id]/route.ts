import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // 요청에 명시된 필드만 업데이트 (미포함 필드는 기존 값 유지)
  const data: Record<string, unknown> = {}
  if ('title' in body)           data.title = body.title
  if ('description' in body)     data.description = body.description
  if ('priority' in body)        data.priority = body.priority
  if ('startDate' in body)       data.startDate = body.startDate ? new Date(body.startDate) : null
  if ('dueDate' in body)         data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if ('estimatedHours' in body)  data.estimatedHours = body.estimatedHours
  if ('progressPercent' in body) {
    const pct = body.progressPercent as number
    data.progressPercent = pct
    // 진척율에 따라 상태 자동 업데이트 (status가 명시되지 않은 경우)
    if (!('status' in body)) {
      if (pct === 100)       data.status = 'DONE'
      else if (pct >= 1)     data.status = 'IN_PROGRESS'
      else                   data.status = 'TODO'
    }
  }
  if ('status' in body) data.status = body.status

  const task = await prisma.task.update({ where: { id }, data })

  if (body.assigneeIds !== undefined) {
    await prisma.taskAssignee.deleteMany({ where: { taskId: id } })
    if (body.assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: body.assigneeIds.map((userId: string) => ({ taskId: id, userId })),
      })
    }
  }

  // 하위 과제 진척율 변동 시 상위 과제 진척율·상태 재계산
  if (task.parentTaskId) {
    const siblings = await prisma.task.findMany({
      where: { parentTaskId: task.parentTaskId },
      select: { progressPercent: true },
    })
    const parentProgress = siblings.length > 0
      ? Math.round(siblings.reduce((sum, s) => sum + s.progressPercent, 0) / siblings.length)
      : 0
    const parentStatus = parentProgress === 100 ? 'DONE' : parentProgress >= 1 ? 'IN_PROGRESS' : 'TODO'

    await prisma.task.update({
      where: { id: task.parentTaskId },
      data: { progressPercent: parentProgress, status: parentStatus },
    })
  }

  await logActivity({ action: 'UPDATE', entity: 'TASK', entityId: task.id, entityName: task.title, userId: session.user!.id, userName: session.user!.name })

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const task = await prisma.task.findUnique({ where: { id }, select: { title: true } })
  // 하위 과제(단계별 상세일정) 먼저 삭제 — TaskAssignee 등 연관 레코드는 cascade로 자동 삭제
  await prisma.task.deleteMany({ where: { parentTaskId: id } })
  await prisma.task.delete({ where: { id } })
  await logActivity({ action: 'DELETE', entity: 'TASK', entityId: id, entityName: task?.title ?? id, userId: session.user!.id, userName: session.user!.name })

  return NextResponse.json({ success: true })
}
