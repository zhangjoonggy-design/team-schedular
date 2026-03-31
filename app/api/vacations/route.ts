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

  // 반차인데 09:00~18:00(연차 시간) 선택 시 오류
  if (body.type === 'HALF_DAY' && body.startTime === '09:00' && body.endTime === '18:00') {
    return NextResponse.json({ error: '09:00 ~ 18:00은 대체휴가가 아닌 연차로 등록해 주세요.' }, { status: 400 })
  }

  // 중복 일정 검증
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const isNewHalfDay = body.type === 'HALF_DAY'

  const candidates = await prisma.vacationRequest.findMany({
    where: {
      userId: targetUserId,
      status: { not: 'REJECTED' },
      startDate: { lte: new Date(body.endDate) },
      endDate:   { gte: new Date(body.startDate) },
    },
  })

  const conflicting = candidates.find((v) => {
    // 둘 다 반차인 경우 → 시간 겹침 여부로 판단
    if (isNewHalfDay && v.type === 'HALF_DAY') {
      const newS = toMin(body.startTime ?? '09:00')
      const newE = toMin(body.endTime   ?? '18:00')
      const exS  = toMin(v.startTime    ?? '09:00')
      const exE  = toMin(v.endTime      ?? '18:00')
      return newS < exE && newE > exS
    }
    // 그 외(전일↔전일, 전일↔반차, 반차↔전일) → 날짜 겹침 자체가 충돌
    return true
  })

  if (conflicting) {
    const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    const isHalfConflict = isNewHalfDay && conflicting.type === 'HALF_DAY'
    const msg = isHalfConflict
      ? `해당 날짜에 ${conflicting.startTime} ~ ${conflicting.endTime} 대체휴가가 이미 등록되어 있습니다.`
      : `${fmt(conflicting.startDate)} ~ ${fmt(conflicting.endDate)} 기간에 이미 등록된 휴가가 있습니다.`
    return NextResponse.json({ error: msg }, { status: 409 })
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
