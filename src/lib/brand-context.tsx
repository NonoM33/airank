'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface BrandOption {
  id: string
  name: string
  domain?: string | null
  sector?: string | null
}

interface BrandContextValue {
  brands: BrandOption[]
  currentBrandId: string | null
  currentBrand: BrandOption | null
  setCurrentBrandId: (id: string) => void
  refresh: () => Promise<void>
  loading: boolean
}

const STORAGE_KEY = 'airank:currentBrandId'

const BrandContext = createContext<BrandContextValue | null>(null)

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [currentBrandId, setCurrentBrandIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/brands')
      if (!res.ok) return
      const data: BrandOption[] = await res.json()
      setBrands(data)

      // Resolve initial selection: localStorage > first brand > null
      let initial: string | null = null
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (stored && data.some((b) => b.id === stored)) {
          initial = stored
        }
      }
      if (!initial && data[0]) initial = data[0].id
      setCurrentBrandIdState(initial)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setCurrentBrandId = useCallback((id: string) => {
    setCurrentBrandIdState(id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id)
    }
  }, [])

  const currentBrand = brands.find((b) => b.id === currentBrandId) ?? null

  return (
    <BrandContext.Provider
      value={{
        brands,
        currentBrandId,
        currentBrand,
        setCurrentBrandId,
        refresh: load,
        loading,
      }}
    >
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext)
  if (!ctx) {
    throw new Error('useBrand must be used within a BrandProvider')
  }
  return ctx
}

/**
 * Safe variant: returns null if the provider isn't mounted (useful for
 * components that may render both inside and outside the dashboard shell).
 */
export function useBrandOptional(): BrandContextValue | null {
  return useContext(BrandContext)
}
