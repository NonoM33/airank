'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Search,
  Building2,
  CreditCard,
  Menu,
  X,
  LogOut,
  Sparkles,
  Bell,
  BarChart2,
  Columns,
  Wrench,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertsBadge } from '@/components/dashboard/AlertsPanel'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, proOnly: false },
  { href: '/settings', label: 'Mes Marques', icon: Building2, proOnly: false },
  { href: '/scans', label: 'Scans', icon: Search, proOnly: false },
  { href: '/seo-tools', label: 'Outils SEO', icon: Wrench, proOnly: false },
  { href: '/heatmap', label: 'Heatmap', icon: BarChart2, proOnly: true },
  { href: '/compare', label: 'Comparer', icon: Columns, proOnly: true },
  { href: '/analytics', label: 'Analytics', icon: Activity, proOnly: false },
  { href: '/alerts', label: 'Alertes', icon: Bell, proOnly: false },
  { href: '/veille', label: 'Veille', icon: Activity, proOnly: false },
  { href: '/growth', label: 'Croissance', icon: TrendingUp, proOnly: false },
  { href: '/billing', label: 'Abonnement', icon: CreditCard, proOnly: false },
]

const PRO_PLANS = ['PRO', 'AGENCY']

const PLAN_BADGE: Record<string, string> = {
  FREE: 'bg-zinc-800 text-zinc-400',
  STARTER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PRO: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  AGENCY: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

interface SidebarProps {
  userName: string
  userEmail: string
  userPlan: string
  credits: number
  creditsMax: number
}

function SidebarInner({
  userName,
  userEmail,
  userPlan,
  credits,
  creditsMax,
  onClose,
}: SidebarProps & { onClose?: () => void }) {
  const pathname = usePathname()
  const pct = creditsMax > 0 ? Math.min(100, Math.round((credits / creditsMax) * 100)) : 0

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold text-xl">AIRank</span>
        </Link>
        {onClose && (
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, proOnly }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const isAlerts = href === '/alerts'
          const showProBadge = proOnly && !PRO_PLANS.includes(userPlan)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isAlerts && <AlertsBadge />}
              {showProBadge && (
                <Badge className="text-[10px] px-1.5 py-0 bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                  PRO
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Credits badge */}
      <div className="mx-4 mb-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Crédits</span>
          <span className="font-mono font-bold text-primary">{credits}</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {credits < 5 && (
          <Link href="/billing" className="block text-xs text-primary mt-1.5 hover:underline" onClick={onClose}>
            Recharger →
          </Link>
        )}
      </div>

      {/* User */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge className={`text-xs border ${PLAN_BADGE[userPlan] ?? PLAN_BADGE.FREE}`}>
            {userPlan}
          </Badge>
          {userPlan === 'FREE' || userPlan === 'STARTER' ? (
            <Link href="/billing" className="text-xs text-primary hover:underline" onClick={onClose}>
              Upgrader →
            </Link>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground gap-2"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  )
}

export function Sidebar({ userName, userEmail, userPlan, credits, creditsMax }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">AIRank</span>
        </Link>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarInner
          userName={userName}
          userEmail={userEmail}
          userPlan={userPlan}
          credits={credits}
          creditsMax={creditsMax}
          onClose={() => setOpen(false)}
        />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col">
        <SidebarInner
          userName={userName}
          userEmail={userEmail}
          userPlan={userPlan}
          credits={credits}
          creditsMax={creditsMax}
        />
      </div>
    </>
  )
}
