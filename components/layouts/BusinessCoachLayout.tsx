// components/layouts/BusinessCoachLayout.tsx
'use client'

import { useEffect, useState } from 'react'
import { BusinessCoachGlassHeader } from '@/components/coach/BusinessCoachGlassHeader'
import { createClient } from '@/lib/supabase/client'
import { FloatingAIChat } from '@/components/ai-studio/FloatingAIChat'
import { PageContextProvider, usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { WorkoutThemeProvider, useWorkoutThemeOptional, DEFAULT_THEME_PREFERENCES } from '@/lib/themes/ThemeProvider'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { BusinessBrandingProvider } from '@/lib/contexts/BusinessBrandingContext'
import type { BusinessBranding } from '@/lib/branding/types'

function FloatingAIChatWithContext() {
  const pageContextValue = usePageContextOptional()
  return <FloatingAIChat pageContext={pageContextValue?.pageContext} visibleConcepts={pageContextValue?.visibleConcepts} />
}

interface BusinessCoachLayoutProps {
  children: React.ReactNode
  businessSlug: string
  branding?: BusinessBranding | null
}

export function BusinessCoachLayout({ children, businessSlug, branding }: BusinessCoachLayoutProps) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const content = !user ? (
    <WorkoutThemeProvider initialPreferences={DEFAULT_THEME_PREFERENCES}>
      <div className="min-h-screen bg-gray-50">{children}</div>
    </WorkoutThemeProvider>
  ) : (
    <WorkoutThemeProvider initialPreferences={DEFAULT_THEME_PREFERENCES}>
      <PageContextProvider>
        <ThemedContent user={user} businessSlug={businessSlug} branding={branding}>
          {children}
        </ThemedContent>
      </PageContextProvider>
    </WorkoutThemeProvider>
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

function ThemedContent({
  children,
  user,
  businessSlug,
  branding,
}: {
  children: React.ReactNode
  user: User | null
  businessSlug: string
  branding?: BusinessBranding | null
}) {
  const themeContext = useWorkoutThemeOptional()
  const isDark = themeContext?.appTheme?.id === 'FITAPP_DARK'

  // Build CSS custom properties from branding
  const customStyle: Record<string, string> = {}
  if (branding?.primaryColor) {
    customStyle['--business-primary'] = branding.primaryColor
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
      {user && (
        <BusinessCoachGlassHeader user={user} businessSlug={businessSlug} />
      )}

      <div className="pt-16">
        {children}
      </div>

      {/* Floating AI Chat - available on all coach pages with page context */}
      <FloatingAIChatWithContext />
    </div>
  )
}
