'use client'

import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { CreditCTA } from '@/components/ui/credit-cta'

interface WhiteLabelConfig {
  companyName?: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  accentColor?: string
  customDomain?: string
  supportEmail?: string
  footerText?: string
  hideAirankBranding?: boolean
  customCss?: string
}

export default function WhiteLabelPage() {
  const [config, setConfig] = useState<WhiteLabelConfig>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [planError, setPlanError] = useState(false)

  useEffect(() => {
    fetch('/api/white-label')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/white-label', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (res.status === 402) {
      setPlanError(true)
    } else if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  const update = (field: keyof WhiteLabelConfig, value: string | boolean) => {
    setConfig((c) => ({ ...c, [field]: value }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">White-label</h1>
          <p className="text-sm text-muted-foreground">
            Personnalisez l'apparence pour vos clients (plan Agency)
          </p>
        </div>
      </div>

      {planError && (
        <CreditCTA variant="banner" message="White-label réservé au plan Agency" />
      )}

      <div className="space-y-6">
        <Section title="Identité">
          <Field label="Nom de l'entreprise">
            <input
              type="text"
              value={config.companyName ?? ''}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder="Mon Agence"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="URL du logo (HTTPS)">
            <input
              type="url"
              value={config.logoUrl ?? ''}
              onChange={(e) => update('logoUrl', e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            {config.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt="Logo" className="mt-2 h-12 rounded" />
            )}
          </Field>
          <Field label="URL du favicon">
            <input
              type="url"
              value={config.faviconUrl ?? ''}
              onChange={(e) => update('faviconUrl', e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
        </Section>

        <Section title="Couleurs">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Couleur principale">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.primaryColor ?? '#5B47E0'}
                  onChange={(e) => update('primaryColor', e.target.value)}
                  className="h-9 w-14 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={config.primaryColor ?? ''}
                  onChange={(e) => update('primaryColor', e.target.value)}
                  placeholder="#5B47E0"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
            </Field>
            <Field label="Couleur d'accent">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.accentColor ?? '#10B981'}
                  onChange={(e) => update('accentColor', e.target.value)}
                  className="h-9 w-14 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={config.accentColor ?? ''}
                  onChange={(e) => update('accentColor', e.target.value)}
                  placeholder="#10B981"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
            </Field>
          </div>
        </Section>

        <Section title="Domaine personnalisé">
          <Field label="Votre domaine (ex: app.moncabinet.fr)">
            <input
              type="text"
              value={config.customDomain ?? ''}
              onChange={(e) => update('customDomain', e.target.value)}
              placeholder="app.moncabinet.fr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pointez un CNAME vers <code className="bg-background px-1.5 py-0.5 rounded">custom.airank.ai</code>
            </p>
          </Field>
        </Section>

        <Section title="Contact & branding">
          <Field label="Email de support">
            <input
              type="email"
              value={config.supportEmail ?? ''}
              onChange={(e) => update('supportEmail', e.target.value)}
              placeholder="support@moncabinet.fr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Texte de footer">
            <input
              type="text"
              value={config.footerText ?? ''}
              onChange={(e) => update('footerText', e.target.value)}
              placeholder="© 2026 Mon Agence"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={config.hideAirankBranding ?? false}
                onChange={(e) => update('hideAirankBranding', e.target.checked)}
                className="rounded"
              />
              Masquer le branding AIRank dans les rapports clients
            </label>
          </Field>
        </Section>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saved && <span className="text-sm text-green-500">✓ Enregistré</span>}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>}
      {children}
    </div>
  )
}
