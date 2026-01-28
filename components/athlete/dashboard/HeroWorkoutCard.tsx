'use client'

/**
 * HeroWorkoutCard - The inspiring main workout card on the athlete dashboard
 *
 * Features:
 * - AI-generated or rule-based focus points (title, description, category badge)
 * - Exercise imagery with muscle highlighting
 * - Metrics row: Duration, Volume, Intensity
 * - GlassCard styling with hover effects
 */

import Link from 'next/link'
import Image from 'next/image'
import { Activity, Flame, Timer, Dumbbell, Play, Zap, Route, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { DashboardWorkoutWithContext } from '@/types/prisma-types'
import { generateSimpleFocus, type WorkoutFocus } from '@/lib/hero-card'
import { ModificationBanner } from '@/components/athlete/workouts/ModificationBanner'
import { useMemo } from 'react'

export interface WorkoutModification {
  decision: 'PROCEED_NORMAL' | 'REDUCE_INTENSITY' | 'REDUCE_VOLUME' | 'EASY_DAY' | 'REST'
  reasoning: string[]
  intensityAdjustment?: number
  volumeAdjustment?: number
}

interface HeroWorkoutCardProps {
  workout: DashboardWorkoutWithContext
  athleteName?: string
  /** Workout modification from injury/readiness system (Gap 4 fix) */
  modification?: WorkoutModification
  basePath?: string
}

// Map category/pillar to image paths
const CATEGORY_IMAGES: Record<string, string[]> = {
  'STYRKA NEDRE KROPP': [
    '/images/posterior-chain/marklyft-1.png',
    '/images/posterior-chain/romanian-deadlift-1.png',
    '/images/posterior-chain/hip-thrust-med-skivstang-1.png',
  ],
  'POSTERIOR_CHAIN': [
    '/images/posterior-chain/marklyft-1.png',
    '/images/posterior-chain/kettlebell-swing-1.png',
    '/images/posterior-chain/romanian-deadlift-1.png',
  ],
  'QUAD-DOMINANT': [
    '/images/knee-dominance/knaboj-1.png',
    '/images/knee-dominance/front-squat-1.png',
    '/images/knee-dominance/goblet-squat-1.png',
  ],
  'KNEE_DOMINANCE': [
    '/images/knee-dominance/knaboj-1.png',
    '/images/knee-dominance/front-squat-1.png',
    '/images/knee-dominance/lunge-1.png',
  ],
  'BALANS & STABILITET': [
    '/images/unilateral/bulgarisk-utfallsboj-1.png',
    '/images/unilateral/enbenig-rumansk-marklyft-1.png',
    '/images/unilateral/step-ups-med-knadrive-1.png',
  ],
  'UNILATERAL': [
    '/images/unilateral/bulgarisk-utfallsboj-1.png',
    '/images/unilateral/enbenig-rumansk-marklyft-1.png',
    '/images/unilateral/step-ups-med-knadrive-1.png',
  ],
  'CORE STABILITET': [
    '/images/core/plank-1.png',
    '/images/core/dead-bug-1.png',
    '/images/core/pallof-press-1.png',
  ],
  'CORE': [
    '/images/core/plank-1.png',
    '/images/core/farmers-carry-1.png',
    '/images/core/russian-twist-1.png',
  ],
  'ANTI_ROTATION_CORE': [
    '/images/core/pallof-press-1.png',
    '/images/core/dead-bug-1.png',
    '/images/core/plank-1.png',
  ],
  'ÖVERKROPP': [
    '/images/upper-body/bankpress-1.png',
    '/images/upper-body/pull-up-1.png',
    '/images/upper-body/push-up-1.png',
  ],
  'UPPER_BODY': [
    '/images/upper-body/bankpress-1.png',
    '/images/upper-body/pull-up-1.png',
    '/images/upper-body/bent-over-row-1.png',
  ],
  'FOT & VRIST': [
    '/images/foot-ankle/tahavningar-raka-ben-1.png',
    '/images/foot-ankle/pogo-jumps-1.png',
    '/images/foot-ankle/tahavningar-bojda-ben-1.png',
  ],
  'FOOT_ANKLE': [
    '/images/foot-ankle/tahavningar-raka-ben-1.png',
    '/images/foot-ankle/pogo-jumps-1.png',
    '/images/foot-ankle/tahavningar-bojda-ben-1.png',
  ],
  'EXPLOSIVITET': [
    '/images/posterior-chain/box-jump-1.png',
    '/images/posterior-chain/bred-hopp-max-1.png',
    '/images/knee-dominance/hoppsquat-1.png',
  ],
  'STYRKA': [
    '/images/knee-dominance/knaboj-1.png',
    '/images/posterior-chain/marklyft-1.png',
    '/images/upper-body/bankpress-1.png',
  ],
  'LÖPNING': [
    '/images/foot-ankle/running-1.png',
    '/images/foot-ankle/skipping-1.png',
    '/images/foot-ankle/pogo-jumps-1.png',
  ],
  'RUNNING': [
    '/images/foot-ankle/running-1.png',
    '/images/foot-ankle/skipping-1.png',
    '/images/foot-ankle/lateral-hops-1.png',
  ],
  'CARDIO': [
    '/images/posterior-chain/skierg-1.png',
    '/images/posterior-chain/row-calories-1.png',
    '/images/foot-ankle/assault-bike-calories-1.png',
  ],
  'HYROX': [
    '/images/posterior-chain/sled-push-hyrox-1.png',
    '/images/posterior-chain/wall-balls-hyrox-1.png',
    '/images/knee-dominance/sandbag-lunges-hyrox-1.png',
    '/images/core/farmers-carry-hyrox-1.png',
  ],
  'SIMNING': [
    '/images/foot-ankle/swimming-1.png',
  ],
  'SWIMMING': [
    '/images/foot-ankle/swimming-1.png',
  ],
  'ÅTERHÄMTNING': [
    '/images/core/bird-dog-1.png',
    '/images/core/dead-bug-1.png',
    '/images/foot-ankle/toe-yoga-1.png',
  ],
  'RECOVERY': [
    '/images/core/bird-dog-1.png',
    '/images/core/dead-bug-1.png',
    '/images/foot-ankle/toe-yoga-1.png',
  ],
  'POWER': [
    '/images/posterior-chain/thruster-1.png',
    '/images/posterior-chain/hang-power-snatch-1.png',
    '/images/posterior-chain/box-jump-1.png',
  ],
  'OLYMPIC': [
    '/images/posterior-chain/hang-power-snatch-1.png',
    '/images/posterior-chain/sandbag-clean-1.png',
    '/images/knee-dominance/squat-snatch-1.png',
  ],
}

// Get a random image for a category
function getCategoryImage(category: string): string | null {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['STYRKA']
  if (!images || images.length === 0) return null
  // Use a consistent image based on category name hash
  const index = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % images.length
  return images[index]
}

// Format intensity for display
function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Lätt',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intensiv',
    MAX: 'Max',
  }
  return intensities[intensity] || intensity
}

// Get intensity color class
function getIntensityColor(intensity: string): string {
  const colors: Record<string, string> = {
    RECOVERY: 'text-emerald-400',
    EASY: 'text-emerald-400',
    MODERATE: 'text-yellow-400',
    THRESHOLD: 'text-orange-400',
    INTERVAL: 'text-red-400',
    MAX: 'text-red-500',
  }
  return colors[intensity] || 'text-orange-400'
}

// Get badge icon based on workout type
function getBadgeIcon(type: string) {
  switch (type) {
    case 'RUNNING':
      return Route
    case 'STRENGTH':
      return Dumbbell
    case 'PLYOMETRIC':
      return Zap
    case 'CORE':
      return Activity
    default:
      return Flame
  }
}

// Calculate totals from segments (more accurate than stored values)
function calculateTotalsFromSegments(
  segments: DashboardWorkoutWithContext['segments'],
  storedDuration?: number | null,
  storedDistance?: number | null
): { duration: number | null; distance: number | null } {
  if (!segments || segments.length === 0) {
    return { duration: storedDuration ?? null, distance: storedDistance ?? null }
  }

  let totalDuration = 0
  let totalDistance = 0
  let hasDistanceData = false
  let hasDurationData = false

  for (const segment of segments) {
    // Sum duration (in minutes)
    if (segment.duration) {
      totalDuration += segment.duration
      hasDurationData = true
    } else if (segment.distance && segment.pace) {
      // Calculate duration from distance and pace
      // pace can be string like "393" (seconds/km) or "6:33"
      let paceSeconds: number
      if (typeof segment.pace === 'string' && segment.pace.includes(':')) {
        const [min, sec] = segment.pace.split(':').map(Number)
        paceSeconds = min * 60 + (sec || 0)
      } else {
        paceSeconds = typeof segment.pace === 'string' ? parseInt(segment.pace, 10) : segment.pace
      }
      if (!isNaN(paceSeconds) && paceSeconds > 0) {
        const durationMinutes = (segment.distance * paceSeconds) / 60
        totalDuration += durationMinutes
        hasDurationData = true
      }
    }

    // Sum distance (segments store in km)
    if (segment.distance) {
      totalDistance += segment.distance
      hasDistanceData = true
    }
  }

  return {
    duration: hasDurationData ? Math.round(totalDuration) : (storedDuration ?? null),
    distance: hasDistanceData ? Math.round(totalDistance * 10) / 10 : (storedDistance ?? null),
  }
}

// Estimate volume from segments (sets × reps × weight)
function estimateVolume(segments: DashboardWorkoutWithContext['segments']): number | null {
  if (!segments || segments.length === 0) return null

  let totalVolume = 0
  for (const segment of segments) {
    if (segment.sets && segment.repsCount) {
      const reps = parseInt(segment.repsCount) || 0
      const weight = parseFloat(segment.weight?.replace(/[^0-9.]/g, '') || '0') || 0
      // If bodyweight exercise, estimate 50kg
      const effectiveWeight = weight > 0 ? weight : 50
      totalVolume += segment.sets * reps * effectiveWeight
    }
  }

  return totalVolume > 0 ? totalVolume : null
}

// Format volume for display
function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1).replace('.0', '')}k kg`
  }
  return `${Math.round(volume)} kg`
}

export function HeroWorkoutCard({ workout, athleteName, modification, basePath = '' }: HeroWorkoutCardProps) {
  // Generate focus if not already set
  const focus: WorkoutFocus = useMemo(() => {
    if (workout.heroTitle && workout.heroDescription && workout.heroCategory) {
      return {
        title: workout.heroTitle,
        description: workout.heroDescription,
        category: workout.heroCategory,
        imageKey: workout.heroImageKey,
        generatedBy: (workout.focusGeneratedBy as 'AI' | 'RULE_BASED') || 'RULE_BASED',
      }
    }
    return generateSimpleFocus(
      workout.type,
      workout.intensity,
      workout.name,
      workout.description
    )
  }, [workout])

  // Calculate duration and distance from segments (more accurate than stored values)
  const calculatedTotals = useMemo(() =>
    calculateTotalsFromSegments(workout.segments, workout.duration, workout.distance),
    [workout.segments, workout.duration, workout.distance]
  )

  const categoryImage = getCategoryImage(focus.category)
  const volume = estimateVolume(workout.segments)
  const isCompleted = workout.logs && workout.logs.length > 0 && workout.logs[0].completed
  const BadgeIcon = getBadgeIcon(workout.type)

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group transition-all">
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Background exercise image */}
      {categoryImage && (
        <div className="absolute top-0 right-0 p-6 md:p-8 w-1/2 h-full hidden md:block opacity-20 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen pointer-events-none transition-opacity">
          <div className="relative w-full h-full">
            <Image
              src={categoryImage}
              alt={focus.title}
              fill
              style={{ objectFit: 'contain', objectPosition: 'right center' }}
              className="dark:drop-shadow-[0_0_15px_rgba(255,100,0,0.3)] grayscale-[20%] dark:grayscale-0"
              priority
            />
          </div>
        </div>
      )}

      <div className="p-6 md:p-8 relative z-10 flex flex-col h-full justify-between min-h-[280px] md:min-h-[300px]">
        {/* Modification Banner (Gap 4 fix) */}
        {modification && modification.decision !== 'PROCEED_NORMAL' && (
          <ModificationBanner modification={modification} />
        )}

        <div>
          {/* Category Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold uppercase tracking-wider mb-4 transition-colors">
            <BadgeIcon className="w-3 h-3" />
            {focus.category}
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 max-w-md transition-colors">
            {focus.title}
          </h2>

          {/* Description */}
          <p className="text-slate-600 dark:text-slate-400 max-w-sm text-sm md:text-base transition-colors">
            {focus.description}
          </p>

          {/* Completed badge */}
          {isCompleted && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium transition-colors">
              <TrendingUp className="w-3 h-3" />
              Slutfört
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 mt-6 md:mt-8">
          {calculatedTotals.duration && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Längd</div>
              <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                <Timer className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-500" />
                {calculatedTotals.duration} min
              </div>
            </div>
          )}

          {volume && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Volym</div>
              <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                <Dumbbell className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-500" />
                {formatVolume(volume)}
              </div>
            </div>
          )}

          {calculatedTotals.distance && !volume && (
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Distans</div>
              <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                <Route className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-500" />
                {calculatedTotals.distance} km
              </div>
            </div>
          )}

          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Intensitet</div>
            <div className={`text-lg md:text-xl font-bold flex items-center gap-2 ${getIntensityColor(workout.intensity)}`}>
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              {formatIntensity(workout.intensity)}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          {isCompleted ? (
            <Link href={`${basePath}/athlete/workouts/${workout.id}`}>
              <Button
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] border-slate-200 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/30 transition-all"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Visa resultat
              </Button>
            </Link>
          ) : (
            <Link href={`${basePath}/athlete/workouts/${workout.id}/log`}>
              <Button className="w-full sm:w-auto min-h-[48px] bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 dark:shadow-[0_0_20px_rgba(234,88,12,0.3)] border-0 transition-all">
                <Play className="w-4 h-4 mr-2" />
                Starta pass
              </Button>
            </Link>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
