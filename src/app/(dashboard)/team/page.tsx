'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, UserPlus, Trash2, Mail, Copy, Check } from 'lucide-react'
import { CreditCTA } from '@/components/ui/credit-cta'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
  slug: string
  ownerId: string
  seatLimit: number
  _count: { members: number; invites: number }
  owner: { id: string; email: string; name: string | null }
}

interface Member {
  id: string
  role: string
  user: { id: string; email: string; name: string | null; image: string | null }
}

interface Invite {
  id: string
  email: string
  role: string
  token: string
  expiresAt: string
  createdAt: string
}

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selected, setSelected] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER' | 'CLIENT'>('VIEWER')
  const [planError, setPlanError] = useState(false)

  const loadTeams = () => {
    fetch('/api/teams')
      .then((r) => r.json())
      .then((d) => {
        setTeams(d.teams ?? [])
        if (d.teams?.[0] && !selected) setSelected(d.teams[0])
      })
  }

  useEffect(loadTeams, [])

  useEffect(() => {
    if (!selected) return
    fetch(`/api/teams/${selected.id}/members`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
    fetch(`/api/teams/${selected.id}/invites`)
      .then((r) => r.json())
      .then((d) => setInvites(d.invites ?? []))
  }, [selected])

  const createTeam = async () => {
    if (!newTeamName.trim()) return
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName }),
    })
    if (res.status === 402) {
      setPlanError(true)
      return
    }
    if (res.ok) {
      setNewTeamName('')
      loadTeams()
    }
  }

  const sendInvite = async () => {
    if (!selected || !inviteEmail.trim()) return
    const res = await fetch(`/api/teams/${selected.id}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    if (res.ok) {
      setInviteEmail('')
      const d = await res.json()
      fetch(`/api/teams/${selected.id}/invites`)
        .then((r) => r.json())
        .then((dd) => setInvites(dd.invites ?? []))
      if (d.inviteUrl) {
        const fullUrl = `${window.location.origin}${d.inviteUrl}`
        try {
          await navigator.clipboard.writeText(fullUrl)
          toast.success('Invitation envoyée', {
            description: 'Lien copié dans le presse-papiers',
          })
        } catch {
          // Clipboard may be denied; show the URL in the toast
          toast.success('Invitation envoyée', { description: fullUrl })
        }
      } else {
        toast.success('Invitation envoyée')
      }
    } else {
      toast.error('Échec de l\'invitation')
    }
  }

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/team/accept?token=${token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié')
    } catch {
      toast.info(url)
    }
  }

  const removeMember = async (userId: string) => {
    if (!selected) return
    if (!confirm('Retirer ce membre ?')) return
    await fetch(`/api/teams/${selected.id}/members?userId=${userId}`, { method: 'DELETE' })
    fetch(`/api/teams/${selected.id}/members`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Équipe</h1>
          <p className="text-sm text-muted-foreground">
            Collaborez avec votre équipe ou vos clients
          </p>
        </div>
      </div>

      {planError && <CreditCTA variant="banner" message="Les équipes nécessitent Starter+" />}

      {teams.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="font-semibold mb-3">Créer votre première équipe</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Nom de l'équipe"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={createTeam}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Créer
            </button>
          </div>
        </div>
      )}

      {teams.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selected?.id === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:bg-accent'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat label="Membres" value={`${members.length} / ${selected.seatLimit}`} />
            <Stat label="Invitations en attente" value={String(invites.length)} />
            <Stat
              label="Sièges utilisés"
              value={
                selected.seatLimit > 0
                  ? `${Math.round((members.length / selected.seatLimit) * 100)}%`
                  : '—'
              }
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-5 mb-6">
            <h2 className="font-semibold mb-3">Inviter un membre</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemple.com"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'EDITOR' | 'VIEWER' | 'CLIENT')}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
                <option value="CLIENT">Client (read-only)</option>
              </select>
              <button
                onClick={sendInvite}
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" /> Inviter
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card mb-6">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-semibold text-sm">Membres</h2>
            </div>
            <ul className="divide-y divide-border/40">
              {members.map((m) => (
                <li key={m.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{m.user.name ?? m.user.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.user.email} · <span className="text-primary">{m.role}</span>
                    </div>
                  </div>
                  {m.role !== 'OWNER' && (
                    <button
                      onClick={() => removeMember(m.user.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {invites.length > 0 && (
            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="font-semibold text-sm">Invitations en attente</h2>
              </div>
              <ul className="divide-y divide-border/40">
                {invites.map((i) => (
                  <li key={i.id} className="px-5 py-3 flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{i.email}</span>
                    <span className="text-xs text-muted-foreground">{i.role}</span>
                    <button
                      onClick={() => copyInviteLink(i.token)}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-accent inline-flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copier
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}
