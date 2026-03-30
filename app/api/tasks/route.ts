import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  return NextResponse.json(task, { status: 201 })
}
