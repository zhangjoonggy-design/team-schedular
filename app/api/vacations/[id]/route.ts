import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const vacation = await prisma.vacationRequest.update({
    where: { id },
    data: { status: body.status },
    include: { user: { select: { name: true } } },
  })

  await logActivity({ action: 'UPDATE', entity: 'VACATION', entityId: vacation.id, entityName: `${vacation.user.name} 휴가`, userId: session.user!.id, userName: session.user!.name, detail: { status: body.status } })

  return NextResponse.json(vacation)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const vacation = await prisma.vacationRequest.findUnique({ where: { id }, include: { user: { select: { name: true } } } })
  await prisma.vacationRequest.delete({ where: { id } })
  await logActivity({ action: 'DELETE', entity: 'VACATION', entityId: id, entityName: vacation ? `${vacation.user.name} 휴가` : id, userId: session.user!.id, userName: session.user!.name })

  return NextResponse.json({ success: true })
}
