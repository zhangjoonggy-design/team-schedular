import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

const PHASES = [
  { name: '분석',   ratio: 0.15 },
  { name: '설계',   ratio: 0.20 },
  { name: '구현',   ratio: 0.30 },
  { name: '테스트', ratio: 0.25 },
  { name: '이행',   ratio: 0.03 },
  { name: '안정화', ratio: 0.07 },
]

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
    },
  })

  if (body.assigneeIds?.length) {
    await prisma.taskAssignee.createMany({
      data: body.assigneeIds.map((userId: string) => ({ taskId: task.id, userId })),
    })
  }

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
      const phaseEnd = new Date(cursor)
      phaseEnd.setDate(phaseEnd.getDate() + days - 1)

      const subTask = await prisma.task.create({
        data: {
          projectId: body.projectId,
          parentTaskId: task.id,
          title: phase.name,
          status: 'TODO',
          priority: body.priority ?? 'MEDIUM',
          startDate: new Date(cursor),
          dueDate: new Date(phaseEnd),
          progressPercent: 0,
        },
      })

      if (body.assigneeIds?.length) {
        await prisma.taskAssignee.createMany({
          data: body.assigneeIds.map((userId: string) => ({ taskId: subTask.id, userId })),
        })
      }

      cursor.setDate(cursor.getDate() + days)
    }
  }

  const project = await prisma.project.findUnique({ where: { id: body.projectId }, select: { name: true } })
  await logActivity({ action: 'CREATE', entity: 'TASK', entityId: task.id, entityName: task.title, userId: session.user!.id, userName: session.user!.name, detail: { project: project?.name } })

  return NextResponse.json(task, { status: 201 })
}
