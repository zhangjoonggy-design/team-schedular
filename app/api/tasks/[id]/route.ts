import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.title !== undefined)         data.title = body.title
  if (body.description !== undefined)   data.description = body.description
  if (body.status !== undefined)        data.status = body.status
  if (body.priority !== undefined)      data.priority = body.priority
  if ('startDate' in body)              data.startDate = body.startDate ? new Date(body.startDate) : null
  if ('dueDate' in body)                data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.progressPercent !== undefined) data.progressPercent = body.progressPercent
  if (body.estimatedHours !== undefined)  data.estimatedHours = body.estimatedHours

  const task = await prisma.task.update({ where: { id }, data })

  if (body.assigneeIds !== undefined) {
    await prisma.taskAssignee.deleteMany({ where: { taskId: id } })
    if (body.assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: body.assigneeIds.map((userId: string) => ({ taskId: id, userId })),
      })
    }
  }

  // 단계 하위 과제가 업데이트되면 상위 과제 진척율을 비율 가중 합산으로 재계산
  if (task.parentTaskId) {
    const PHASE_RATIOS: Record<string, number> = {
      '분석': 0.15, '설계': 0.20, '구현': 0.30,
      '테스트': 0.25, '이행': 0.03, '안정화': 0.07,
    }
    const siblings = await prisma.task.findMany({
      where: { parentTaskId: task.parentTaskId },
      select: { title: true, progressPercent: true },
    })
    let totalRatio = 0
    let weighted = 0
    for (const s of siblings) {
      const r = PHASE_RATIOS[s.title]
      if (r !== undefined) {
        totalRatio += r
        weighted += s.progressPercent * r
      }
    }
    if (totalRatio > 0) {
      await prisma.task.update({
        where: { id: task.parentTaskId },
        data: { progressPercent: Math.round(weighted / totalRatio) },
      })
    }
  }

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.task.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
