'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingWizard } from './OnboardingWizard'

export function OnboardingWizardWrapper() {
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <OnboardingWizard
      onComplete={() => {
        setVisible(false)
        router.refresh()
      }}
    />
  )
}
