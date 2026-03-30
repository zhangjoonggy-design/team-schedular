'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { formatDate, VACATION_TYPE_LABELS } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  endDate?: Date
  type: 'task' | 'vacation'
  color: string
  label?: string
  user?: string
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [view, setView] = useState<'month' | 'week'>('month')

  useEffect(() => {
    const fetchData = async () => {
      const [projectsRes, vacationsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/vacations'),
      ])
      const projects = await projectsRes.json()
      const vacations = await vacationsRes.json()

      const taskEvents: CalendarEvent[] = []
      for (const project of projects) {
        for (const task of project.tasks) {
          if (task.dueDate) {
            taskEvents.push({
              id: task.id,
              title: task.title,
              date: new Date(task.dueDate),
              type: 'task',
              color: project.color,
              label: project.name,
            })
          }
        }
      }

      const vacationEvents: CalendarEvent[] = vacations
        .filter((v: any) => v.status === 'APPROVED')
        .map((v: any) => ({
          id: v.id,
          title: `${v.user.name} - ${VACATION_TYPE_LABELS[v.type]}`,
          date: new Date(v.startDate),
          endDate: new Date(v.endDate),
          type: 'vacation',
          color: v.user.avatarColor,
          user: v.user.name,
        }))

      setEvents([...taskEvents, ...vacationEvents])
    }
    fetchData()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7

  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startPad + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null
    return new Date(year, month, dayNum)
  })

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => {
      const eDate = new Date(e.date)
      eDate.setHours(0, 0, 0, 0)
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)

      if (e.endDate) {
        const eEnd = new Date(e.endDate)
        eEnd.setHours(0, 0, 0, 0)
        return d >= eDate && d <= eEnd
      }
      return eDate.getTime() === d.getTime()
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="캘린더" />
      <main className="flex-1 p-4 md:p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-gray-800 text-lg">
                {year}년 {month + 1}월
              </h2>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="text-sm text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50"
            >
              오늘
            </button>
          </div>

          {/* 범례 */}
          <div className="flex gap-4 px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-indigo-500" />
              <span>과제 마감일</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-400" />
              <span>휴가</span>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {dayNames.map((d, i) => (
              <div
                key={d}
                className={cn(
                  'text-center py-2 text-xs font-medium',
                  i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              const dayEvents = date ? getEventsForDate(date) : []
              const isToday = date && date.getTime() === today.getTime()
              const isSun = i % 7 === 0
              const isSat = i % 7 === 6

              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[80px] md:min-h-[100px] p-1 border-b border-r border-gray-100',
                    !date ? 'bg-gray-50' : 'bg-white',
                    isSun ? 'border-l border-gray-100' : ''
                  )}
                >
                  {date && (
                    <>
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1',
                          isToday ? 'bg-indigo-600 text-white' : isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-700'
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id + date.getTime()}
                            className="text-xs px-1 py-0.5 rounded truncate text-white"
                            style={{ backgroundColor: event.type === 'vacation' ? '#f59e0b' : event.color }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-400 px-1">+{dayEvents.length - 3}개</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
