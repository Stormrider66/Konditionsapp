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

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

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
    <div className="min-h-screen bg-[#050505] text-slate-200 pb-20 selection:bg-orange-500/30">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="bg-black/40 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
        <div className="container max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/athlete">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <Settings className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tight text-white leading-none">Inställningar</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Personliga preferenser</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-lg mx-auto p-4 space-y-6 relative z-10">
        {/* Athlete Info */}
        <GlassCard>
          <GlassCardContent className="p-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Inloggad som</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xl font-black italic text-white">
                {clientName.charAt(0)}
              </div>
              <div>
                <p className="text-xl font-black italic tracking-tight text-white">{clientName}</p>
                <p className="text-xs text-slate-400">{sportProfile?.primarySport || 'Atlet'}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Theme Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Utseende</h3>
          </div>
          <ThemeSelector variant="glass" />
        </div>

        {/* Integrations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Integrationer</h3>
          </div>
          <IntegrationsSettings clientId={clientId} variant="glass" />
        </div>
      </div>
    </div>
  )
}
