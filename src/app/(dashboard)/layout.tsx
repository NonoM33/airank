import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { PLAN_CREDITS } from '@/lib/credits'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user
  const plan = (user as { plan?: string }).plan ?? 'FREE'

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { credits: true },
  })

  const credits = dbUser?.credits ?? 0
  const creditsMax = PLAN_CREDITS[(plan as keyof typeof PLAN_CREDITS) in PLAN_CREDITS
    ? (plan as keyof typeof PLAN_CREDITS)
    : 'FREE']

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userName={user.name ?? user.email ?? 'Utilisateur'}
        userEmail={user.email ?? ''}
        userPlan={plan}
        credits={credits}
        creditsMax={creditsMax}
      />
      <div className="lg:pl-64">
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </div>
    </div>
  )
}
