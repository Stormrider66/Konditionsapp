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

function FloatingAIChatWithContext() {
  const pageContextValue = usePageContextOptional()
  return <FloatingAIChat pageContext={pageContextValue?.pageContext} visibleConcepts={pageContextValue?.visibleConcepts} />
}

interface BusinessCoachLayoutProps {
  children: React.ReactNode
  businessSlug: string
}

export function BusinessCoachLayout({ children, businessSlug }: BusinessCoachLayoutProps) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  if (!user) {
    return (
      <WorkoutThemeProvider initialPreferences={DEFAULT_THEME_PREFERENCES}>
        <div className="min-h-screen bg-gray-50">{children}</div>
      </WorkoutThemeProvider>
    )
  }

  return (
    <WorkoutThemeProvider initialPreferences={DEFAULT_THEME_PREFERENCES}>
      <PageContextProvider>
        <ThemedContent user={user} businessSlug={businessSlug}>
          {children}
        </ThemedContent>
      </PageContextProvider>
    </WorkoutThemeProvider>
  )
}

function ThemedContent({
  children,
  user,
  businessSlug,
}: {
  children: React.ReactNode
  user: User | null
  businessSlug: string
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
