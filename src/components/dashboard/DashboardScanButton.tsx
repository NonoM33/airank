'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ScanLine, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Brand {
  id: string
  name: string
  keywords: string[]
  domain: string | null
}

interface Props {
  brand: Brand
}

export function DashboardScanButton({ brand }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleScanAll() {
    if (brand.keywords.length === 0) return
    setLoading(true)
    try {
      const results = await Promise.allSettled(
        brand.keywords.map((kw) =>
          fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brandId: brand.id, query: kw }),
          }).then((r) => r.json())
        )
      )
      const firstOk = results.find(
        (r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<{ scan: { id: string } }>).value?.scan?.id
      )
      if (firstOk && firstOk.status === 'fulfilled') {
        router.push(`/scans/${(firstOk as PromiseFulfilledResult<{ scan: { id: string } }>).value.scan.id}`)
      } else {
        router.push('/scans')
        router.refresh()
      }
    } catch {
      setLoading(false)
    }
  }

  if (brand.keywords.length === 0) {
    return (
      <Link href="/settings">
        <Button variant="outline" className="gap-2 h-10">
          <Settings2 className="h-4 w-4" />
          Configurer ma marque
        </Button>
      </Link>
    )
  }

  return (
    <Button onClick={handleScanAll} disabled={loading} className="gap-2 h-10">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyse en cours...
        </>
      ) : (
        <>
          <ScanLine className="h-4 w-4" />
          Scanner {brand.name}
        </>
      )}
    </Button>
  )
}
