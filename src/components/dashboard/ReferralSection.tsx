'use client'
import { useState, useEffect } from 'react'
import { Copy, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ReferralData {
  referralCode: string
  referrals: {
    id: string
    code: string
    usedAt: string | null
    rewardGranted: boolean
    referredUser: { email: string } | null
  }[]
}

export function ReferralSection() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/referral')
      .then((r) => r.json())
      .then((d: ReferralData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="bg-[#141416] border-[#27272A]">
        <CardContent className="p-6">
          <div className="h-24 animate-pulse bg-[#27272A] rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const referralLink = `${appUrl}/signup?ref=${data.referralCode}`
  const inviteCount = data.referrals.filter((r) => r.usedAt).length
  const GOAL = 1

  function handleCopy() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card className="bg-[#141416] border-[#27272A]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="h-5 w-5 text-indigo-400" />
          Programme de Parrainage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-400">
          Invitez un ami et recevez chacun <span className="text-indigo-400 font-semibold">500 crédits</span> (1 mois offert) !
        </p>

        {/* Referral link */}
        <div className="flex gap-2">
          <code className="flex-1 bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-sm text-zinc-300 overflow-x-auto whitespace-nowrap">
            {referralLink}
          </code>
          <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">{inviteCount} personne{inviteCount > 1 ? 's' : ''} invitée{inviteCount > 1 ? 's' : ''}</span>
            <span className="text-zinc-400">{GOAL} pour la récompense</span>
          </div>
          <Progress value={(inviteCount / GOAL) * 100} className="h-2" />
        </div>

        {/* Referrals list */}
        {data.referrals.length > 0 && (
          <div className="space-y-1">
            {data.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {r.referredUser?.email ?? r.code}
                </span>
                <span className={r.rewardGranted ? 'text-green-400' : 'text-zinc-500'}>
                  {r.rewardGranted ? '✓ Récompensé' : r.usedAt ? 'Actif' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
