import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { VACATION_TYPE_LABELS } from '@/lib/utils'
import { isHolidayOrWeekend, holidayErrorMsg } from '@/lib/holidays'

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

  // 시작일·종료일 휴일 검증
  if (isHolidayOrWeekend(body.startDate)) {
    return NextResponse.json({ error: holidayErrorMsg(body.startDate, '시작일') }, { status: 400 })
  }
  if (body.endDate && body.endDate !== body.startDate && isHolidayOrWeekend(body.endDate)) {
    return NextResponse.json({ error: holidayErrorMsg(body.endDate, '종료일') }, { status: 400 })
  }

  // 반차인데 09:00~18:00(연차 시간) 선택 시 오류
  if (body.type === 'HALF_DAY' && body.startTime === '09:00' && body.endTime === '18:00') {
    return NextResponse.json({ error: '09:00 ~ 18:00은 대체휴가가 아닌 연차로 등록해 주세요.' }, { status: 400 })
  }

  // 중복 일정 검증
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

  // 타입별 실효 시간 범위 반환
  const TIME_TYPES = new Set(['HALF_DAY', 'HALF_AM', 'HALF_PM', 'QUARTER_DAY'])
  const getTimeBounds = (type: string, st?: string | null, et?: string | null) => {
    if (type === 'HALF_AM') return { s: toMin('09:00'), e: toMin('13:00') }
    if (type === 'HALF_PM') return { s: toMin('14:00'), e: toMin('18:00') }
    return { s: toMin(st ?? '00:00'), e: toMin(et ?? '23:59') }
  }

  const candidates = await prisma.vacationRequest.findMany({
    where: {
      userId: targetUserId,
      status: { not: 'REJECTED' },
      startDate: { lte: new Date(body.endDate) },
      endDate:   { gte: new Date(body.startDate) },
    },
  })

  const conflicting = candidates.find((v) => {
    const newIsTime = TIME_TYPES.has(body.type)
    const exIsTime  = TIME_TYPES.has(v.type)
    // 둘 다 시간 기반 → 시간 겹침으로 판단
    if (newIsTime && exIsTime) {
      const nb = getTimeBounds(body.type, body.startTime, body.endTime)
      const eb = getTimeBounds(v.type,    v.startTime,   v.endTime)
      return nb.s < eb.e && nb.e > eb.s
    }
    // 그 외 → 날짜 겹침 자체가 충돌
    return true
  })

  if (conflicting) {
    const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    const bothTime = TIME_TYPES.has(body.type) && TIME_TYPES.has(conflicting.type)
    const eb = getTimeBounds(conflicting.type, conflicting.startTime, conflicting.endTime)
    const toHHMM = (min: number) => `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`
    const msg = bothTime
      ? `해당 날짜에 ${toHHMM(eb.s)} ~ ${toHHMM(eb.e)} ${VACATION_TYPE_LABELS[conflicting.type] ?? ''}이(가) 이미 등록되어 있습니다.`
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
      startTime: TIME_TYPES.has(body.type) ? (body.startTime ?? '09:00') : null,
      endTime:   TIME_TYPES.has(body.type) ? (body.endTime   ?? '18:00') : null,
    },
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
    },
  })

  await logActivity({ action: 'CREATE', entity: 'VACATION', entityId: vacation.id, entityName: `${vacation.user.name} 휴가`, userId: session.user!.id, userName: session.user!.name, detail: { start: body.startDate, end: body.endDate, type: body.type } })

  return NextResponse.json(vacation, { status: 201 })
}
