'use client'

/**
 * Athlete Settings Client Component
 *
 * Client-side component for athlete settings page.
 * Contains ThemeSelector, IntensityTargetsEditor, and other settings.
 */

import { useState } from 'react'
import { Settings, ChevronLeft, Bot, Bell, ChevronRight, Target, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSelector } from '@/components/athlete/settings/ThemeSelector'
import { IntegrationsSettings } from '@/components/athlete/settings/IntegrationsSettings'
import { AIModelSettings } from '@/components/athlete/settings/AIModelSettings'
import { IntensityTargetsEditor } from '@/components/athlete/settings/IntensityTargetsEditor'
import { LocationSettings } from '@/components/athlete/settings/LocationSettings'
import { AboutMeSettings } from '@/components/athlete/settings/AboutMeSettings'
import type { SportProfile } from '@prisma/client'
import { SportType, IntensityTargets } from '@/types'
import { getTargetsFromSettings } from '@/lib/training/intensity-targets'
import { useToast } from '@/hooks/use-toast'

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface AthleteSettingsClientProps {
  clientId: string
  clientName: string
  sportProfile: SportProfile | null
  basePath?: string
}

export function AthleteSettingsClient({
  clientId,
  clientName,
  sportProfile,
  basePath = '',
}: AthleteSettingsClientProps) {
  const { toast } = useToast()
  const primarySport = (sportProfile?.primarySport || 'RUNNING') as SportType

  // Get current intensity targets from sport settings
  const getSportSettings = () => {
    if (!sportProfile) return null

    const settingsMap: Record<string, unknown> = {
      RUNNING: sportProfile.runningSettings,
      CYCLING: sportProfile.cyclingSettings,
      SKIING: sportProfile.skiingSettings,
      SWIMMING: sportProfile.swimmingSettings,
      TRIATHLON: sportProfile.triathlonSettings,
      HYROX: sportProfile.hyroxSettings,
      GENERAL_FITNESS: sportProfile.generalFitnessSettings,
      FUNCTIONAL_FITNESS: sportProfile.functionalFitnessSettings,
      TEAM_FOOTBALL: sportProfile.footballSettings,
      TEAM_ICE_HOCKEY: sportProfile.hockeySettings,
      TEAM_HANDBALL: sportProfile.handballSettings,
      TEAM_FLOORBALL: sportProfile.floorballSettings,
      TEAM_BASKETBALL: sportProfile.basketballSettings,
      TEAM_VOLLEYBALL: sportProfile.volleyballSettings,
      TENNIS: sportProfile.tennisSettings,
      PADEL: sportProfile.padelSettings,
    }

    return settingsMap[primarySport] as Record<string, unknown> | undefined
  }

  const currentSportSettings = getSportSettings()
  const currentTargets = currentSportSettings
    ? getTargetsFromSettings(currentSportSettings, primarySport)
    : undefined

  // Save intensity targets to sport profile
  async function handleSaveIntensityTargets(targets: IntensityTargets): Promise<void> {
    try {
      const response = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: primarySport,
          intensityTargets: targets,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save intensity targets')
      }

      toast({
        title: 'Sparad!',
        description: 'Dina intensitetsmål har uppdaterats.',
      })
    } catch (error) {
      console.error('Error saving intensity targets:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte spara intensitetsmålen. Försök igen.',
        variant: 'destructive',
      })
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-200 pb-20 selection:bg-orange-500/30 transition-colors">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-400/10 dark:bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 dark:bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-0 z-20 transition-colors">
        <div className="container max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/athlete">
            <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center border border-orange-200 dark:border-orange-500/20 transition-colors">
              <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400 transition-colors" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-none transition-colors">Inställningar</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 transition-colors">Personliga preferenser</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-lg mx-auto p-4 space-y-6 relative z-10">
        {/* Athlete Info */}
        <GlassCard>
          <GlassCardContent className="p-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-2 transition-colors">Inloggad som</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xl font-black italic text-slate-700 dark:text-white transition-all">
                {clientName.charAt(0)}
              </div>
              <div>
                <p className="text-xl font-black italic tracking-tight text-slate-900 dark:text-white transition-colors">{clientName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors">{sportProfile?.primarySport || 'Atlet'}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* About Me Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-pink-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Om mig</h3>
          </div>
          <AboutMeSettings variant="glass" />
        </div>

        {/* Theme Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Utseende</h3>
          </div>
          <ThemeSelector variant="glass" />
        </div>

        {/* Intensity Targets Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-green-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Träningsintensitet</h3>
          </div>
          <IntensityTargetsEditor
            sport={primarySport}
            currentTargets={currentTargets}
            onSave={handleSaveIntensityTargets}
            variant="glass"
            clientId={clientId}
          />
        </div>

        {/* AI Model Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">AI-modell</h3>
          </div>
          <AIModelSettings variant="glass" />
        </div>

        {/* Gym Location Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-cyan-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Gym-plats</h3>
          </div>
          <LocationSettings variant="glass" />
        </div>

        {/* AI Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">AI-notifikationer</h3>
          </div>
          <Link href={`${basePath}/athlete/settings/ai-notifications`}>
            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-2xl p-4 hover:bg-white/80 dark:hover:bg-white/10 transition-all cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center border border-amber-200 dark:border-amber-500/20">
                    <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Notifikationsinställningar</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Anpassa morgonbriefing, påminnelser och varningar</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors" />
              </div>
            </div>
          </Link>
        </div>

        {/* Integrations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Integrationer</h3>
          </div>
          <IntegrationsSettings clientId={clientId} variant="glass" />
        </div>
      </div>
    </div>
  )
}
