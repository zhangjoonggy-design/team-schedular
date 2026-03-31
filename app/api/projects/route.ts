import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    include: {
      owner: { select: { id: true, name: true, avatarColor: true } },
      tasks: {
        where: { parentTaskId: null },
        include: {
          subTasks: true,
          assignees: { include: { user: { select: { id: true, name: true, avatarColor: true } } } },
        },
      },
      _count: { select: { issues: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const projectsWithProgress = projects.map((project) => {
    const allTasks = [...project.tasks, ...project.tasks.flatMap((t) => t.subTasks)]
    const totalHours = allTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 1), 0)
    const weightedProgress = allTasks.reduce(
      (sum, t) => sum + t.progressPercent * (t.estimatedHours ?? 1),
      0
    )
    const progress = totalHours > 0 ? Math.round(weightedProgress / totalHours) : 0

    return { ...project, progress }
  })

  return NextResponse.json(projectsWithProgress)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
      color: body.color ?? '#6366f1',
      status: body.status ?? 'ACTIVE',
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      ownerId: session.user!.id!,
    },
  })

  await logActivity({ action: 'CREATE', entity: 'PROJECT', entityId: project.id, entityName: project.name, userId: session.user!.id, userName: session.user!.name })

  return NextResponse.json(project, { status: 201 })
}
