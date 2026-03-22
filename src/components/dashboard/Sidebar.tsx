'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Search,
  Users,
  FileText,
  Settings,
  CreditCard,
  Menu,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scans', label: 'Scans', icon: Search },
  { href: '/competitors', label: 'Concurrents', icon: Users },
  { href: '/reports', label: 'Rapports', icon: FileText },
  { href: '/settings', label: 'Paramètres', icon: Settings },
  { href: '/billing', label: 'Facturation', icon: CreditCard },
]

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
}

function SidebarInner({
  userName,
  userEmail,
  userPlan,
  onClose,
}: SidebarProps & { onClose?: () => void }) {
  const pathname = usePathname()

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
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
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
              {label}
            </Link>
          )
        })}
      </nav>

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
            <Link href="/billing" className="text-xs text-primary hover:underline">
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

export function Sidebar({ userName, userEmail, userPlan }: SidebarProps) {
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
          onClose={() => setOpen(false)}
        />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col">
        <SidebarInner userName={userName} userEmail={userEmail} userPlan={userPlan} />
      </div>
    </>
  )
}
