import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatarColor: true } },
        bizPm: { select: { id: true, name: true } },
        tasks: {
          where: { parentTaskId: null },
          include: {
            subTasks: {
              include: {
                subTasks: true,
                assignees: { include: { user: { select: { id: true, name: true, avatarColor: true, position: true } } } },
                issues: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            assignees: { include: { user: { select: { id: true, name: true, avatarColor: true, position: true } } } },
            devPl: { select: { id: true, name: true } },
            issues: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        issues: {
          include: {
            reporter: { select: { id: true, name: true, avatarColor: true } },
            assignee: { select: { id: true, name: true, avatarColor: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, avatarColor: true, position: true } } },
    })

    return NextResponse.json({ ...project, members })
  } catch (e: any) {
    console.error('[GET /api/projects/[id]]', e)
    return NextResponse.json({ error: 'Internal Server Error', detail: e?.message ?? String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      color: body.color,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      bizPmId: body.bizPmId !== undefined ? (body.bizPmId || null) : undefined,
    },
  })

  await logActivity({ action: 'UPDATE', entity: 'PROJECT', entityId: project.id, entityName: project.name, userId: session.user!.id, userName: session.user!.name })

  return NextResponse.json(project)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id }, select: { name: true } })
  await prisma.project.delete({ where: { id } })
  await logActivity({ action: 'DELETE', entity: 'PROJECT', entityId: id, entityName: project?.name ?? id, userId: session.user!.id, userName: session.user!.name })

  return NextResponse.json({ success: true })
}
