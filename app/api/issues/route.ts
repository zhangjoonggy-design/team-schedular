import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')

  const issues = await prisma.issue.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      reporter: { select: { id: true, name: true, avatarColor: true } },
      assignee: { select: { id: true, name: true, avatarColor: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(issues)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const issue = await prisma.issue.create({
    data: {
      projectId: body.projectId,
      taskId: body.taskId ?? null,
      reporterId: session.user!.id!,
      assigneeId: body.assigneeId ?? null,
      title: body.title,
      description: body.description,
      severity: body.severity ?? 'MEDIUM',
      status: 'OPEN',
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      reporter: { select: { id: true, name: true, avatarColor: true } },
      assignee: { select: { id: true, name: true, avatarColor: true } },
    },
  })

  await logActivity({ action: 'CREATE', entity: 'ISSUE', entityId: issue.id, entityName: issue.title, userId: session.user!.id, userName: session.user!.name, detail: { project: issue.project.name } })

  return NextResponse.json(issue, { status: 201 })
}
