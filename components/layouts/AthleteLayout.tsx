// components/layouts/AthleteLayout.tsx
'use client'

import { useEffect, useState } from 'react'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { SportType } from '@prisma/client'
import { WorkoutThemeProvider } from '@/lib/themes/ThemeProvider'
import type { ThemePreferences } from '@/lib/themes/types'
import { DEFAULT_THEME_PREFERENCES } from '@/lib/themes/types'

interface SportProfile {
  id: string
  clientId: string
  primarySport: SportType
  secondarySports: SportType[]
  onboardingCompleted: boolean
  themePreferences?: ThemePreferences | null
}

interface AthleteInfo {
  clientId: string
  clientName: string
  sportProfile: SportProfile | null
}

export function AthleteLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  useEffect(() => {
    if (user) {
      // Fetch athlete info including sport profile
      fetch('/api/athlete/me')
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setAthleteInfo(result.data)
          }
        })
        .catch((err) => {
          console.error('Error fetching athlete info:', err)
        })
    }
  }, [user])

  // Extract theme preferences from sport profile
  const themePreferences: ThemePreferences =
    (athleteInfo?.sportProfile?.themePreferences as ThemePreferences) || DEFAULT_THEME_PREFERENCES

  if (!user) {
    return (
      <WorkoutThemeProvider initialPreferences={DEFAULT_THEME_PREFERENCES}>
        <div className="min-h-screen bg-gray-50">{children}</div>
      </WorkoutThemeProvider>
    )
  }

  return (
    <WorkoutThemeProvider
      clientId={athleteInfo?.clientId}
      initialPreferences={themePreferences}
    >
      <div className="min-h-screen bg-gray-50">
        <MobileNav
          user={user}
          userRole="ATHLETE"
          sportProfile={athleteInfo?.sportProfile}
          clientId={athleteInfo?.clientId}
        />
        <div>{children}</div>
      </div>
    </WorkoutThemeProvider>
  )
}
