'use client'
import { useState, useEffect, useRef } from 'react'
import { Share2, Lock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ShareToUnlockProps {
  score: number
  brandName: string
  children: React.ReactNode
}

const STORAGE_KEY_PREFIX = 'airank-shared-'

function getStorageKey(brandName: string, score: number) {
  return `${STORAGE_KEY_PREFIX}${brandName}-${score}`
}

export function ShareToUnlock({ score, brandName, children }: ShareToUnlockProps) {
  const [shared, setShared] = useState(false)
  const windowRef = useRef<Window | null>(null)
  const storageKey = getStorageKey(brandName, score)

  // Check if already shared from a previous session
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === 'true') {
        setShared(true)
      }
    } catch {
      // localStorage not available (SSR or blocked)
    }
  }, [storageKey])

  // Listen for window focus to detect return from LinkedIn share
  useEffect(() => {
    function handleFocus() {
      if (windowRef.current && !windowRef.current.closed) {
        // User returned from LinkedIn — mark as shared
        try {
          localStorage.setItem(storageKey, 'true')
        } catch {
          // ignore
        }
        setShared(true)
        windowRef.current = null
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [storageKey])

  function handleShare() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const ogUrl = `${appUrl}/api/og/score?brand=${encodeURIComponent(brandName)}&score=${score}`
    const shareUrl = `${appUrl}/scan?brand=${encodeURIComponent(brandName)}&score=${score}`
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(`Mon score de visibilité IA : ${score}/100 — ${ogUrl}`)}`

    const popup = window.open(linkedInUrl, 'linkedin-share', 'width=600,height=600,noopener')
    if (popup) {
      windowRef.current = popup
    } else {
      // Popup blocked — mark shared immediately so user isn't blocked
      try {
        localStorage.setItem(storageKey, 'true')
      } catch {
        // ignore
      }
      setShared(true)
    }
  }

  if (shared) {
    return (
      <div>
        <div className="flex items-center gap-2 text-green-400 text-sm mb-4 p-3 bg-green-400/10 rounded-lg border border-green-400/20">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Rapport complet débloqué — merci pour le partage !</span>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div>
      <Card className="bg-[#141416] border-indigo-500/30 border-2">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-sm">
                Rapport détaillé disponible gratuitement
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                Partagez votre score sur LinkedIn pour débloquer le rapport complet gratuitement.
              </p>
            </div>
          </div>

          <Button
            onClick={handleShare}
            className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white gap-2"
          >
            <Share2 className="h-4 w-4" />
            Partager sur LinkedIn — Score {score}/100
          </Button>

          {/* Blurred preview of children */}
          <div className="relative overflow-hidden rounded-lg" style={{ maxHeight: '200px' }}>
            <div className="opacity-20 pointer-events-none select-none">
              {children}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#141416]" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
