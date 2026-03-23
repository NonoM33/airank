import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user
  const plan = (user as { plan?: string }).plan ?? 'FREE'

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userName={user.name ?? user.email ?? 'Utilisateur'}
        userEmail={user.email ?? ''}
        userPlan={plan}
      />
      <div className="lg:pl-64">
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </div>
    </div>
  )
}
