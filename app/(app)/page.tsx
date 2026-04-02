import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/Header'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDate, STATUS_LABELS, VACATION_TYPE_LABELS } from '@/lib/utils'
import Link from 'next/link'

async function getDashboardData() {
  const [projects, issues, issueCount, riskCount, vacations, tasks, members] = await Promise.all([
    prisma.project.findMany({
      include: {
        tasks: {
          include: {
            subTasks: true,
            assignees: { include: { user: { select: { id: true } } } },
          },
        },
        _count: { select: { issues: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.issue.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: {
        project: { select: { name: true, color: true } },
        reporter: { select: { name: true, avatarColor: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.issue.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, type: 'ISSUE' } }),
    prisma.issue.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, type: 'RISK' } }),
    prisma.vacationRequest.findMany({
      where: {
        status: 'APPROVED',
        endDate: { gte: new Date() },
        startDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      include: { user: { select: { name: true, avatarColor: true } } },
      orderBy: { startDate: 'asc' },
    }),
    prisma.task.findMany({
      where: {
        status: { notIn: ['DONE'] },
        dueDate: { lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), gte: new Date() },
        assignees: { some: {} },
      },
      include: {
        project: { select: { name: true, color: true } },
        assignees: { include: { user: { select: { name: true, avatarColor: true } } } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    // 투입인력: 진행 중 과제가 있는 팀원 수
    prisma.user.count({
      where: { taskAssignments: { some: { task: { status: { notIn: ['DONE'] } } } } },
    }),
  ])

  const projectsWithProgress = projects.map((p) => {
    const allTasks = [...p.tasks, ...p.tasks.flatMap((t) => t.subTasks)]
    const total = allTasks.reduce((s, t) => s + (t.estimatedHours ?? 1), 0)
    const weighted = allTasks.reduce((s, t) => s + t.progressPercent * (t.estimatedHours ?? 1), 0)
    const progress = total > 0 ? Math.round(weighted / total) : 0
    const assigneeIds = new Set(p.tasks.flatMap((t) => t.assignees.map((a) => a.user.id)))
    return { ...p, progress, memberCount: assigneeIds.size }
  })

  return { projects: projectsWithProgress, issues, issueCount, riskCount, vacations, tasks, memberCount: members }
}

export default async function DashboardPage() {
  const session = await auth()
  const { projects, issues, issueCount, riskCount, vacations, tasks, memberCount } = await getDashboardData()

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE')

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="대시보드" />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">진행중 프로젝트</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{activeProjects.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">이슈</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{issueCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">리스크</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{riskCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">투입인력</p>
            <p className="text-2xl font-bold text-teal-500 mt-1">{memberCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">이번주 휴가자</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{vacations.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-xs text-gray-500">2주내 마감 과제</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{tasks.length}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 프로젝트 진척율 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">프로젝트 진척율</h3>
              <Link href="/projects" className="text-xs text-indigo-600 hover:underline">전체 보기</Link>
            </div>
            <div className="space-y-4">
              {projects.slice(0, 5).map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 truncate">{p.name}</span>
                      {p.memberCount > 0 && (
                        <span className="text-xs text-indigo-500 font-medium flex-shrink-0">{p.memberCount}명</span>
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <ProgressBar value={p.progress} size="sm" />
                </Link>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">프로젝트가 없습니다</p>
              )}
            </div>
          </div>

          {/* 이슈 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">이슈</h3>
              <Link href="/issues" className="text-xs text-indigo-600 hover:underline">전체 보기</Link>
            </div>
            <div className="space-y-3">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: issue.project.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{issue.title}</p>
                    <p className="text-xs text-gray-500">{issue.project.name}</p>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
              ))}
              {issues.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">이슈 없음</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 마감 임박 과제 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-4">마감 임박 과제 (14일 이내)</h3>
            <div className="space-y-3">
              {tasks.map((task) => {
                const daysLeft = task.dueDate
                  ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000)
                  : null
                return (
                  <div key={task.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.project.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`text-xs font-medium ${daysLeft !== null && daysLeft <= 3 ? 'text-red-500' : 'text-orange-500'}`}>
                        {daysLeft !== null ? `D-${daysLeft}` : '-'}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(task.dueDate)}</p>
                    </div>
                  </div>
                )
              })}
              {tasks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">마감 임박 과제 없음</p>
              )}
            </div>
          </div>

          {/* 이번주 휴가 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">이번주 휴가</h3>
              <Link href="/vacations" className="text-xs text-indigo-600 hover:underline">전체 보기</Link>
            </div>
            <div className="space-y-3">
              {vacations.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <UserAvatar name={v.user.name} avatarColor={v.user.avatarColor} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{v.user.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(v.startDate)} ~ {formatDate(v.endDate)} · {VACATION_TYPE_LABELS[v.type]}
                    </p>
                  </div>
                </div>
              ))}
              {vacations.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">이번주 휴가자 없음</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
