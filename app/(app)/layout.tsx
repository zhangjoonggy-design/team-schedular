import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar, MobileNav } from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-auto pb-16 md:pb-0">
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
