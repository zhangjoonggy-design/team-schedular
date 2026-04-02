import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()

    // 이메일 중복 확인 (본인 제외)
    if (body.email) {
      const existing = await prisma.user.findFirst({
        where: { email: body.email, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 400 })
      }
    }

    const updateData: any = {
      name: body.name,
      email: body.email,
      role: body.role,
      position: body.position ?? '',
      avatarColor: body.avatarColor,
    }

    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, position: true, avatarColor: true },
    })

    // 프로젝트 멤버 교체
    if (body.projectIds !== undefined) {
      await prisma.projectMember.deleteMany({ where: { userId: id } })
      if (body.projectIds.length > 0) {
        await prisma.projectMember.createMany({
          data: body.projectIds.map((projectId: string) => ({ projectId, userId: id })),
        })
      }
    }

    // 과제 담당자 전체 교체
    if (body.taskIds !== undefined) {
      await prisma.taskAssignee.deleteMany({ where: { userId: id } })
      if (body.taskIds.length > 0) {
        await prisma.taskAssignee.createMany({
          data: body.taskIds.map((taskId: string) => ({ taskId, userId: id })),
          skipDuplicates: true,
        })
      }
    }

    await logActivity({ action: 'UPDATE', entity: 'USER', entityId: user.id, entityName: user.name, userId: session.user!.id, userName: session.user!.name })

    return NextResponse.json(user)
  } catch (e: any) {
    console.error('[PUT /api/users/:id]', e)
    return NextResponse.json({ error: e?.message ?? '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
