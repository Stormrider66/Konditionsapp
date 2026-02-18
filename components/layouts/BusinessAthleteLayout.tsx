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
import { BusinessBrandingProvider } from '@/lib/contexts/BusinessBrandingContext'
import type { BusinessBranding } from '@/lib/branding/types'
import { PLATFORM_NAME } from '@/lib/branding/types'
import { DynamicFontLoader } from '@/components/branding/DynamicFontLoader'

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
  branding?: BusinessBranding | null
}

export function BusinessAthleteLayout({
  children,
  businessSlug,
  businessName,
  businessLogo,
  businessColor,
  branding,
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

  const content = !user ? (
    <BasePathProvider basePath={basePath}>
      <WorkoutThemeProvider initialPreferences={DEFAULT_THEME_PREFERENCES}>
        <ThemedContent
          user={null}
          athleteInfo={null}
          businessSlug={businessSlug}
          businessName={businessName}
          businessLogo={businessLogo}
          businessColor={businessColor}
          branding={branding}
        >
          {children}
        </ThemedContent>
      </WorkoutThemeProvider>
    </BasePathProvider>
  ) : (
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
            branding={branding}
          >
            {children}
          </ThemedContent>
        </PageContextProvider>
      </WorkoutThemeProvider>
    </BasePathProvider>
  )

  if (branding) {
    return (
      <BusinessBrandingProvider branding={branding}>
        {content}
      </BusinessBrandingProvider>
    )
  }

  return content
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
  branding,
}: {
  children: React.ReactNode
  user: User | null
  athleteInfo: AthleteInfo | null
  businessSlug: string
  businessName: string
  businessLogo: string | null
  businessColor: string | null
  branding?: BusinessBranding | null
}) {
  const themeContext = useWorkoutThemeOptional()
  const isDark = themeContext?.appTheme?.id === 'FITAPP_DARK'

  // Build CSS custom properties from branding
  const customStyle: Record<string, string> = {}
  if (businessColor) {
    customStyle['--business-primary'] = businessColor
  }
  if (branding?.secondaryColor) {
    customStyle['--business-secondary'] = branding.secondaryColor
  }
  if (branding?.backgroundColor) {
    customStyle['--business-bg-tint'] = branding.backgroundColor
  }
  if (branding?.fontFamily) {
    customStyle['--business-font'] = branding.fontFamily
    customStyle['fontFamily'] = `'${branding.fontFamily}', sans-serif`
  }

  const hasCustomStyle = Object.keys(customStyle).length > 0

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300",
        isDark
          ? "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200"
          : "bg-gray-50"
      )}
      style={hasCustomStyle ? customStyle as React.CSSProperties : undefined}
    >
      {branding?.fontFamily && branding.fontFamily !== 'Inter' && (
        <DynamicFontLoader fontFamily={branding.fontFamily} />
      )}
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

      {/* Powered by footer for white-label businesses */}
      {branding?.hasWhiteLabel && !branding.hidePlatformBranding && (
        <div className="text-center py-3 text-xs text-gray-400">
          Powered by {PLATFORM_NAME}
        </div>
      )}
    </div>
  )
}
