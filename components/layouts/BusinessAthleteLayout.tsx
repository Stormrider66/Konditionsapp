// components/layouts/BusinessAthleteLayout.tsx
'use client'

import { useEffect, useState } from 'react'
import { BusinessAthleteHeader } from '@/components/athlete/BusinessAthleteHeader'
import { AthleteFloatingChat } from '@/components/athlete/ai/AthleteFloatingChat'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { SportType } from '@prisma/client'
import { PageContextProvider } from '@/components/ai-studio/PageContextProvider'
import { WorkoutThemeProvider, useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider'
import type { ThemePreferences } from '@/lib/themes/types'
import { DEFAULT_THEME_PREFERENCES } from '@/lib/themes/types'
import { cn } from '@/lib/utils'
import { BasePathProvider } from '@/lib/contexts/BasePathContext'

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

interface BusinessAthleteLayoutProps {
  children: React.ReactNode
  businessSlug: string
  businessName: string
  businessLogo: string | null
  businessColor: string | null
}

export function BusinessAthleteLayout({
  children,
  businessSlug,
  businessName,
  businessLogo,
  businessColor,
}: BusinessAthleteLayoutProps) {
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
          console.warn('Failed to fetch athlete info:', response.status)
          return
        }

        const result = await response.json()

        if (isMounted && result.success && result.data) {
          setAthleteInfo(result.data)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
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

  const basePath = `/${businessSlug}`

  if (!user) {
    return (
      <BasePathProvider basePath={basePath}>
        <WorkoutThemeProvider initialPreferences={DEFAULT_THEME_PREFERENCES}>
          <ThemedContent
            user={null}
            athleteInfo={null}
            businessSlug={businessSlug}
            businessName={businessName}
            businessLogo={businessLogo}
            businessColor={businessColor}
          >
            {children}
          </ThemedContent>
        </WorkoutThemeProvider>
      </BasePathProvider>
    )
  }

  return (
    <BasePathProvider basePath={basePath}>
      <WorkoutThemeProvider
        clientId={athleteInfo?.clientId}
        initialPreferences={themePreferences}
      >
        <PageContextProvider>
          <ThemedContent
            user={user}
            athleteInfo={athleteInfo}
            businessSlug={businessSlug}
            businessName={businessName}
            businessLogo={businessLogo}
            businessColor={businessColor}
          >
            {children}
          </ThemedContent>
        </PageContextProvider>
      </WorkoutThemeProvider>
    </BasePathProvider>
  )
}

// Inner component that can use the theme hook
function ThemedContent({
  children,
  user,
  athleteInfo,
  businessSlug,
  businessName,
  businessLogo,
  businessColor,
}: {
  children: React.ReactNode
  user: User | null
  athleteInfo: AthleteInfo | null
  businessSlug: string
  businessName: string
  businessLogo: string | null
  businessColor: string | null
}) {
  const themeContext = useWorkoutThemeOptional()
  const isDark = themeContext?.appTheme?.id === 'FITAPP_DARK'

  // Apply custom business color as CSS variable if provided
  const customStyle = businessColor
    ? { '--business-primary': businessColor } as React.CSSProperties
    : undefined

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300",
        isDark
          ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200"
          : "bg-gray-50"
      )}
      style={customStyle}
    >
      {user && (
        <BusinessAthleteHeader
          user={user}
          athleteName={athleteInfo?.clientName}
          clientName={athleteInfo?.clientName}
          clientId={athleteInfo?.clientId}
          sportProfile={athleteInfo?.sportProfile}
          businessSlug={businessSlug}
          businessName={businessName}
          businessLogo={businessLogo}
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
