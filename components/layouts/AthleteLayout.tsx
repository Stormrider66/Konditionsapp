// components/layouts/AthleteLayout.tsx
'use client'

import { useEffect, useState } from 'react'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { SportType } from '@prisma/client'

interface SportProfile {
  id: string
  clientId: string
  primarySport: SportType
  secondarySports: SportType[]
  onboardingCompleted: boolean
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

  if (!user) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav
        user={user}
        userRole="ATHLETE"
        sportProfile={athleteInfo?.sportProfile}
        clientId={athleteInfo?.clientId}
      />
      <div>{children}</div>
    </div>
  )
}
