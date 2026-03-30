import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      progressPercent: body.progressPercent,
      estimatedHours: body.estimatedHours,
    },
  })

  if (body.assigneeIds !== undefined) {
    await prisma.taskAssignee.deleteMany({ where: { taskId: id } })
    if (body.assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({
        data: body.assigneeIds.map((userId: string) => ({ taskId: id, userId })),
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
