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

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.task.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
