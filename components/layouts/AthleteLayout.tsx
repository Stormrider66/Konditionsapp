// components/layouts/AthleteLayout.tsx
'use client'

import { useEffect, useState } from 'react'
import { MobileNav } from '@/components/navigation/MobileNav' // Keep for non-athlete roles if needed, or remove if unused
import { GlassHeader } from '@/components/athlete/GlassHeader'
import { AthleteFloatingChat } from '@/components/athlete/ai/AthleteFloatingChat'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { SportType } from '@prisma/client'
import { WorkoutThemeProvider, useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider'
import type { ThemePreferences } from '@/lib/themes/types'
import { DEFAULT_THEME_PREFERENCES } from '@/lib/themes/types'
import { cn } from '@/lib/utils'

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
    let isMounted = true
    const controller = new AbortController()

    async function fetchAthleteInfo() {
      if (!user) return

      try {
        const response = await fetch('/api/athlete/me', {
          signal: controller.signal
        })

        if (!response.ok) {
          // If we get a 404 or 500, we should probably just ignore or log quietly
          // as it might be transient or the user isn't fully set up yet.
          console.warn('Failed to fetch athlete info:', response.status)
          return
        }

        const result = await response.json()

        if (isMounted && result.success && result.data) {
          setAthleteInfo(result.data)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Ignore abort errors
          return
        }
        console.error('Error fetching athlete info:', err)
      }
    }

    fetchAthleteInfo()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [user])

  // Extract theme preferences from sport profile
  const themePreferences: ThemePreferences =
    (athleteInfo?.sportProfile?.themePreferences as ThemePreferences) || DEFAULT_THEME_PREFERENCES

  if (!user) {
    return (
      <WorkoutThemeProvider initialPreferences={DEFAULT_THEME_PREFERENCES}>
        <ThemedContent user={null} athleteInfo={null}>
          {children}
        </ThemedContent>
      </WorkoutThemeProvider>
    )
  }

  return (
    <WorkoutThemeProvider
      clientId={athleteInfo?.clientId}
      initialPreferences={themePreferences}
    >
      <ThemedContent user={user} athleteInfo={athleteInfo}>
        {children}
      </ThemedContent>
    </WorkoutThemeProvider>
  )
}

// Inner component that can use the theme hook
function ThemedContent({
  children,
  user,
  athleteInfo
}: {
  children: React.ReactNode
  user: User | null
  athleteInfo: AthleteInfo | null
}) {
  const themeContext = useWorkoutThemeOptional()
  const isDark = themeContext?.appTheme?.id === 'FITAPP_DARK'

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      isDark
        ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200"
        : "bg-gray-50"
    )}>
      {user && (
        <GlassHeader
          user={user}
          athleteName={athleteInfo?.clientName}
          clientName={athleteInfo?.clientName}
          clientId={athleteInfo?.clientId}
          sportProfile={athleteInfo?.sportProfile}
        />
      )}

      <div className="pt-16">
        {children}
      </div>

      {/* Floating AI Chat for athletes */}
      {user && athleteInfo?.clientId && (
        <AthleteFloatingChat
          clientId={athleteInfo.clientId}
          athleteName={athleteInfo.clientName}
        />
      )}
    </div>
  )
}
