import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { LanguageSelector } from '@/components/dashboard/LanguageSelector'
import { BrandProvider } from '@/lib/brand-context'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user
  const plan = (user as { plan?: string }).plan ?? 'FREE'

  return (
    <BrandProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
          userName={user.name ?? user.email ?? 'Utilisateur'}
          userEmail={user.email ?? ''}
          userPlan={plan}
        />
        <div className="lg:pl-64">
          <div className="pt-14 lg:pt-0">
            <div className="sticky top-0 z-30 flex items-center justify-end gap-3 px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border">
              <LanguageSelector />
              <NotificationBell />
            </div>
            {children}
          </div>
        </div>
      </div>
    </BrandProvider>
  )
}
