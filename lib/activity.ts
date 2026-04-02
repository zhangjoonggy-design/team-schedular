import { prisma } from './prisma'

export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE'
export type ActivityEntity = 'PROJECT' | 'TASK' | 'SUBTASK' | 'ISSUE' | 'VACATION' | 'USER'

export async function logActivity({
  action,
  entity,
  entityId,
  entityName,
  userId,
  userName,
  detail,
}: {
  action: ActivityAction
  entity: ActivityEntity
  entityId: string
  entityName: string
  userId?: string | null
  userName?: string | null
  detail?: Record<string, unknown>
}) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entity,
        entityId,
        entityName,
        userId: userId ?? null,
        userName: userName ?? null,
        detail: detail ? JSON.stringify(detail) : null,
      },
    })
  } catch {
    // 히스토리 로깅 실패가 본 작업에 영향을 주지 않도록 무시
  }
}
