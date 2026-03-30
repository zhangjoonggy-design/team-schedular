import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, avatarColor: true, createdAt: true,
      projectMembers: { select: { projectId: true } },
      taskAssignments: {
        where: { task: { status: { notIn: ['DONE'] } } },
        select: {
          task: {
            select: {
              id: true, title: true, status: true, dueDate: true,
              project: { select: { name: true, color: true } },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(body.password, 10)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role ?? 'MEMBER',
        avatarColor: body.avatarColor ?? '#6366f1',
      },
      select: { id: true, name: true, email: true, role: true, avatarColor: true, createdAt: true },
    })

    if (body.projectIds?.length) {
      await prisma.projectMember.createMany({
        data: body.projectIds.map((projectId: string) => ({ projectId, userId: user.id })),
      })
    }

    if (body.taskIds?.length) {
      await prisma.taskAssignee.createMany({
        data: body.taskIds.map((taskId: string) => ({ taskId, userId: user.id })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json(user, { status: 201 })
  } catch (e: any) {
    console.error('[POST /api/users]', e)
    return NextResponse.json({ error: e?.message ?? '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
