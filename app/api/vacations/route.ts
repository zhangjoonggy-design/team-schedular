import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const vacation = await prisma.vacationRequest.create({
    data: {
      userId: session.user!.id!,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      type: body.type ?? 'ANNUAL',
      status: 'PENDING',
      note: body.note,
    },
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
    },
  })

  return NextResponse.json(vacation, { status: 201 })
}
