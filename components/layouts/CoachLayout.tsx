// components/layouts/CoachLayout.tsx
'use client'

import { useEffect, useState } from 'react'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient } from '@/lib/supabase/client'
import { FloatingAIChat } from '@/components/ai-studio/FloatingAIChat'
import { PageContextProvider, usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import type { User } from '@supabase/supabase-js'

function FloatingAIChatWithContext() {
  const pageContextValue = usePageContextOptional()
  return <FloatingAIChat pageContext={pageContextValue?.pageContext} />
}

export function CoachLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  if (!user) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  return (
    <PageContextProvider>
      <div className="min-h-screen bg-gray-50">
        <MobileNav user={user} userRole="COACH" />
        <div>{children}</div>
        {/* Floating AI Chat - available on all coach pages with page context */}
        <FloatingAIChatWithContext />
      </div>
    </PageContextProvider>
  )
}
