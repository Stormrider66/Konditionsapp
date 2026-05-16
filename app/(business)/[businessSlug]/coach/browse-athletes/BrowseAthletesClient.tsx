'use client'

import { useState } from 'react'
import { BusinessAthleteBrowser } from '@/components/coach/BusinessAthleteBrowser'
import { PendingCoachRequests } from '@/components/coach/PendingCoachRequests'
import { useTranslations } from '@/i18n/client'

interface BrowseAthletesClientProps {
  businessId: string
}

export function BrowseAthletesClient({ businessId }: BrowseAthletesClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const t = useTranslations('coach.pages.browseAthletes')

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-sm text-slate-400">
            {t('description')}
          </p>
        </div>

        <PendingCoachRequests
          businessId={businessId}
          onRequestHandled={() => setRefreshKey(k => k + 1)}
        />

        <div>
          <h2 className="text-lg font-semibold text-white mb-1">{t('availableTitle')}</h2>
          <p className="text-sm text-slate-400 mb-4">
            {t('availableDescription')}
          </p>
          <BusinessAthleteBrowser key={refreshKey} businessId={businessId} />
        </div>
      </div>
    </div>
  )
}
