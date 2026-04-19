'use client'

import { useSession } from 'next-auth/react'
import { Globe } from 'lucide-react'

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
]

export function LanguageSelector() {
  const { data: session, update } = useSession()
  const current = (session?.user as { language?: string } | undefined)?.language ?? 'fr'

  const change = async (code: string) => {
    await fetch('/api/user/language', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: code }),
    })
    await update()
  }

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
