import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const result = await prisma.user.updateMany({
      where: { position: 'SM개발' },
      data: { position: 'SM운영직원' },
    })
    return NextResponse.json({ message: `SM개발 → SM운영직원 변경 완료: ${result.count}명` })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
