'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportButtonProps {
  brandId: string
  brandName: string
  plan: string
}

const PRO_PLANS = ['PRO', 'AGENCY']

export function ExportButton({ brandId, brandName, plan }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const canExport = PRO_PLANS.includes(plan)

  async function handleExport() {
    if (!canExport || loading) return
    setLoading(true)
    try {
      const url = `/api/export?brandId=${encodeURIComponent(brandId)}&format=csv`
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Erreur lors de l\'export')
        return
      }
      const blob = await res.blob()
      const dateStr = new Date().toISOString().slice(0, 10)
      const filename = `airank-export-${brandName}-${dateStr}.csv`
      const anchor = document.createElement('a')
      anchor.href = URL.createObjectURL(blob)
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(anchor.href)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div title={!canExport ? 'Fonctionnalité Pro' : undefined}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={!canExport || loading}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {loading ? 'Export…' : 'Export CSV'}
      </Button>
    </div>
  )
}
