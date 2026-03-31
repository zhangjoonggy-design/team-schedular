import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entity = searchParams.get('entity')       // PROJECT | TASK | ISSUE | VACATION | USER | null(전체)
  const startDate = searchParams.get('startDate') // YYYY-MM-DD
  const endDate = searchParams.get('endDate')     // YYYY-MM-DD

  const logs = await prisma.activityLog.findMany({
    where: {
      ...(entity ? { entity } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
        },
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return NextResponse.json(logs)
}
