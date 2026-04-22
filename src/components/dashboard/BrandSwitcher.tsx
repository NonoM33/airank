'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Building2, ChevronsUpDown, Check, Plus, Search } from 'lucide-react'
import { useBrand } from '@/lib/brand-context'

export function BrandSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { brands, currentBrand, currentBrandId, setCurrentBrandId, loading } = useBrand()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filtered =
    query.trim().length === 0
      ? brands
      : brands.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))

  const select = (id: string) => {
    setCurrentBrandId(id)
    setOpen(false)
    // No navigation — all pages reading useBrand() will re-render contextually.
  }

  if (loading) {
    return (
      <div className="mx-3 mb-3 h-10 rounded-lg border border-border bg-card/50 animate-pulse" />
    )
  }

  if (brands.length === 0) {
    return (
      <Link
        href="/settings"
        onClick={onNavigate}
        className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Créer ma première marque
      </Link>
    )
  }

  return (
    <div className="relative mx-3 mb-3" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2 rounded-lg border border-border bg-card/80 hover:bg-accent transition-colors px-3 py-2 text-left"
      >
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">Marque</div>
          <div className="text-sm font-medium truncate leading-tight mt-0.5">
            {currentBrand?.name ?? 'Sélectionner une marque'}
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden"
          role="listbox"
        >
          {brands.length > 5 && (
            <div className="relative px-2 py-2 border-b border-border">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="w-full bg-background border border-border rounded-md pl-7 pr-2 py-1.5 text-xs"
              />
            </div>
          )}

          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground text-center">Aucune marque</li>
            ) : (
              filtered.map((b) => {
                const selected = b.id === currentBrandId
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => select(b.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${
                        selected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-bold uppercase text-muted-foreground">
                        {b.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate leading-tight">{b.name}</div>
                        {b.domain && (
                          <div className="text-[10px] text-muted-foreground truncate leading-tight">
                            {b.domain}
                          </div>
                        )}
                      </div>
                      {selected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          <Link
            href="/settings"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-accent border-t border-border"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une marque
          </Link>
        </div>
      )}
    </div>
  )
}
