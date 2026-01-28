'use client'

/**
 * RestDayHeroCard - Displayed when there's no workout today
 *
 * Features:
 * - Motivational recovery message
 * - Explains how rest improves performance
 * - Preview of next workout (if available)
 * - Recovery tips based on readiness
 * - Calming color scheme (blues/teals)
 * - AI WOD (Workout of the Day) generation button
 */

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Moon, Sunrise, Heart, Battery, Calendar, ChevronRight, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { WODGeneratorModal, WODPreviewScreen } from '@/components/athlete/wod'
import type { WODResponse } from '@/types/wod'

interface RestDayHeroCardProps {
  nextWorkout: DashboardWorkoutWithContext | null
  readinessScore: number | null
  athleteName?: string
  wodRemainingCount?: number
  wodIsUnlimited?: boolean
  basePath?: string
}

// Recovery messages based on readiness score
const RECOVERY_MESSAGES = [
  {
    title: 'Strategisk Vila',
    description: 'Kvalitetssömn och bra kost idag ger kraft till morgondagens träning.',
    tip: 'Dina muskler anpassar sig och blir starkare medan du vilar.',
    icon: Moon,
  },
  {
    title: 'Aktiv Återhämtning',
    description: 'Lätt rörelse och stretching rekommenderas för optimal återhämtning.',
    tip: 'Foam rolling kan hjälpa med muskelstelhet.',
    icon: Heart,
  },
  {
    title: 'Ladda Batterierna',
    description: 'Fokusera på hydration och näringsrik mat idag.',
    tip: 'Protein och kolhydrater hjälper muskelåterhämtning.',
    icon: Battery,
  },
  {
    title: 'Mental Förberedelse',
    description: 'Visualisera dina mål och kommande träningspass.',
    tip: 'Mental träning är lika viktig som fysisk.',
    icon: Sparkles,
  },
]

// Get message based on readiness or random
function getRecoveryMessage(readinessScore: number | null) {
  if (readinessScore !== null) {
    // Low readiness = emphasize rest
    if (readinessScore < 5) {
      return RECOVERY_MESSAGES[0] // Moon - Strategic rest
    }
    // Medium readiness = active recovery
    if (readinessScore < 7) {
      return RECOVERY_MESSAGES[1] // Heart - Active recovery
    }
    // High readiness = mental prep
    return RECOVERY_MESSAGES[3] // Sparkles - Mental prep
  }
  // Random if no readiness data
  const index = Math.floor(Date.now() / (1000 * 60 * 60)) % RECOVERY_MESSAGES.length
  return RECOVERY_MESSAGES[index]
}

// Format date for next workout display
function formatNextWorkoutDate(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const workoutDate = new Date(date)
  workoutDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round((workoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return 'Imorgon'
  if (diffDays === 2) return 'I övermorgon'

  const dayNames = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

  return `${dayNames[workoutDate.getDay()]} ${workoutDate.getDate()} ${monthNames[workoutDate.getMonth()]}`
}

// Get workout intensity color
function getIntensityBadgeStyle(intensity: string): string {
  const styles: Record<string, string> = {
    RECOVERY: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    EASY: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    MODERATE: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    THRESHOLD: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    INTERVAL: 'bg-red-500/10 border-red-500/20 text-red-400',
    MAX: 'bg-red-500/10 border-red-500/20 text-red-500',
  }
  return styles[intensity] || 'bg-slate-500/10 border-slate-500/20 text-slate-400'
}

function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Lätt',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return intensities[intensity] || intensity
}

export function RestDayHeroCard({
  nextWorkout,
  readinessScore,
  athleteName,
  wodRemainingCount = 3,
  wodIsUnlimited = false,
  basePath = '',
}: RestDayHeroCardProps) {
  const message = useMemo(() => getRecoveryMessage(readinessScore), [readinessScore])
  const MessageIcon = message.icon

  // WOD state
  const [showWODModal, setShowWODModal] = useState(false)
  const [wodResponse, setWodResponse] = useState<WODResponse | null>(null)
  const [showWODPreview, setShowWODPreview] = useState(false)

  const handleWODGenerated = (response: WODResponse) => {
    setWodResponse(response)
    setShowWODPreview(true)
  }

  const handleStartWOD = () => {
    // Navigate to WOD execution page
    if (wodResponse?.metadata?.requestId) {
      const url = `${basePath}/athlete/wod/${wodResponse.metadata.requestId}`
      window.location.href = url
    } else {
      console.error('Missing requestId in wodResponse')
    }
  }

  const handleRegenerateWOD = () => {
    setShowWODPreview(false)
    setWodResponse(null)
    setShowWODModal(true)
  }

  const handleClosePreview = () => {
    setShowWODPreview(false)
    setWodResponse(null)
  }

  // If showing WOD preview, render full-screen preview
  if (showWODPreview && wodResponse) {
    return (
      <WODPreviewScreen
        response={wodResponse}
        onStart={handleStartWOD}
        onRegenerate={handleRegenerateWOD}
        onClose={handleClosePreview}
      />
    )
  }

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group overflow-hidden transition-all">
      {/* Calming gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-500/5 pointer-events-none" />

      {/* Subtle animated glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/15 transition-colors duration-700 pointer-events-none" />

      <div className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[280px] md:min-h-[300px]">
        <div>
          {/* Rest Day Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4 transition-colors">
            <Sunrise className="w-3 h-3" />
            Vilodag
          </div>

          {/* Title with Icon */}
          <div className="flex items-start gap-4 mb-3">
            <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 transition-colors">
              <MessageIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
                {message.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm md:text-base transition-colors">
                {message.description}
              </p>
            </div>
          </div>

          {/* Recovery Tip */}
          <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors">
            <p className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
              <span>{message.tip}</span>
            </p>
          </div>

          {/* WOD Button */}
          <div className="mt-4">
            <Button
              onClick={() => setShowWODModal(true)}
              disabled={!wodIsUnlimited && wodRemainingCount <= 0}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-lg shadow-orange-500/20"
            >
              <Zap className="w-4 h-4 mr-2" />
              Skapa Dagens Pass
              {!wodIsUnlimited && (
                <Badge variant="secondary" className="ml-2 bg-white/20 text-white text-xs">
                  {wodRemainingCount} kvar
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Next Workout Preview */}
        {nextWorkout && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" />
              Nästa pass
            </h3>

            <Link href={`${basePath}/athlete/workouts/${nextWorkout.id}`}>
              <div className="group/next p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 hover:border-orange-500/30 dark:hover:border-orange-500/30 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium transition-colors">
                        {formatNextWorkoutDate(nextWorkout.dayDate)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${getIntensityBadgeStyle(nextWorkout.intensity)}`}>
                        {formatIntensity(nextWorkout.intensity)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white truncate group-hover/next:text-orange-600 dark:group-hover/next:text-orange-400 transition-colors">
                      {nextWorkout.name}
                    </h4>
                    <p className="text-sm text-slate-500 truncate">
                      {nextWorkout.programName}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover/next:text-orange-500 dark:group-hover/next:text-orange-400 group-hover/next:translate-x-1 transition-all flex-shrink-0 ml-4" />
                </div>

                {/* Duration/Distance preview */}
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  {nextWorkout.duration && (
                    <span>{nextWorkout.duration} min</span>
                  )}
                  {nextWorkout.distance && (
                    <span>{nextWorkout.distance} km</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* No upcoming workouts */}
        {!nextWorkout && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
            <p className="text-sm text-slate-500 text-center">
              Inga kommande pass schemalagda
            </p>
            <Link href={`${basePath}/athlete/calendar`}>
              <Button
                variant="outline"
                className="w-full mt-3 border-slate-200 dark:border-white/20 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Visa kalender
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* WOD Generator Modal */}
      <WODGeneratorModal
        open={showWODModal}
        onOpenChange={setShowWODModal}
        onWODGenerated={handleWODGenerated}
        remainingWODs={wodRemainingCount}
        isUnlimited={wodIsUnlimited}
      />
    </GlassCard>
  )
}
