import type { CreateWorkoutSegmentDTO } from '@/types'
import type { HYROXTemplateWorkout } from '../../templates/hyrox'

/**
 * Official HYROX station config — distances, reps, weights per division,
 * technique cues, and target times per performance level.
 */
export interface StationConfig {
  id: string
  name: string
  nameSv: string
  distance?: number
  reps?: number
  weightOpen: { male: number | string; female: number | string }
  weightPro: { male: number | string; female: number | string }
  technique: string
  techniqueSv: string
  targetTimeElite: { min: number; max: number }
  targetTimeIntermediate: { min: number; max: number }
}

export const HYROX_STATIONS: StationConfig[] = [
  {
    id: 'skierg',
    name: 'SkiErg',
    nameSv: 'SkiErg',
    distance: 1000,
    weightOpen: { male: 'Damper 6', female: 'Damper 5' },
    weightPro: { male: 'Damper 7', female: 'Damper 6' },
    technique: 'Long arm movement, drive from core, hinge at hips',
    techniqueSv: 'Lång armrörelse, driv från core, höftled',
    targetTimeElite: { min: 210, max: 225 },
    targetTimeIntermediate: { min: 255, max: 285 },
  },
  {
    id: 'sled_push',
    name: 'Sled Push',
    nameSv: 'Släde Push',
    distance: 50,
    weightOpen: { male: 152, female: 102 },
    weightPro: { male: 202, female: 152 },
    technique: 'Low body position, short steps, drive through legs',
    techniqueSv: 'Låg kroppsposition, korta steg, driv genom benen',
    targetTimeElite: { min: 150, max: 170 },
    targetTimeIntermediate: { min: 225, max: 270 },
  },
  {
    id: 'sled_pull',
    name: 'Sled Pull',
    nameSv: 'Släde Pull',
    distance: 50,
    weightOpen: { male: 103, female: 78 },
    weightPro: { male: 153, female: 103 },
    technique: 'Hand-over-hand technique, sit back, engage lats',
    techniqueSv: 'Hand-över-hand teknik, sitt bakåt, aktivera latsen',
    targetTimeElite: { min: 180, max: 200 },
    targetTimeIntermediate: { min: 330, max: 390 },
  },
  {
    id: 'burpee_broad_jump',
    name: 'Burpee Broad Jump',
    nameSv: 'Burpee Längdhopp',
    distance: 80,
    weightOpen: { male: '-', female: '-' },
    weightPro: { male: '-', female: '-' },
    technique: 'Efficient jumps, minimize time on ground, steady pace',
    techniqueSv: 'Effektiva hopp, minimera tid på marken, jämn takt',
    targetTimeElite: { min: 140, max: 160 },
    targetTimeIntermediate: { min: 300, max: 360 },
  },
  {
    id: 'rowing',
    name: 'Rowing',
    nameSv: 'Rodd',
    distance: 1000,
    weightOpen: { male: 'Damper 6', female: 'Damper 5' },
    weightPro: { male: 'Damper 7', female: 'Damper 6' },
    technique: 'Drive with legs first, long stroke finish, controlled recovery',
    techniqueSv: 'Driv med benen först, lång avslutning, kontrollerad återhämtning',
    targetTimeElite: { min: 210, max: 225 },
    targetTimeIntermediate: { min: 270, max: 300 },
  },
  {
    id: 'farmers_carry',
    name: 'Farmers Carry',
    nameSv: 'Farmers Carry',
    distance: 200,
    weightOpen: { male: 24, female: 16 },
    weightPro: { male: 32, female: 24 },
    technique: 'Straight back, short quick steps, tight core',
    techniqueSv: 'Rak rygg, korta snabba steg, spänd core',
    targetTimeElite: { min: 75, max: 90 },
    targetTimeIntermediate: { min: 150, max: 180 },
  },
  {
    id: 'sandbag_lunge',
    name: 'Sandbag Lunges',
    nameSv: 'Sandsäck Utfall',
    distance: 100,
    weightOpen: { male: 20, female: 10 },
    weightPro: { male: 30, female: 20 },
    technique: 'Knee to floor, stable core, upright torso',
    techniqueSv: 'Knä till golv, stabil core, upprätt överkropp',
    targetTimeElite: { min: 150, max: 180 },
    targetTimeIntermediate: { min: 300, max: 360 },
  },
  {
    id: 'wall_balls',
    name: 'Wall Balls',
    nameSv: 'Wall Balls',
    reps: 100, // Men Open/Pro get 100, women get 75.
    weightOpen: { male: 6, female: 4 },
    weightPro: { male: 9, female: 6 },
    technique: 'Full squat, high throw, catch and descend in one motion',
    techniqueSv: 'Full knäböj, högt kast, fånga och sjunk i en rörelse',
    targetTimeElite: { min: 180, max: 210 },
    targetTimeIntermediate: { min: 390, max: 480 },
  },
]

/** Extract station ids referenced by name in the workout's free-text fields. */
export function parseStationsFromWorkout(workout: HYROXTemplateWorkout): string[] {
  const text = `${workout.name} ${workout.description || ''} ${workout.structure || ''}`.toLowerCase()
  const stations: string[] = []

  const stationKeywords: Record<string, string> = {
    'skierg': 'skierg',
    'ski erg': 'skierg',
    'sled push': 'sled_push',
    'släde push': 'sled_push',
    'sled pull': 'sled_pull',
    'släde pull': 'sled_pull',
    'burpee': 'burpee_broad_jump',
    'bred hopp': 'burpee_broad_jump',
    'rowing': 'rowing',
    'rodd': 'rowing',
    'farmers carry': 'farmers_carry',
    'farmer': 'farmers_carry',
    'sandbag': 'sandbag_lunge',
    'sandsäck': 'sandbag_lunge',
    'lunge': 'sandbag_lunge',
    'utfall': 'sandbag_lunge',
    'wall ball': 'wall_balls',
    'wallball': 'wall_balls',
  }

  for (const [keyword, stationId] of Object.entries(stationKeywords)) {
    if (text.includes(keyword) && !stations.includes(stationId)) {
      stations.push(stationId)
    }
  }

  return stations
}

/** "3 rundor" / "3 rounds" / "3x" → 3. Falls back to duration heuristic. */
export function parseRoundsFromWorkout(workout: HYROXTemplateWorkout): number {
  const text = `${workout.structure || ''} ${workout.description || ''}`.toLowerCase()
  const roundMatch = text.match(/(\d+)\s*(rundor|rounds|x\s)/i)
  if (roundMatch) return parseInt(roundMatch[1])
  if (workout.duration >= 60) return 3
  if (workout.duration >= 40) return 2
  return 1
}

/**
 * Create station workout segments. Full HYROX simulations emit the
 * official 8 runs + 8 stations with roxzone transitions; partial
 * practice emits whichever stations were referenced in the template
 * description, scaled down to ~50%.
 */
export function createStationSegments(
  workout: HYROXTemplateWorkout,
  division?: 'open' | 'pro' | 'doubles',
  gender?: 'male' | 'female',
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
): CreateWorkoutSegmentDTO[] {
  const segments: CreateWorkoutSegmentDTO[] = []
  let segmentOrder = 1
  const div = division || 'open'
  const gen = gender || 'male'
  const level = experienceLevel || 'intermediate'

  const isFullSimulation =
    workout.type === 'hyrox_simulation' ||
    workout.name.toLowerCase().includes('simulering') ||
    workout.name.toLowerCase().includes('simulation')

  const stationsToInclude = parseStationsFromWorkout(workout)

  segments.push({
    order: segmentOrder++,
    type: 'warmup',
    duration: isFullSimulation ? 15 : 10,
    zone: 2,
    description: isFullSimulation
      ? 'Uppvärmning: 5 min rodd/SkiErg, dynamisk stretch, aktivering'
      : 'Uppvärmning: 5 min lätt cardio, rörlighet',
  })

  if (isFullSimulation) {
    // 8 × (run + roxzone + station).
    const runDistanceKm = 1

    for (let i = 0; i < 8; i++) {
      const station = HYROX_STATIONS[i]
      const runNumber = i + 1
      const isDoublesPartnerA = div === 'doubles' && runNumber % 2 === 1
      const isDoublesPartnerB = div === 'doubles' && runNumber % 2 === 0

      const partnerRunNote = div === 'doubles'
        ? ` (Partner ${isDoublesPartnerA ? 'A' : 'B'})`
        : ''

      segments.push({
        order: segmentOrder++,
        type: 'interval',
        distance: runDistanceKm,
        zone: 3,
        description: `Löpning ${runNumber}/8: 1 km${partnerRunNote}`,
      })

      segments.push({
        order: segmentOrder++,
        type: 'rest',
        duration: 1, // ~45-60 s transition
        zone: 1,
        description: `Roxzone ${runNumber}: Övergång till ${station.nameSv}`,
      })

      const weight = div === 'pro' ? station.weightPro[gen] : station.weightOpen[gen]
      const targetTime = level === 'advanced' || level === 'intermediate'
        ? station.targetTimeIntermediate
        : station.targetTimeElite
      const repsForWallBalls = station.id === 'wall_balls'
        ? (gen === 'female' ? 75 : 100)
        : undefined

      const partnerStationNote = div === 'doubles'
        ? ` - Partner ${isDoublesPartnerB ? 'A' : 'B'} (byte vid halva)`
        : ''

      const stationDescription = station.distance
        ? `${station.nameSv} ${station.distance}m @ ${typeof weight === 'number' ? weight + 'kg' : weight}${partnerStationNote}`
        : `${station.nameSv} ${repsForWallBalls} reps @ ${weight}kg${partnerStationNote}`

      segments.push({
        order: segmentOrder++,
        type: 'work',
        duration: Math.round(targetTime.max / 60),
        distance: station.distance ? station.distance / 1000 : undefined,
        reps: repsForWallBalls,
        zone: 4,
        description: stationDescription,
        notes: station.techniqueSv,
      })
    }
  } else {
    const selectedStations = stationsToInclude.length > 0
      ? HYROX_STATIONS.filter((s) => stationsToInclude.includes(s.id))
      : HYROX_STATIONS.slice(0, 4)

    const rounds = parseRoundsFromWorkout(workout)

    for (let round = 1; round <= rounds; round++) {
      if (rounds > 1) {
        segments.push({
          order: segmentOrder++,
          type: 'work',
          duration: 0,
          zone: 3,
          description: `--- Runda ${round}/${rounds} ---`,
        })
      }

      for (const station of selectedStations) {
        const weight = div === 'pro' ? station.weightPro[gen] : station.weightOpen[gen]
        const targetTime = level === 'advanced' ? station.targetTimeElite : station.targetTimeIntermediate

        // Practice stations run at ~50% of race distance/reps.
        const practiceDistance = station.distance ? Math.round(station.distance * 0.5) : undefined
        const practiceReps = station.reps ? Math.round(station.reps * 0.5) : undefined

        const partnerNote = div === 'doubles' ? ` (Partner ${round % 2 === 1 ? 'A' : 'B'})` : ''

        const description = practiceDistance
          ? `${station.nameSv} ${practiceDistance}m @ ${typeof weight === 'number' ? weight + 'kg' : weight}${partnerNote}`
          : `${station.nameSv} ${practiceReps} reps @ ${weight}kg${partnerNote}`

        segments.push({
          order: segmentOrder++,
          type: 'work',
          duration: Math.round((targetTime.max * 0.5) / 60),
          distance: practiceDistance ? practiceDistance / 1000 : undefined,
          reps: practiceReps,
          zone: 3,
          description,
          notes: station.techniqueSv,
        })

        if (selectedStations.indexOf(station) < selectedStations.length - 1) {
          segments.push({
            order: segmentOrder++,
            type: 'rest',
            duration: 1,
            zone: 1,
            description: 'Vila/övergång mellan stationer',
          })
        }
      }

      if (round < rounds) {
        segments.push({
          order: segmentOrder++,
          type: 'rest',
          duration: 2,
          zone: 1,
          description: `Vila mellan rundor: 2 min`,
        })
      }
    }
  }

  segments.push({
    order: segmentOrder++,
    type: 'cooldown',
    duration: 5,
    zone: 1,
    description: 'Nedvarvning: lätt stretch och rörlighet',
  })

  return segments
}
