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
import { useState, useMemo, useEffect } from 'react'
import { Moon, Sunrise, Heart, Battery, Calendar, ChevronRight, Sparkles, Zap, Activity, Timer, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { WODGeneratorModal, WODPreviewScreen } from '@/components/athlete/wod'
import type { WODResponse } from '@/types/wod'
import type { DashboardRecentActivitySummary } from '@/types/dashboard-recent-activity'
import {
  DashboardItem,
  getItemName,
  getItemDate,
  getAssignmentRoute,
  getAssignmentTypeLabel,
  getAssignmentTypeIcon,
  getAssignmentTypeBadgeStyle,
  getWODRoute,
  getWODModeLabel,
} from '@/types/dashboard-items'

interface RestDayHeroCardProps {
  nextItem: DashboardItem | null
  readinessScore: number | null
  athleteName?: string
  wodRemainingCount?: number
  wodIsUnlimited?: boolean
  basePath?: string
  mode?: 'rest-day' | 'open-day'
  sportType?: string
  recentActivity?: DashboardRecentActivitySummary | null
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

const OPEN_DAY_MESSAGES = [
  {
    title: 'Bra läge för smart träning',
    description: 'Du har inget schemalagt pass idag. Välj en insats som stärker kontinuiteten utan att störa återhämtningen.',
    tip: 'Prioritera ett pass som matchar din nuvarande energi och din långsiktiga profil.',
    icon: Sparkles,
  },
  {
    title: 'Håll rytmen',
    description: 'En lugn, kontrollerad aktivitet kan ge bra effekt även på dagar utan fast schema.',
    tip: '20-40 minuter lätt arbete, teknik eller rörlighet räcker långt.',
    icon: Heart,
  },
  {
    title: 'Kapacitet att använda',
    description: 'Din status ser stabil ut. Om du vill träna idag, välj kvalitet framför slumpmässig volym.',
    tip: 'Korta kvalitetspass, drills eller styrka med god teknik ger bäst utväxling.',
    icon: Zap,
  },
]

// Get message based on readiness (deterministic to avoid hydration mismatch)
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
  // Default when no readiness data (stable across SSR/client)
  return RECOVERY_MESSAGES[0]
}

function getSportAwareRestDayHint(sportType: string | undefined, readinessScore: number | null): string {
  if (readinessScore !== null && readinessScore < 5) {
    switch (sportType) {
      case 'SWIMMING':
        return 'Prioritera sömn, vätska och lätt rörlighet för axlar och bröstrygg så att du är fräsch till nästa simpass.'
      case 'CYCLING':
        return 'Fokusera på återhämtning i ben, höfter och energiintag så att du är redo för nästa kvalitetspass på cykeln.'
      case 'TRIATHLON':
        return 'Låt kroppen absorbera belastningen idag. Enkel mobilitet och bra energi hjälper dig tillbaka starkare i alla tre disciplinerna.'
      case 'HYROX':
      case 'FUNCTIONAL_FITNESS':
      case 'GENERAL_FITNESS':
        return 'Återhämtning i dag ger bättre kvalitet i nästa kombination av styrka och engine. Håll dig till lätt rörlighet och bra mat.'
      case 'STRENGTH':
        return 'Ge nervsystem, muskler och leder tid att återhämta sig idag så att nästa styrkepass kan genomföras med kvalitet.'
      case 'SKIING':
        return 'Prioritera lugn återhämtning, bränsle och rörlighet för höfter, fotleder och överkropp inför nästa skidpass.'
      case 'TENNIS':
      case 'PADEL':
        return 'Återhämta underben, axlar och bål idag så att du får bättre kvalitet i nästa pass med riktningsförändringar och slag.'
      case 'TEAM_FOOTBALL':
      case 'TEAM_ICE_HOCKEY':
      case 'TEAM_HANDBALL':
      case 'TEAM_FLOORBALL':
      case 'TEAM_BASKETBALL':
      case 'TEAM_VOLLEYBALL':
        return 'Låt senor, muskler och nervsystem få återhämtning idag så att du kan vara snabb och explosiv nästa lagpass.'
      case 'RUNNING':
        return 'Ge senor, vader och fötter lugn belastning idag så att du får bättre kvalitet i nästa löppass.'
      default:
        return 'Prioritera sömn, vätska och lätt rörlighet idag så att kroppen hinner absorbera träningen.'
    }
  }

  switch (sportType) {
    case 'SWIMMING':
      return 'Använd vilodagen till att återställa axlar, rygg och energi så att nästa simpass får bättre kvalitet.'
    case 'CYCLING':
      return 'Vilodagen hjälper benen att svara bättre på nästa tröskel-, VO2- eller distanspass på cykeln.'
    case 'TRIATHLON':
      return 'Återhämtning idag stärker din helhet över simning, cykel och löpning och gör nästa nyckelpass mer värdefullt.'
    case 'HYROX':
      return 'Vilodagen låter styrka, engine och tålighet byggas upp inför nästa HYROX-pass.'
    case 'FUNCTIONAL_FITNESS':
    case 'GENERAL_FITNESS':
      return 'Återhämtning idag förbättrar kvaliteten i nästa pass med styrka, puls och teknik.'
    case 'STRENGTH':
      return 'Musklerna blir starkare när du återhämtar dig. En lugn dag idag höjer kvaliteten i nästa lyft.'
    case 'SKIING':
      return 'Vilodagen ger plats för bättre teknik och kraftutveckling i nästa skid- eller stakpass.'
    case 'TENNIS':
    case 'PADEL':
      return 'Återhämtning idag hjälper dig vara snabbare i fotarbete och skarpare i tajming nästa pass.'
    case 'TEAM_FOOTBALL':
    case 'TEAM_ICE_HOCKEY':
    case 'TEAM_HANDBALL':
    case 'TEAM_FLOORBALL':
    case 'TEAM_BASKETBALL':
    case 'TEAM_VOLLEYBALL':
      return 'Vilodagen ger bättre explosivitet, beslutsförmåga och tålighet till nästa lagträning.'
    case 'RUNNING':
      return 'Dina muskler, senor och energisystem bygger kapacitet medan du vilar inför nästa löppass.'
    default:
      return 'Dina muskler anpassar sig och blir starkare medan du vilar.'
  }
}

function getSportAwareRestDayDescription(
  sportType: string | undefined,
  fallbackDescription: string
): string {
  switch (sportType) {
    case 'SWIMMING':
      return 'Bra sömn, bra mat och lugn rörlighet idag ger bättre kvalitet i nästa simpass.'
    case 'CYCLING':
      return 'Ladda med sömn, energi och återhämtning i benen så att nästa cykelpass får rätt tryck.'
    case 'TRIATHLON':
      return 'Återhämta systematiskt idag så att du kan möta nästa disciplin med bättre kvalitet.'
    case 'HYROX':
      return 'Ge kroppen en dag att återställa styrka, engine och grepp inför nästa HYROX-pass.'
    case 'FUNCTIONAL_FITNESS':
    case 'GENERAL_FITNESS':
      return 'Återhämtning idag skapar bättre kvalitet i nästa pass med styrka, puls och teknik.'
    case 'STRENGTH':
      return 'Bra återhämtning idag ger bättre kraftutveckling och kvalitet i nästa styrkepass.'
    case 'SKIING':
      return 'Kvalitetssömn och bra energi idag ger bättre tryck och teknik i nästa skidpass.'
    case 'TENNIS':
    case 'PADEL':
      return 'Lätt återhämtning idag ger bättre tajming, fotarbete och kvalitet i nästa racketpass.'
    case 'TEAM_FOOTBALL':
    case 'TEAM_ICE_HOCKEY':
    case 'TEAM_HANDBALL':
    case 'TEAM_FLOORBALL':
    case 'TEAM_BASKETBALL':
    case 'TEAM_VOLLEYBALL':
      return 'Återhämtning idag ger bättre explosivitet och kvalitet i nästa lagträning.'
    default:
      return fallbackDescription
  }
}

function getOpenDayMessage(readinessScore: number | null) {
  if (readinessScore !== null) {
    if (readinessScore < 5) return OPEN_DAY_MESSAGES[1]
    if (readinessScore < 7) return OPEN_DAY_MESSAGES[0]
    return OPEN_DAY_MESSAGES[2]
  }

  return OPEN_DAY_MESSAGES[0]
}

function getSportAwareOpenDayHint(sportType: string | undefined, readinessScore: number | null): string {
  if (readinessScore !== null && readinessScore < 5) {
    return 'Din status talar för låg belastning idag. Välj rörlighet, lätt cirkulation eller teknik med låg stress.'
  }

  switch (sportType) {
    case 'CYCLING':
      return readinessScore !== null && readinessScore >= 7
        ? 'Bra dag för ett kort kvalitetspass på cykel, kadensarbete eller ett kontrollerat tröskelblock.'
        : 'En lugn distansrunda, teknik på trainer eller rörlighet för höft och fotled passar bra idag.'
    case 'SWIMMING':
      return readinessScore !== null && readinessScore >= 7
        ? 'Bra dag för teknikserier, fartkänsla eller ett kort kvalitativt simpass.'
        : 'Fokusera på teknik, vattenläge och lugn aerob volym om du vill träna idag.'
    case 'TRIATHLON':
      return readinessScore !== null && readinessScore >= 7
        ? 'Välj en tydlig disciplin idag, till exempel ett kort kvalitetspass eller övergångsarbete med kontroll.'
        : 'En lugn disciplin i zon 1-2 eller teknikarbete ger bäst effekt utan att störa helheten.'
    case 'HYROX':
    case 'FUNCTIONAL_FITNESS':
    case 'GENERAL_FITNESS':
      return readinessScore !== null && readinessScore >= 7
        ? 'Bra läge för teknik under puls, stationsarbete eller ett kort styrke- och engine-pass.'
        : 'Håll det enkelt idag: lätt engine, rörlighet och tekniskt rena repetitioner.'
    case 'STRENGTH':
      return readinessScore !== null && readinessScore >= 7
        ? 'Bra dag för ett fokuserat styrkepass med kvalitet i huvudlyften eller kompletterande arbete.'
        : 'Teknikset, bålstabilitet och lätt kompletteringsstyrka passar bättre idag än hög belastning.'
    case 'SKIING':
      return readinessScore !== null && readinessScore >= 7
        ? 'Bra dag för stakstyrka, teknikintervaller eller ett kort kvalitetspass på rullskidor/skierg.'
        : 'Lugn aerob träning och teknikfokus ger mest värde idag.'
    case 'TENNIS':
    case 'PADEL':
      return readinessScore !== null && readinessScore >= 7
        ? 'Bra dag för fotarbete, riktningsförändringar och korta intensiva sekvenser med god kvalitet.'
        : 'Prioritera rörelsekvalitet, lättare slagvolym och skadeförebyggande arbete idag.'
    case 'TEAM_FOOTBALL':
    case 'TEAM_ICE_HOCKEY':
    case 'TEAM_HANDBALL':
    case 'TEAM_FLOORBALL':
    case 'TEAM_BASKETBALL':
    case 'TEAM_VOLLEYBALL':
      return readinessScore !== null && readinessScore >= 7
        ? 'Bra dag för accelerationer, teknik i matchsituationer eller ett kort styrke- och power-pass.'
        : 'Lätt fotarbete, mobilitet och skadeförebyggande arbete passar bättre än extra högintensiv volym idag.'
    case 'RUNNING':
      return readinessScore !== null && readinessScore >= 7
        ? 'Bra dag för strides, backteknik eller ett kort kvalitativt löppass om du vill hålla rytmen.'
        : 'Lugn jogg, promenad eller löpskolning ger mer än att jaga extra belastning idag.'
    default:
      return readinessScore !== null && readinessScore >= 7
        ? 'Din status ser bra ut för ett kort kvalitativt pass, teknikblock eller fokuserad styrka.'
        : 'Lågintensiv träning, teknikarbete eller rörlighet passar bäst idag.'
  }
}

// Format date for next workout display (absolute format, hydration-safe)
function formatNextWorkoutDate(date: Date): string {
  const workoutDate = new Date(date)
  const dayNames = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${dayNames[workoutDate.getDay()]} ${workoutDate.getDate()} ${monthNames[workoutDate.getMonth()]}`
}

// Relative date label (client-only, uses current time)
function getRelativeDateLabel(date: Date): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const workoutDate = new Date(date)
  workoutDate.setHours(0, 0, 0, 0)
  const diffDays = Math.round((workoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 1) return 'Imorgon'
  if (diffDays === 2) return 'I övermorgon'
  return null
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
  nextItem,
  readinessScore,
  athleteName,
  wodRemainingCount = 3,
  wodIsUnlimited = false,
  basePath = '',
  mode = 'rest-day',
  sportType,
  recentActivity,
}: RestDayHeroCardProps) {
  const message = useMemo(
    () => mode === 'rest-day' ? getRecoveryMessage(readinessScore) : getOpenDayMessage(readinessScore),
    [mode, readinessScore]
  )
  const hasRecentActivity = !!recentActivity
  const MessageIcon = hasRecentActivity ? getRecentActivityIcon(recentActivity.type) : message.icon
  const badgeLabel = hasRecentActivity ? 'Senaste pass' : mode === 'rest-day' ? 'Vilodag' : 'Öppen dag'
  const badgeIcon = hasRecentActivity ? Activity : mode === 'rest-day' ? Sunrise : Sparkles
  const BadgeIcon = badgeIcon
  const description = hasRecentActivity
    ? buildRecentActivityDescription(recentActivity)
    : mode === 'rest-day'
      ? getSportAwareRestDayDescription(sportType, message.description)
      : message.description
  const contextualHint = hasRecentActivity
    ? getRecentActivityHint(recentActivity, readinessScore)
    : mode === 'open-day'
      ? getSportAwareOpenDayHint(sportType, readinessScore)
      : getSportAwareRestDayHint(sportType, readinessScore)

  // Relative date labels (client-only to avoid SSR/client timezone mismatch)
  const [relativeDateLabel, setRelativeDateLabel] = useState<string | null>(null)
  useEffect(() => {
    if (nextItem) {
      const date = nextItem.kind === 'program'
        ? nextItem.workout.dayDate
        : nextItem.kind === 'assignment'
          ? nextItem.assignedDate
          : nextItem.createdAt
      setRelativeDateLabel(getRelativeDateLabel(date))
    }
  }, [nextItem])

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
            <BadgeIcon className="w-3 h-3" />
            {badgeLabel}
          </div>

          {/* Title with Icon */}
          <div className="flex items-start gap-4 mb-3">
            <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 transition-colors">
              <MessageIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
                {hasRecentActivity ? buildRecentActivityTitle(recentActivity) : message.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm md:text-base transition-colors">
                {description}
              </p>
            </div>
          </div>

          {recentActivity && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-white/60 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {formatRecentActivitySource(recentActivity.source)}
              </Badge>
              <Badge variant="secondary" className="bg-white/60 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {formatRecentActivityDate(recentActivity.date)}
              </Badge>
              {recentActivity.deviceModel ? (
                <Badge variant="secondary" className="bg-white/60 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {recentActivity.deviceModel}
                </Badge>
              ) : null}
            </div>
          )}

          {recentActivity && (
            <div className="grid grid-cols-2 gap-3 lg:max-w-xl">
              {recentActivity.durationMinutes ? (
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Längd
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <Timer className="h-4 w-4 text-cyan-500" />
                    {recentActivity.durationMinutes} min
                  </div>
                </div>
              ) : null}
              {recentActivity.distanceKm ? (
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Distans
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <Route className="h-4 w-4 text-cyan-500" />
                    {recentActivity.distanceKm} km
                  </div>
                </div>
              ) : null}
              {recentActivity.avgHR ? (
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Puls
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <Heart className="h-4 w-4 text-cyan-500" />
                    {recentActivity.avgHR} bpm
                  </div>
                </div>
              ) : null}
              {recentActivity.tss ? (
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Belastning
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <Zap className="h-4 w-4 text-cyan-500" />
                    {recentActivity.tss} TSS
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Recovery Tip */}
          <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors">
            <p className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
              <span>{contextualHint}</span>
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
        {nextItem && nextItem.kind === 'program' && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" />
              Nästa pass
            </h3>

            <Link href={`${basePath}/athlete/workouts/${nextItem.workout.id}`}>
              <div className="group/next p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 hover:border-orange-500/30 dark:hover:border-orange-500/30 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium transition-colors">
                        {relativeDateLabel || formatNextWorkoutDate(nextItem.workout.dayDate)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${getIntensityBadgeStyle(nextItem.workout.intensity)}`}>
                        {formatIntensity(nextItem.workout.intensity)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white truncate group-hover/next:text-orange-600 dark:group-hover/next:text-orange-400 transition-colors">
                      {nextItem.workout.name}
                    </h4>
                    <p className="text-sm text-slate-500 truncate">
                      {nextItem.workout.programName}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover/next:text-orange-500 dark:group-hover/next:text-orange-400 group-hover/next:translate-x-1 transition-all flex-shrink-0 ml-4" />
                </div>

                {/* Duration/Distance preview */}
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  {nextItem.workout.duration && (
                    <span>{nextItem.workout.duration} min</span>
                  )}
                  {nextItem.workout.distance && (
                    <span>{nextItem.workout.distance} km</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Next Assignment Preview */}
        {nextItem && nextItem.kind === 'assignment' && (() => {
          const NextTypeIcon = getAssignmentTypeIcon(nextItem.assignmentType)
          const nextBadgeStyle = getAssignmentTypeBadgeStyle(nextItem.assignmentType)
          return (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 transition-colors">
                <Calendar className="w-4 h-4" />
                Nästa pass
              </h3>

              <Link href={getAssignmentRoute(nextItem, basePath)}>
                <div className="group/next p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 hover:border-orange-500/30 dark:hover:border-orange-500/30 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium transition-colors">
                          {relativeDateLabel || formatNextWorkoutDate(nextItem.assignedDate)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs border inline-flex items-center gap-1 ${nextBadgeStyle}`}>
                          <NextTypeIcon className="w-3 h-3" />
                          {getAssignmentTypeLabel(nextItem.assignmentType)}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white truncate group-hover/next:text-orange-600 dark:group-hover/next:text-orange-400 transition-colors">
                        {nextItem.name}
                      </h4>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover/next:text-orange-500 dark:group-hover/next:text-orange-400 group-hover/next:translate-x-1 transition-all flex-shrink-0 ml-4" />
                  </div>

                  {/* Duration preview */}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    {nextItem.duration && (
                      <span>{nextItem.duration} min</span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          )
        })()}

        {/* Next WOD Preview */}
        {nextItem && nextItem.kind === 'wod' && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 transition-colors">
              <Calendar className="w-4 h-4" />
              Nästa pass
            </h3>

            <Link href={getWODRoute(nextItem, basePath)}>
              <div className="group/next p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium transition-colors">
                        {relativeDateLabel || formatNextWorkoutDate(nextItem.createdAt)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI-Pass
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white truncate group-hover/next:text-emerald-600 dark:group-hover/next:text-emerald-400 transition-colors">
                      {nextItem.title}
                    </h4>
                    <p className="text-sm text-slate-500 truncate">
                      {getWODModeLabel(nextItem.mode)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover/next:text-emerald-500 dark:group-hover/next:text-emerald-400 group-hover/next:translate-x-1 transition-all flex-shrink-0 ml-4" />
                </div>

                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>{nextItem.requestedDuration} min</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* No upcoming workouts */}
        {!nextItem && (
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

function getRecentActivityIcon(type: string) {
  const normalized = type.toUpperCase()
  if (normalized.includes('RUN')) return Activity
  if (normalized.includes('CYCLE') || normalized.includes('BIKE')) return Activity
  if (normalized.includes('SWIM')) return Activity
  return Activity
}

function buildRecentActivityTitle(activity: DashboardRecentActivitySummary): string {
  const label = formatRecentActivityType(activity.type)
  return `Senaste passet: ${label}`
}

function buildRecentActivityDescription(activity: DashboardRecentActivitySummary): string {
  const metrics = [
    activity.durationMinutes ? `${activity.durationMinutes} min` : null,
    activity.distanceKm ? `${activity.distanceKm} km` : null,
    activity.avgHR ? `${activity.avgHR} bpm` : null,
    activity.tss ? `${activity.tss} TSS` : null,
  ].filter(Boolean)

  if (metrics.length === 0) {
    return `Ditt senaste registrerade pass var ${formatRecentActivityType(activity.type).toLowerCase()}. Använd det som utgångspunkt för dagens beslut.`
  }

  return `${metrics.join(' • ')}. Det ger en bättre referens för hur resten av dagen bör disponeras.`
}

function getRecentActivityHint(activity: DashboardRecentActivitySummary, readinessScore: number | null): string {
  if (readinessScore !== null && readinessScore < 5) {
    return 'Kroppen har redan fått belastning nyligen. Prioritera återhämtning, vätska och lågintensiv rörelse innan du lägger på mer.'
  }

  if ((activity.tss || 0) >= 70) {
    return 'Det senaste passet var belastande. Om du tränar igen idag, håll nästa insats kort, kontrollerad och kompletterande.'
  }

  return 'Använd senaste passet som kompass. Om du väljer att träna igen idag, komplettera snarare än att duplicera belastningen.'
}

function formatRecentActivityType(type: string): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykel',
    SWIMMING: 'Simning',
    STRENGTH: 'Styrka',
    CROSS_TRAINING: 'Alternativträning',
    SKIING: 'Skidträning',
    ROWING: 'Rodd',
    RECOVERY: 'Återhämtning',
    OTHER: 'Träning',
  }
  return labels[type] || type.replace(/_/g, ' ').toLowerCase()
}

function formatRecentActivitySource(source: DashboardRecentActivitySummary['source']): string {
  const labels: Record<DashboardRecentActivitySummary['source'], string> = {
    manual: 'Manuell',
    strava: 'Strava',
    garmin: 'Garmin Connect',
    concept2: 'Concept2',
    ai: 'AI-pass',
    adhoc: 'Manuell logg',
  }
  return labels[source]
}

function formatRecentActivityDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
