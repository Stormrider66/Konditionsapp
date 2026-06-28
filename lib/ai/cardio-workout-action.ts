import { z } from 'zod'

export const CREATE_CARDIO_WORKOUT_TOOL_NAME = 'createCardioWorkout'

const sportValues = [
  'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX',
  'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH',
  'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL',
  'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL', 'TENNIS', 'PADEL',
] as const

const equipmentValues = [
  'RUN', 'TREADMILL', 'BIKE', 'ASSAULT_BIKE', 'ECHO_BIKE', 'WATTBIKE',
  'BIKE_ERG', 'ROW', 'SKI_ERG', 'SWIM', 'OTHER',
] as const

const cardioWorkoutStationSchema = z.object({
  equipment: z.enum(equipmentValues).optional().describe('Machine/modality. Concept2 machines: BIKE_ERG, ROW, SKI_ERG.'),
  durationSeconds: z.number().int().min(10).max(3600).optional().describe('Fixed work window in seconds (e.g. 60 for on-the-minute work).'),
  calories: z.number().int().min(1).max(200).optional().describe('Calorie goal. Without durationSeconds the station ends when the target is reached.'),
  distanceMeters: z.number().int().min(50).max(50000).optional().describe('Distance in meters, if distance-based.'),
  targetWatts: z.number().int().min(30).max(1000).optional().describe('Power target in watts.'),
  zone: z.number().int().min(1).max(5).optional().describe('Intensity zone 1-5.'),
  notes: z.string().max(300).optional(),
}).superRefine((station, ctx) => {
  if (station.durationSeconds != null || station.calories != null || station.distanceMeters != null) return
  ctx.addIssue({
    code: 'custom',
    message: 'Each station needs durationSeconds, calories, or distanceMeters.',
    path: ['durationSeconds'],
  })
})

export const createCardioWorkoutInputSchema = z.object({
  name: z.string().min(1).max(120).describe('Short session name, e.g. "Triple erg EMOM".'),
  description: z.string().max(500).optional().describe('One-line description of the session.'),
  sport: z.enum(sportValues).optional().describe('Sport. Default GENERAL_FITNESS.'),
  date: z.string().optional().describe('Assignment date (YYYY-MM-DD). Default: today.'),
  warmupMinutes: z.number().int().min(1).max(60).optional().describe('Optional warm-up duration in minutes.'),
  cooldownMinutes: z.number().int().min(1).max(60).optional().describe('Optional cool-down duration in minutes.'),
  rounds: z.number().int().min(1).max(30).optional().describe('Rounds of the station circuit. Default 1.'),
  restBetweenRoundsSeconds: z.number().int().min(5).max(600).optional().describe('Rest between rounds in seconds.'),
  pushToGarmin: z.boolean().optional().describe('Set true only when the athlete explicitly asks to send/push this workout to their Garmin watch.'),
  stations: z.array(cardioWorkoutStationSchema).min(1).max(10).describe('The stations of one round, in order.'),
})

export type CreateCardioWorkoutInput = z.infer<typeof createCardioWorkoutInputSchema>

type AppLocale = 'en' | 'sv'

interface ActionPreview {
  title: string
  description: string
  targetLabel?: string
  body?: string | null
  details: string[]
  confirmLabel?: string
}

interface RealtimeFunctionTool {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function stockholmDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatSeconds(seconds: number, locale: AppLocale): string {
  if (seconds % 60 === 0) return `${seconds / 60} ${t(locale, 'min', 'min')}`
  if (seconds < 60) return `${seconds} ${t(locale, 'sec', 'sek')}`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')} ${t(locale, 'min', 'min')}`
}

function equipmentLabel(value: CreateCardioWorkoutInput['stations'][number]['equipment'], locale: AppLocale): string {
  if (!value) return t(locale, 'unspecified equipment', 'ej angiven utrustning')
  const labels: Record<NonNullable<typeof value>, string> = {
    RUN: t(locale, 'Run', 'Löpning'),
    TREADMILL: t(locale, 'Treadmill', 'Löpband'),
    BIKE: t(locale, 'Bike', 'Cykel'),
    ASSAULT_BIKE: 'Assault Bike',
    ECHO_BIKE: 'Echo Bike',
    WATTBIKE: 'Wattbike',
    BIKE_ERG: 'BikeErg',
    ROW: t(locale, 'Row', 'Rodd'),
    SKI_ERG: 'SkiErg',
    SWIM: t(locale, 'Swim', 'Simning'),
    OTHER: t(locale, 'Other', 'Annat'),
  }
  return labels[value]
}

function stationIntensity(station: CreateCardioWorkoutInput['stations'][number], locale: AppLocale): string | null {
  const parts = [
    station.zone != null ? `${t(locale, 'zone', 'zon')} ${station.zone}` : null,
    station.targetWatts != null ? `${station.targetWatts} W` : null,
    station.notes?.trim() || null,
  ].filter((part): part is string => Boolean(part))
  return parts.length ? parts.join(' · ') : null
}

function stationWorkLabel(station: CreateCardioWorkoutInput['stations'][number], locale: AppLocale): string {
  const parts = [
    equipmentLabel(station.equipment, locale),
    station.durationSeconds != null ? formatSeconds(station.durationSeconds, locale) : null,
    station.distanceMeters != null ? `${station.distanceMeters} m` : null,
    station.calories != null ? `${station.calories} kcal` : null,
  ].filter((part): part is string => Boolean(part))

  return parts.join(' · ')
}

export function estimateCreateCardioWorkoutDurationSeconds(input: CreateCardioWorkoutInput): number | null {
  const repeats = input.rounds ?? 1
  const stationSeconds = input.stations.reduce((sum, station) => sum + (station.durationSeconds ?? 0), 0)
  const total =
    (input.warmupMinutes ?? 0) * 60 +
    (input.cooldownMinutes ?? 0) * 60 +
    repeats * stationSeconds +
    Math.max(0, repeats - 1) * (input.restBetweenRoundsSeconds ?? 0)

  return total > 0 ? total : null
}

export function getCreateCardioWorkoutClarification(input: CreateCardioWorkoutInput, locale: AppLocale): string | null {
  const repeats = input.rounds ?? 1
  const hasTimedWork = input.stations.some((station) => station.durationSeconds != null)
  const looksLikeIntervals = repeats > 1 && hasTimedWork
  if (!looksLikeIntervals) return null

  const missing: string[] = []
  if (input.restBetweenRoundsSeconds == null) missing.push(t(locale, 'rest duration', 'vila'))

  const hasIntensity = input.stations.some((station) => station.zone != null || station.targetWatts != null || Boolean(station.notes?.trim()))
  if (!hasIntensity) missing.push(t(locale, 'intensity', 'intensitet'))

  if (!missing.length) return null

  return t(
    locale,
    `Ask the athlete for ${missing.join(' and ')} before preparing the confirmation card.`,
    `Fråga atleten om ${missing.join(' och ')} innan du förbereder bekräftelsekortet.`
  )
}

export function buildCreateCardioWorkoutPreview(input: CreateCardioWorkoutInput, locale: AppLocale): ActionPreview {
  const repeats = input.rounds ?? 1
  const date = input.date || stockholmDateKey()
  const totalSeconds = estimateCreateCardioWorkoutDurationSeconds(input)
  const firstStation = input.stations[0]
  const firstIntensity = firstStation ? stationIntensity(firstStation, locale) : null
  const workSummary = input.stations.length === 1 && firstStation
    ? `${repeats} x ${stationWorkLabel(firstStation, locale)}`
    : `${repeats} ${t(locale, 'rounds', 'varv')} · ${input.stations.length} ${t(locale, 'stations', 'stationer')}`

  const details = [
    `${t(locale, 'Date', 'Datum')}: ${date}`,
    `${t(locale, 'Sport', 'Sport')}: ${input.sport ?? 'GENERAL_FITNESS'}`,
    `${t(locale, 'Work', 'Arbete')}: ${workSummary}`,
    input.restBetweenRoundsSeconds != null
      ? `${t(locale, 'Rest between rounds', 'Vila mellan varv')}: ${formatSeconds(input.restBetweenRoundsSeconds, locale)}`
      : null,
    firstIntensity ? `${t(locale, 'Intensity', 'Intensitet')}: ${firstIntensity}` : null,
    input.warmupMinutes != null ? `${t(locale, 'Warm-up', 'Uppvärmning')}: ${input.warmupMinutes} min` : null,
    input.cooldownMinutes != null ? `${t(locale, 'Cool-down', 'Nedvarvning')}: ${input.cooldownMinutes} min` : null,
    totalSeconds != null ? `${t(locale, 'Estimated total time', 'Beräknad totaltid')}: ${formatSeconds(totalSeconds, locale)}` : null,
    input.pushToGarmin ? `${t(locale, 'Garmin', 'Garmin')}: ${t(locale, 'send to watch', 'skicka till klockan')}` : null,
  ].filter((detail): detail is string => Boolean(detail))

  return {
    title: input.name || t(locale, 'Create cardio workout', 'Skapa konditionspass'),
    description: t(
      locale,
      'Review this planned workout before it is added to your training.',
      'Granska det planerade passet innan det läggs till i din träning.'
    ),
    targetLabel: workSummary,
    body: input.description || null,
    details,
    confirmLabel: input.pushToGarmin
      ? t(locale, 'Create and send to Garmin', 'Skapa och skicka till Garmin')
      : t(locale, 'Create cardio workout', 'Skapa konditionspass'),
  }
}

export function buildCreateCardioWorkoutRealtimeTool(locale: AppLocale): RealtimeFunctionTool {
  return {
    type: 'function',
    name: CREATE_CARDIO_WORKOUT_TOOL_NAME,
    description: t(
      locale,
      'Prepare a visible confirmation card for a planned cardio or erg workout. Use only for workouts the athlete wants to do, not completed workouts. For interval workouts, ask for rest duration and intensity before calling. The function does not save the workout; the athlete must confirm the card.',
      'Förbered ett synligt bekräftelsekort för ett planerat konditions- eller ergometerpass. Använd bara för pass atleten vill göra, inte genomförda pass. För intervallpass ska du fråga efter vila och intensitet innan du anropar funktionen. Funktionen sparar inte passet; atleten måste bekräfta kortet.'
    ),
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: t(locale, 'Short workout name.', 'Kort passnamn.'),
        },
        description: {
          type: 'string',
          description: t(locale, 'One-line workout description.', 'Kort passbeskrivning.'),
        },
        sport: {
          type: 'string',
          enum: sportValues,
          description: t(locale, 'Use CYCLING for bike/Wattbike requests.', 'Använd CYCLING för cykel-/Wattbike-pass.'),
        },
        date: {
          type: 'string',
          description: t(locale, 'Assignment date in YYYY-MM-DD. Use today from the system instructions when the athlete says today.', 'Tilldelningsdatum i YYYY-MM-DD. Använd dagens datum från instruktionerna när atleten säger idag.'),
        },
        warmupMinutes: { type: 'integer', minimum: 1, maximum: 60 },
        cooldownMinutes: { type: 'integer', minimum: 1, maximum: 60 },
        rounds: {
          type: 'integer',
          minimum: 1,
          maximum: 30,
          description: t(locale, 'For 10 x 3 min intervals, use rounds = 10 and one 180-second station.', 'För 10 x 3 min intervaller, använd rounds = 10 och en station på 180 sekunder.'),
        },
        restBetweenRoundsSeconds: {
          type: 'integer',
          minimum: 5,
          maximum: 600,
          description: t(locale, 'Required for repeated interval workouts.', 'Krävs för upprepade intervallpass.'),
        },
        pushToGarmin: {
          type: 'boolean',
          description: t(
            locale,
            'Set true only when the athlete explicitly asks to send this workout to their Garmin watch.',
            'Sätt true bara när atleten uttryckligen ber om att skicka passet till sin Garmin-klocka.'
          ),
        },
        stations: {
          type: 'array',
          minItems: 1,
          maxItems: 10,
          items: {
            type: 'object',
            anyOf: [
              { required: ['durationSeconds'] },
              { required: ['calories'] },
              { required: ['distanceMeters'] },
            ],
            properties: {
              equipment: {
                type: 'string',
                enum: equipmentValues,
                description: t(locale, 'Use WATTBIKE when the athlete says Wattbike; otherwise BIKE for bike.', 'Använd WATTBIKE när atleten säger Wattbike; annars BIKE för cykel.'),
              },
              durationSeconds: { type: 'integer', minimum: 10, maximum: 3600 },
              calories: { type: 'integer', minimum: 1, maximum: 200 },
              distanceMeters: { type: 'integer', minimum: 50, maximum: 50000 },
              targetWatts: { type: 'integer', minimum: 30, maximum: 1000 },
              zone: { type: 'integer', minimum: 1, maximum: 5 },
              notes: {
                type: 'string',
                description: t(locale, 'Intensity or execution notes, e.g. threshold, hard, RPE 8.', 'Intensitet eller instruktion, t.ex. tröskel, hårt, RPE 8.'),
              },
            },
          },
        },
      },
      required: ['name', 'stations'],
    },
  }
}
