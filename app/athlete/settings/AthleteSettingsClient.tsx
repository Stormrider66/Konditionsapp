'use client'

/**
 * Athlete Settings Client Component
 *
 * Client-side component for athlete settings page.
 * Contains ThemeSelector and other settings.
 */

import { Settings, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSelector } from '@/components/athlete/settings/ThemeSelector'
import { IntegrationsSettings } from '@/components/athlete/settings/IntegrationsSettings'
import type { SportProfile } from '@prisma/client'

interface AthleteSettingsClientProps {
  clientId: string
  clientName: string
  sportProfile: SportProfile | null
}

export function AthleteSettingsClient({
  clientId,
  clientName,
  sportProfile,
}: AthleteSettingsClientProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/athlete">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Inställningar</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Athlete Info */}
        <div className="bg-white rounded-lg p-4 border">
          <h2 className="text-sm font-medium text-muted-foreground mb-1">Inloggad som</h2>
          <p className="font-semibold">{clientName}</p>
        </div>

        {/* Theme Settings */}
        <ThemeSelector />

        {/* Integrations */}
        <IntegrationsSettings clientId={clientId} />
      </div>
    </div>
  )
}
