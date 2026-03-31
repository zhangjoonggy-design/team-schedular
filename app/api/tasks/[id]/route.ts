import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // 요청에 명시된 필드만 업데이트 (미포함 필드는 기존 값 유지)
  const data: Record<string, unknown> = {}
  if ('title' in body)           data.title = body.title
  if ('description' in body)     data.description = body.description
  if ('status' in body)          data.status = body.status
  if ('priority' in body)        data.priority = body.priority
  if ('startDate' in body)       data.startDate = body.startDate ? new Date(body.startDate) : null
  if ('dueDate' in body)         data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if ('progressPercent' in body) data.progressPercent = body.progressPercent
  if ('estimatedHours' in body)  data.estimatedHours = body.estimatedHours

  const task = await prisma.task.update({ where: { id }, data })

  if (body.assigneeIds !== undefined) {
    await prisma.taskAssignee.deleteMany({ where: { taskId: id } })
    if (body.assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: body.assigneeIds.map((userId: string) => ({ taskId: id, userId })),
      })
    }
  }

  // 단계 하위 과제가 업데이트되면 상위 과제 진척율을 재계산
  // 규칙: 100% 완료된 단계 수 / 6 × 100 (6단계 모두 완료 시 정확히 100%)
  if (task.parentTaskId) {
    const PHASE_NAMES = ['분석', '설계', '구현', '테스트', '이행', '안정화']
    const siblings = await prisma.task.findMany({
      where: { parentTaskId: task.parentTaskId },
      select: { title: true, progressPercent: true },
    })
    const phaseMap = new Map(siblings.map((s) => [s.title, s.progressPercent]))
    const completedCount = PHASE_NAMES.filter((n) => phaseMap.get(n) === 100).length
    const parentProgress = completedCount >= PHASE_NAMES.length
      ? 100
      : Math.round((completedCount / PHASE_NAMES.length) * 100)

    await prisma.task.update({
      where: { id: task.parentTaskId },
      data: { progressPercent: parentProgress },
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 하위 과제(단계별 상세일정) 먼저 삭제 — TaskAssignee 등 연관 레코드는 cascade로 자동 삭제
  await prisma.task.deleteMany({ where: { parentTaskId: id } })
  await prisma.task.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
