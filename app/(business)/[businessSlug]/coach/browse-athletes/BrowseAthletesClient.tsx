'use client'

import { useState } from 'react'
import { BusinessAthleteBrowser } from '@/components/coach/BusinessAthleteBrowser'
import { PendingCoachRequests } from '@/components/coach/PendingCoachRequests'

interface BrowseAthletesClientProps {
  businessId: string
  businessSlug: string
}

export function BrowseAthletesClient({ businessId, businessSlug }: BrowseAthletesClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Hitta Atleter</h1>
          <p className="text-sm text-slate-400">
            Hantera inkommande förfrågningar och bjud in atleter i din verksamhet.
          </p>
        </div>

        <PendingCoachRequests
          businessId={businessId}
          onRequestHandled={() => setRefreshKey(k => k + 1)}
        />

        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Tillgängliga atleter</h2>
          <p className="text-sm text-slate-400 mb-4">
            Atleter utan coach. Skicka en inbjudan så kan atleten acceptera eller avvisa.
          </p>
          <BusinessAthleteBrowser key={refreshKey} businessId={businessId} />
        </div>
      </div>
    </div>
  )
}
