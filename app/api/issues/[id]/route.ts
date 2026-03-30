import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  return NextResponse.json(issue)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.issue.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
