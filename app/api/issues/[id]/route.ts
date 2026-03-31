import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const issue = await prisma.issue.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      severity: body.severity,
      status: body.status,
      assigneeId: body.assigneeId ?? null,
      resolvedAt: body.status === 'RESOLVED' ? new Date() : null,
    },
  })

  await logActivity({ action: 'UPDATE', entity: 'ISSUE', entityId: issue.id, entityName: issue.title, userId: session.user!.id, userName: session.user!.name, detail: { status: body.status } })

  return NextResponse.json(issue)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const issue = await prisma.issue.findUnique({ where: { id }, select: { title: true } })
  await prisma.issue.delete({ where: { id } })
  await logActivity({ action: 'DELETE', entity: 'ISSUE', entityId: id, entityName: issue?.title ?? id, userId: session.user!.id, userName: session.user!.name })

  return NextResponse.json({ success: true })
}
