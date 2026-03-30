import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const count = await prisma.user.count()
  if (count > 0) {
    console.log('데이터가 이미 있습니다.')
    return
  }

  const pw = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: { name: '관리자', email: 'admin@company.com', passwordHash: pw, role: 'ADMIN', avatarColor: '#6366f1' }
  })
  const user1 = await prisma.user.create({
    data: { name: '김철수', email: 'kim@company.com', passwordHash: pw, role: 'MEMBER', avatarColor: '#22c55e' }
  })
  const user2 = await prisma.user.create({
    data: { name: '이영희', email: 'lee@company.com', passwordHash: pw, role: 'MEMBER', avatarColor: '#f59e0b' }
  })
  const user3 = await prisma.user.create({
    data: { name: '박민준', email: 'park@company.com', passwordHash: pw, role: 'MEMBER', avatarColor: '#ef4444' }
  })

  const project1 = await prisma.project.create({
    data: {
      name: '고객 포털 리뉴얼', description: '고객 포털 UI/UX 전면 개편 프로젝트',
      color: '#6366f1', status: 'ACTIVE',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'), ownerId: admin.id
    }
  })
  const project2 = await prisma.project.create({
    data: {
      name: 'API 고도화', description: 'REST API 성능 개선 및 신규 엔드포인트 개발',
      color: '#22c55e', status: 'ACTIVE',
      startDate: new Date('2026-02-01'), endDate: new Date('2026-08-31'), ownerId: user1.id
    }
  })

  const task1 = await prisma.task.create({
    data: { projectId: project1.id, title: '요구사항 분석', status: 'DONE', priority: 'HIGH', progressPercent: 100, startDate: new Date('2026-01-01'), dueDate: new Date('2026-01-31'), estimatedHours: 40 }
  })
  const task2 = await prisma.task.create({
    data: { projectId: project1.id, title: 'UI 디자인', status: 'IN_PROGRESS', priority: 'HIGH', progressPercent: 70, startDate: new Date('2026-02-01'), dueDate: new Date('2026-04-30'), estimatedHours: 80 }
  })
  const task3 = await prisma.task.create({
    data: { projectId: project1.id, parentTaskId: task2.id, title: '메인 화면 디자인', status: 'DONE', priority: 'MEDIUM', progressPercent: 100, estimatedHours: 20 }
  })
  const task4 = await prisma.task.create({
    data: { projectId: project1.id, parentTaskId: task2.id, title: '대시보드 디자인', status: 'IN_PROGRESS', priority: 'MEDIUM', progressPercent: 40, estimatedHours: 20 }
  })
  const task5 = await prisma.task.create({
    data: { projectId: project1.id, title: '프론트엔드 개발', status: 'TODO', priority: 'HIGH', progressPercent: 0, startDate: new Date('2026-04-01'), dueDate: new Date('2026-05-31'), estimatedHours: 120 }
  })
  const task6 = await prisma.task.create({
    data: { projectId: project2.id, title: 'API 성능 분석', status: 'DONE', priority: 'MEDIUM', progressPercent: 100, estimatedHours: 20 }
  })
  const task7 = await prisma.task.create({
    data: { projectId: project2.id, title: '캐싱 레이어 개선', status: 'IN_PROGRESS', priority: 'HIGH', progressPercent: 50, dueDate: new Date('2026-04-30'), estimatedHours: 60 }
  })

  await prisma.taskAssignee.createMany({
    data: [
      { taskId: task2.id, userId: user2.id },
      { taskId: task3.id, userId: user2.id },
      { taskId: task4.id, userId: user2.id },
      { taskId: task5.id, userId: user1.id },
      { taskId: task5.id, userId: user3.id },
      { taskId: task6.id, userId: user1.id },
      { taskId: task7.id, userId: user1.id },
      { taskId: task7.id, userId: user3.id },
    ]
  })

  await prisma.issue.create({
    data: { projectId: project1.id, taskId: task2.id, reporterId: user2.id, assigneeId: admin.id, title: '반응형 레이아웃 깨짐 이슈', description: '모바일 환경에서 UI가 올바르게 표시되지 않음', severity: 'HIGH', status: 'OPEN' }
  })
  await prisma.issue.create({
    data: { projectId: project2.id, taskId: task7.id, reporterId: user1.id, title: 'Redis 연결 타임아웃', description: '특정 상황에서 Redis 연결이 지연됨', severity: 'CRITICAL', status: 'IN_PROGRESS' }
  })

  await prisma.vacationRequest.create({
    data: { userId: user2.id, startDate: new Date('2026-04-01'), endDate: new Date('2026-04-03'), type: 'ANNUAL', status: 'APPROVED', note: '개인 휴가' }
  })
  await prisma.vacationRequest.create({
    data: { userId: user3.id, startDate: new Date('2026-04-10'), endDate: new Date('2026-04-10'), type: 'HALF_DAY', status: 'PENDING' }
  })

  console.log('✅ 초기 데이터 생성 완료!')
  console.log('  계정: admin@company.com / password123')
  console.log('  계정: kim@company.com / password123')
  console.log('  계정: lee@company.com / password123')
  console.log('  계정: park@company.com / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
