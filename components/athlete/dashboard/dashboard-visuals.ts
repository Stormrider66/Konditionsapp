import type { DashboardItem, AssignmentType } from '@/types/dashboard-items'
import type { DashboardWorkoutWithContext } from '@/types/prisma-types'

export type DashboardVisualKey =
  | 'running'
  | 'cycling'
  | 'strength'
  | 'recovery'
  | 'skiing'
  | 'swimming'
  | 'team'

export interface DashboardVisual {
  key: DashboardVisualKey
  src: string
  alt: string
  accentClass: string
  glowClass: string
  objectPosition?: string
}

export const DASHBOARD_VISUALS: Record<DashboardVisualKey, DashboardVisual> = {
  running: {
    key: 'running',
    src: '/images/dashboard-visuals/threshold-running.jpg',
    alt: 'Runner on a dark athletics track at dusk',
    accentClass: 'from-orange-500/30 via-transparent to-cyan-500/10',
    glowClass: 'bg-orange-500/20',
    objectPosition: 'center',
  },
  cycling: {
    key: 'cycling',
    src: '/images/dashboard-visuals/indoor-cycling.jpg',
    alt: 'Cyclist training indoors in a quiet performance space',
    accentClass: 'from-cyan-500/20 via-transparent to-orange-500/10',
    glowClass: 'bg-cyan-500/20',
    objectPosition: 'center',
  },
  strength: {
    key: 'strength',
    src: '/images/dashboard-visuals/strength-lab.jpg',
    alt: 'Athlete preparing strength equipment in a dark gym',
    accentClass: 'from-orange-500/25 via-transparent to-slate-500/10',
    glowClass: 'bg-orange-500/20',
    objectPosition: 'center',
  },
  recovery: {
    key: 'recovery',
    src: '/images/dashboard-visuals/recovery-morning.jpg',
    alt: 'Recovery setup with training shoes, water, and a journal by a window',
    accentClass: 'from-cyan-500/20 via-transparent to-emerald-500/10',
    glowClass: 'bg-cyan-500/20',
    objectPosition: 'center',
  },
  skiing: {
    key: 'skiing',
    src: '/images/dashboard-visuals/nordic-ski.jpg',
    alt: 'Cross-country skier on a dark Nordic trail at dawn',
    accentClass: 'from-sky-500/25 via-transparent to-orange-500/10',
    glowClass: 'bg-sky-500/20',
    objectPosition: 'center',
  },
  swimming: {
    key: 'swimming',
    src: '/images/dashboard-visuals/pool-lanes.jpg',
    alt: 'Swimmer in a quiet indoor pool with dark lane water',
    accentClass: 'from-cyan-500/25 via-transparent to-blue-500/10',
    glowClass: 'bg-cyan-500/20',
    objectPosition: 'center',
  },
  team: {
    key: 'team',
    src: '/images/dashboard-visuals/team-court.jpg',
    alt: 'Athlete preparing on a quiet indoor court before training',
    accentClass: 'from-emerald-500/20 via-transparent to-orange-500/10',
    glowClass: 'bg-emerald-500/20',
    objectPosition: 'center',
  },
}

const TEAM_AND_RACKET_TYPES = new Set([
  'TEAM_FOOTBALL',
  'TEAM_ICE_HOCKEY',
  'TEAM_HANDBALL',
  'TEAM_FLOORBALL',
  'TEAM_BASKETBALL',
  'TEAM_VOLLEYBALL',
  'TENNIS',
  'PADEL',
  'AGILITY',
])

const STRENGTH_KEYS = [
  'STRENGTH',
  'HYROX',
  'FUNCTIONAL_FITNESS',
  'GENERAL_FITNESS',
  'PLYOMETRIC',
  'CORE',
  'POWER',
  'OLYMPIC',
  'POSTERIOR',
  'KNEE',
  'QUAD',
  'UNILATERAL',
  'UPPER',
  'FOOT',
  'ANKLE',
  'STYRKA',
  'EXPLOSIV',
]

function normalize(value?: string | null): string {
  return (value ?? '').trim().toUpperCase()
}

function includesAny(value: string, keys: string[]): boolean {
  return keys.some((key) => value.includes(key))
}

export function getVisualByKey(key: DashboardVisualKey): DashboardVisual {
  return DASHBOARD_VISUALS[key]
}

export function getWorkoutVisual(input: {
  type?: string | null
  intensity?: string | null
  category?: string | null
  imageKey?: string | null
  name?: string | null
}): DashboardVisual {
  const type = normalize(input.type)
  const intensity = normalize(input.intensity)
  const category = normalize(input.category)
  const imageKey = normalize(input.imageKey)
  const name = normalize(input.name)
  const combined = `${type} ${intensity} ${category} ${imageKey} ${name}`

  if (
    type === 'RECOVERY' ||
    intensity === 'RECOVERY' ||
    combined.includes('RECOVERY') ||
    combined.includes('ÅTERHÄMT') ||
    combined.includes('ATERHAMT')
  ) {
    return DASHBOARD_VISUALS.recovery
  }

  if (type === 'SWIMMING' || combined.includes('SWIM') || combined.includes('SIMNING')) {
    return DASHBOARD_VISUALS.swimming
  }

  if (type === 'SKIING' || combined.includes('SKI') || combined.includes('SKID')) {
    return DASHBOARD_VISUALS.skiing
  }

  if (type === 'CYCLING' || combined.includes('CYCL') || combined.includes('CYKL') || combined.includes('BIKE')) {
    return DASHBOARD_VISUALS.cycling
  }

  if (TEAM_AND_RACKET_TYPES.has(type) || includesAny(combined, ['FOOTBALL', 'HOCKEY', 'HANDBALL', 'FLOORBALL', 'BASKETBALL', 'VOLLEYBALL', 'TENNIS', 'PADEL'])) {
    return DASHBOARD_VISUALS.team
  }

  if (includesAny(combined, STRENGTH_KEYS)) {
    return DASHBOARD_VISUALS.strength
  }

  return DASHBOARD_VISUALS.running
}

export function getAssignmentVisual(type: AssignmentType, sport?: string | null): DashboardVisual {
  if (type === 'cardio') {
    return getWorkoutVisual({ type: sport || 'RUNNING' })
  }
  if (type === 'agility') {
    return DASHBOARD_VISUALS.team
  }
  return DASHBOARD_VISUALS.strength
}

export function getDashboardItemVisual(item: DashboardItem): DashboardVisual {
  if (item.kind === 'program') {
    const workout: DashboardWorkoutWithContext = item.workout
    return getWorkoutVisual({
      type: workout.type,
      intensity: workout.intensity,
      category: workout.heroCategory,
      imageKey: workout.heroImageKey,
      name: workout.name,
    })
  }

  if (item.kind === 'assignment') {
    return getAssignmentVisual(item.assignmentType, item.sport || item.name)
  }

  if (item.kind === 'wod') {
    return getWorkoutVisual({
      type: item.workoutType || item.primarySport || null,
      intensity: item.intensityAdjusted,
      name: item.title,
    })
  }

  return getWorkoutVisual({
    type: item.parsedType,
    intensity: item.summary.intensity,
    name: item.workoutName,
  })
}

export function getRestDayVisual(input: {
  mode?: 'rest-day' | 'open-day'
  sportType?: string | null
  recentActivityType?: string | null
}): DashboardVisual {
  if (input.recentActivityType) {
    return getWorkoutVisual({ type: input.recentActivityType })
  }

  if (input.mode === 'open-day' && input.sportType) {
    return getWorkoutVisual({ type: input.sportType })
  }

  return DASHBOARD_VISUALS.recovery
}
