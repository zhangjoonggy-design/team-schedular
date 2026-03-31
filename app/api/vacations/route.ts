import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vacations = await prisma.vacationRequest.findMany({
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  return NextResponse.json(vacations)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // 관리자는 타 직원 대신 등록 가능
  const sessionUser = await prisma.user.findUnique({ where: { id: session.user!.id! }, select: { role: true } })
  const isAdmin = sessionUser?.role === 'ADMIN'
  const targetUserId = (isAdmin && body.userId) ? body.userId : session.user!.id!

  // 중복 일정 검증
  const overlapping = await prisma.vacationRequest.findFirst({
    where: {
      userId: targetUserId,
      status: { not: 'REJECTED' },
      startDate: { lte: new Date(body.endDate) },
      endDate: { gte: new Date(body.startDate) },
    },
    include: { user: { select: { name: true } } },
  })
  if (overlapping) {
    const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    return NextResponse.json(
      { error: `${fmt(overlapping.startDate)} ~ ${fmt(overlapping.endDate)} 기간에 이미 등록된 휴가가 있습니다.` },
      { status: 409 }
    )
  }

  const vacation = await prisma.vacationRequest.create({
    data: {
      userId: targetUserId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      type: body.type ?? 'ANNUAL',
      status: 'APPROVED',
      note: body.note,
      startTime: body.type === 'HALF_DAY' ? (body.startTime ?? '09:00') : null,
      endTime:   body.type === 'HALF_DAY' ? (body.endTime   ?? '18:00') : null,
    },
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
    },
  })

  await logActivity({ action: 'CREATE', entity: 'VACATION', entityId: vacation.id, entityName: `${vacation.user.name} 휴가`, userId: session.user!.id, userName: session.user!.name, detail: { start: body.startDate, end: body.endDate, type: body.type } })

  return NextResponse.json(vacation, { status: 201 })
}
