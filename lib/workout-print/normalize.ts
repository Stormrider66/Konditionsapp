export type PrintableWorkoutKind = 'strength' | 'cardio' | 'hybrid' | 'agility'
type AppLocale = 'en' | 'sv'

export interface PrintableWorkoutItem {
  title: string
  details: string[]
  notes?: string | null
}

export interface PrintableWorkoutSection {
  title: string
  subtitle?: string | null
  notes?: string | null
  items: PrintableWorkoutItem[]
}

export interface PrintableWorkout {
  title: string
  kind: PrintableWorkoutKind
  kindLabel: string
  description?: string | null
  durationLabel?: string | null
  dateLabel?: string | null
  athleteName?: string | null
  teamName?: string | null
  organizationName?: string | null
  scheduleLabel?: string | null
  assignmentNotes?: string | null
  tags?: string[]
  sections: PrintableWorkoutSection[]
}

const KIND_LABELS: Record<AppLocale, Record<PrintableWorkoutKind, string>> = {
  en: {
    strength: 'Strength',
    cardio: 'Cardio',
    hybrid: 'Hybrid',
    agility: 'Agility',
  },
  sv: {
    strength: 'Styrka',
    cardio: 'Kondition',
    hybrid: 'Hybrid',
    agility: 'Agility',
  },
}

const SECTION_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    WARMUP: 'Warm-up',
    MAIN: 'Main session',
    CORE: 'Core',
    COOLDOWN: 'Cool-down',
    STRENGTH: 'Strength',
    METCON: 'Metcon',
  },
  sv: {
    WARMUP: 'Uppvärmning',
    MAIN: 'Huvudpass',
    CORE: 'Core',
    COOLDOWN: 'Nedvarvning',
    STRENGTH: 'Styrka',
    METCON: 'Metcon',
  },
}

const CARDIO_SEGMENT_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    WARMUP: 'Warm-up',
    COOLDOWN: 'Cool-down',
    INTERVAL: 'Interval',
    STEADY: 'Steady run',
    RECOVERY: 'Recovery',
    HILL: 'Hill',
    DRILLS: 'Running drills',
    CORE: 'Core',
    PREHAB: 'Stability / Prehab',
    PLYOMETRIC: 'Plyometrics',
    REST: 'Rest',
    REPEAT_GROUP: 'Repeat block',
  },
  sv: {
    WARMUP: 'Uppvärmning',
    COOLDOWN: 'Nedvarvning',
    INTERVAL: 'Intervall',
    STEADY: 'Distansträning',
    RECOVERY: 'Återhämtning',
    HILL: 'Backe',
    DRILLS: 'Löpskolning',
    CORE: 'Core',
    PREHAB: 'Stabilitet / Prehab',
    PLYOMETRIC: 'Plyometri',
    REST: 'Vila',
    REPEAT_GROUP: 'Repetitionsblock',
  },
}

function text(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function formatSeconds(seconds?: number, locale: AppLocale = 'en'): string | undefined {
  if (!seconds || seconds <= 0) return undefined
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes > 0 && remainder > 0) return `${minutes}:${String(remainder).padStart(2, '0')}`
  if (minutes > 0) return `${minutes} min`
  return `${seconds} ${text(locale, 'sec', 'sek')}`
}

function formatDuration(seconds?: number, minutes?: number, locale: AppLocale = 'en'): string | undefined {
  if (seconds && seconds > 0) return formatSeconds(seconds, locale)
  if (minutes && minutes > 0) return `${minutes} min`
  return undefined
}

function formatDistance(meters?: number): string | undefined {
  if (!meters || meters <= 0) return undefined
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function sectionTitle(type: string, locale: AppLocale): string {
  return SECTION_LABELS[locale][type] || type
}

function joinDetails(details: Array<string | undefined | null | false>): string[] {
  return details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
}

function normalizeStrengthExercise(exercise: Record<string, unknown>, locale: AppLocale): PrintableWorkoutItem {
  const setRows = asArray(exercise.setRows)
  const followUps = asArray(exercise.followUps)
  const weight = asNumber(exercise.weight)
  const weightUnit = asString(exercise.weightUnit) === 'percent' ? '%' : 'kg'
  const durationSeconds = asNumber(exercise.durationSeconds)
  const distanceMeters = asNumber(exercise.distanceMeters)
  const isCardio = asString(exercise.kind) === 'cardio'

  const details = isCardio
    ? joinDetails([
        formatDuration(durationSeconds, undefined, locale),
        formatDistance(distanceMeters),
        asString(exercise.intensity),
        asString(exercise.notes),
      ])
    : joinDetails([
        `${asNumber(exercise.sets) || 1} set`,
        exercise.reps != null ? `${String(exercise.reps)} reps` : undefined,
        weight != null ? `${weight} ${weightUnit}` : undefined,
        asNumber(exercise.restSeconds) ? `${text(locale, 'rest', 'vila')} ${exercise.restSeconds} ${text(locale, 'sec', 'sek')}` : undefined,
        asString(exercise.tempo) ? `tempo ${exercise.tempo}` : undefined,
      ])

  for (const [index, row] of setRows.entries()) {
    const rowWeight = asNumber(row.weight)
    details.push(`Set ${index + 1}: ${row.reps ?? '-'} reps${rowWeight != null ? `, ${rowWeight} ${weightUnit}` : ''}`)
  }

  for (const followUp of followUps) {
    details.push(`${text(locale, 'Follow-up exercise', 'Följdövning')}: ${asString(followUp.exerciseName) || asString(followUp.name) || text(locale, 'Exercise', 'Övning')} ${followUp.reps ?? ''}`.trim())
  }

  return {
    title: asString(exercise.exerciseName) || asString(exercise.name) || text(locale, 'Exercise', 'Övning'),
    details,
    notes: asString(exercise.notes),
  }
}

function normalizeStrengthSection(title: string, data: unknown, locale: AppLocale, fallbackExercises?: unknown): PrintableWorkoutSection | null {
  const sectionData = isRecord(data) ? data : {}
  const exercises = asArray(sectionData.exercises ?? fallbackExercises)
  if (exercises.length === 0) return null

  return {
    title,
    subtitle: formatDuration(undefined, asNumber(sectionData.duration), locale),
    notes: asString(sectionData.notes),
    items: exercises.map((exercise) => normalizeStrengthExercise(exercise, locale)),
  }
}

function normalizeCardioSegment(segment: Record<string, unknown>, index: number, locale: AppLocale): PrintableWorkoutItem {
  const segmentLabels = CARDIO_SEGMENT_LABELS[locale]
  if (segment.type === 'CORE' || segment.type === 'PREHAB' || segment.type === 'PLYOMETRIC') {
    const exercises = asArray(segment.exercises)
    return {
      title: `${index + 1}. ${segmentLabels[String(segment.type)]}`,
      details: joinDetails([
        formatDuration(asNumber(segment.duration), undefined, locale),
        ...exercises.map((exercise) => {
          const title = asString(exercise.name) || asString(exercise.exerciseName) || text(locale, 'Exercise', 'Övning')
          const sets = asNumber(exercise.sets)
          const reps = asString(exercise.reps)
          return [title, sets ? `${sets} set` : undefined, reps].filter(Boolean).join(' • ')
        }),
      ]),
      notes: asString(segment.notes),
    }
  }

  if (segment.type === 'REPEAT_GROUP') {
    const steps = asArray(segment.steps)
    const repeats = asNumber(segment.repeats) || 1
    return {
      title: `${segmentLabels.REPEAT_GROUP} x${repeats}`,
      details: [
        ...joinDetails([
          asNumber(segment.restBetweenRounds) ? `${text(locale, 'rest between rounds', 'vila mellan rundor')} ${formatSeconds(asNumber(segment.restBetweenRounds), locale)}` : undefined,
        ]),
        ...steps.map((step, stepIndex) => {
          const duration = formatDuration(asNumber(step.duration), undefined, locale)
          const distance = formatDistance(asNumber(step.distance))
          return `${stepIndex + 1}. ${segmentLabels[String(step.type)] || String(step.type || text(locale, 'Step', 'Steg'))}${duration ? `, ${duration}` : ''}${distance ? `, ${distance}` : ''}${step.zone ? `, ${text(locale, 'zone', 'zon')} ${step.zone}` : ''}`
        }),
      ],
      notes: asString(segment.notes),
    }
  }

  return {
    title: `${index + 1}. ${segmentLabels[String(segment.type)] || String(segment.type || 'Segment')}`,
    details: joinDetails([
      formatDuration(asNumber(segment.duration), undefined, locale),
      formatDistance(asNumber(segment.distance)),
      segment.zone ? `${text(locale, 'zone', 'zon')} ${segment.zone}` : undefined,
      asString(segment.pace) ? `${text(locale, 'pace', 'tempo')} ${segment.pace}` : undefined,
      asString(segment.heartRate) ? `${text(locale, 'heart rate', 'puls')} ${segment.heartRate}` : undefined,
      asNumber(segment.repeats) && asNumber(segment.repeats)! > 1 ? `${segment.repeats} ${text(locale, 'repetitions', 'repetitioner')}` : undefined,
      asNumber(segment.restDuration) ? `${text(locale, 'rest', 'vila')} ${formatSeconds(asNumber(segment.restDuration), locale)}` : undefined,
    ]),
    notes: asString(segment.notes),
  }
}

function normalizeHybridMovement(movement: Record<string, unknown>, locale: AppLocale): PrintableWorkoutItem {
  const exercise = isRecord(movement.exercise) ? movement.exercise : {}
  const title =
    asString(movement.exerciseName) ||
    (locale === 'sv'
      ? asString(exercise.nameSv) || asString(exercise.name) || asString(exercise.nameEn)
      : asString(exercise.nameEn) || asString(exercise.name) || asString(exercise.nameSv)) ||
    asString(movement.name) ||
    text(locale, 'Movement', 'Rörelse')
  return {
    title,
    details: joinDetails([
      movement.reps != null ? `${movement.reps} reps` : undefined,
      movement.calories != null ? `${movement.calories} cal` : undefined,
      formatDistance(asNumber(movement.distance)),
      formatDuration(asNumber(movement.duration), undefined, locale),
      asNumber(movement.weightMale) ? `${text(locale, 'men', 'herr')} ${movement.weightMale} kg` : undefined,
      asNumber(movement.weightFemale) ? `${text(locale, 'women', 'dam')} ${movement.weightFemale} kg` : undefined,
      asNumber(movement.percentOfMax) ? `${movement.percentOfMax}%` : undefined,
    ]),
    notes: asString(movement.notes),
  }
}

function formatHybridMovementSummary(movement: Record<string, unknown>, locale: AppLocale): string {
  const item = normalizeHybridMovement(movement, locale)
  return [item.title, item.details.join(', ')].filter(Boolean).join(' ')
}

function normalizeHybridSection(title: string, data: unknown, locale: AppLocale): PrintableWorkoutSection | null {
  if (!isRecord(data)) return null
  const blocks = asArray(data.blocks)
  if (blocks.length > 0) {
    return {
      title,
      notes: asString(data.notes),
      items: blocks.map((block) => ({
        title: asString(block.title) || asString(block.format) || 'Block',
        details: joinDetails([
          asString(block.format),
          asNumber(block.rounds) ? `${block.rounds} ${text(locale, 'rounds', 'rundor')}` : undefined,
          formatDuration(asNumber(block.intervalSeconds), undefined, locale),
          formatDuration(asNumber(block.workSeconds), undefined, locale) ? `${text(locale, 'work', 'arbete')} ${formatDuration(asNumber(block.workSeconds), undefined, locale)}` : undefined,
          formatDuration(asNumber(block.restSeconds), undefined, locale) ? `${text(locale, 'rest', 'vila')} ${formatDuration(asNumber(block.restSeconds), undefined, locale)}` : undefined,
          formatDuration(asNumber(block.restAfterSeconds), undefined, locale) ? `${text(locale, 'rest after', 'vila efter')} ${formatDuration(asNumber(block.restAfterSeconds), undefined, locale)}` : undefined,
          ...asArray(block.movements).map((movement) => formatHybridMovementSummary(movement, locale)),
        ]),
        notes: asString(block.notes),
      })),
    }
  }

  const movements = asArray(data.movements ?? data.exercises)
  if (movements.length === 0 && !asString(data.notes)) return null

  return {
    title,
    notes: asString(data.notes),
    items: movements.map((movement) => normalizeHybridMovement(movement, locale)),
  }
}

function normalizeAgilityDrill(item: Record<string, unknown>, locale: AppLocale): PrintableWorkoutItem {
  const drill = isRecord(item.drill) ? item.drill : {}
  return {
    title: (locale === 'sv'
      ? asString(drill.nameSv) || asString(drill.name) || asString(drill.nameEn)
      : asString(drill.nameEn) || asString(drill.name) || asString(drill.nameSv)) || 'Drill',
    details: joinDetails([
      asNumber(item.sets) ? `${item.sets} set` : undefined,
      asNumber(item.reps) ? `${item.reps} reps` : undefined,
      formatDuration(asNumber(item.duration), undefined, locale),
      asNumber(item.restSeconds) ? `${text(locale, 'rest', 'vila')} ${item.restSeconds} ${text(locale, 'sec', 'sek')}` : undefined,
      asString(drill.category),
      asNumber(drill.distanceMeters) ? `${drill.distanceMeters} m` : undefined,
    ]),
    notes: asString(item.notes) || (locale === 'sv' ? asString(drill.descriptionSv) || asString(drill.description) : asString(drill.description) || asString(drill.descriptionSv)),
  }
}

export function normalizePrintableWorkout(
  kind: PrintableWorkoutKind,
  workout: Record<string, unknown>,
  context?: { dateLabel?: string | null; athleteName?: string | null; locale?: AppLocale }
): PrintableWorkout {
  const locale = context?.locale === 'sv' ? 'sv' : 'en'

  if (kind === 'strength') {
    const sections = [
      normalizeStrengthSection(text(locale, 'Warm-up', 'Uppvärmning'), workout.warmupData, locale),
      normalizeStrengthSection(text(locale, 'Main session', 'Huvudpass'), {}, locale, workout.exercises),
      normalizeStrengthSection(text(locale, 'Stability / Prehab', 'Stabilitet / Prehab'), workout.prehabData, locale),
      normalizeStrengthSection('Core', workout.coreData, locale),
      normalizeStrengthSection(text(locale, 'Cool-down', 'Nedvarvning'), workout.cooldownData, locale),
    ].filter((section): section is PrintableWorkoutSection => !!section)

    return {
      title: asString(workout.name) || text(locale, 'Strength session', 'Styrkepass'),
      kind,
      kindLabel: KIND_LABELS[locale][kind],
      description: asString(workout.description),
      durationLabel: formatDuration(undefined, asNumber(workout.estimatedDuration), locale),
      dateLabel: context?.dateLabel,
      athleteName: context?.athleteName,
      tags: Array.isArray(workout.tags) ? workout.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      sections,
    }
  }

  if (kind === 'cardio') {
    return {
      title: asString(workout.name) || text(locale, 'Cardio session', 'Konditionspass'),
      kind,
      kindLabel: KIND_LABELS[locale][kind],
      description: asString(workout.description),
      durationLabel: formatDuration(asNumber(workout.totalDuration), undefined, locale),
      dateLabel: context?.dateLabel,
      athleteName: context?.athleteName,
      tags: Array.isArray(workout.tags) ? workout.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      sections: [{
        title: text(locale, 'Session structure', 'Passupplägg'),
        subtitle: joinDetails([
          asString(workout.sport),
          formatDistance(asNumber(workout.totalDistance)),
          asNumber(workout.avgZone) ? `${text(locale, 'avg zone', 'snittzon')} ${Number(workout.avgZone).toFixed(1)}` : undefined,
        ]).join(' · '),
        items: asArray(workout.segments).map((segment, index) => normalizeCardioSegment(segment, index, locale)),
      }],
    }
  }

  if (kind === 'hybrid') {
    const metconSection = normalizeHybridSection('Metcon', workout.metconData, locale) || {
      title: 'Metcon',
      items: asArray(workout.movements).map((movement) => normalizeHybridMovement(movement, locale)),
    }
    const sections = [
      normalizeHybridSection(text(locale, 'Warm-up', 'Uppvärmning'), workout.warmupData, locale),
      normalizeHybridSection(text(locale, 'Strength', 'Styrka'), workout.strengthData, locale),
      metconSection.items.length > 0 ? metconSection : null,
      normalizeHybridSection(text(locale, 'Cool-down', 'Nedvarvning'), workout.cooldownData, locale),
    ].filter((section): section is PrintableWorkoutSection => !!section)

    return {
      title: asString(workout.name) || text(locale, 'Hybrid session', 'Hybridpass'),
      kind,
      kindLabel: KIND_LABELS[locale][kind],
      description: asString(workout.description),
      durationLabel: formatDuration(asNumber(workout.timeCap), undefined, locale) || (asNumber(workout.totalMinutes) ? `${workout.totalMinutes} min` : undefined),
      dateLabel: context?.dateLabel,
      athleteName: context?.athleteName,
      tags: Array.isArray(workout.tags) ? workout.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      sections,
    }
  }

  const grouped = asArray(workout.drills).reduce<Record<string, Record<string, unknown>[]>>((acc, drill) => {
    const section = asString(drill.sectionType) || 'MAIN'
    acc[section] = acc[section] || []
    acc[section].push(drill)
    return acc
  }, {})

  return {
    title: asString(workout.name) || text(locale, 'Agility session', 'Agilitypass'),
    kind,
    kindLabel: KIND_LABELS[locale][kind],
    description: asString(workout.description),
    durationLabel: formatDuration(undefined, asNumber(workout.totalDuration), locale),
    dateLabel: context?.dateLabel,
    athleteName: context?.athleteName,
    tags: Array.isArray(workout.tags) ? workout.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    sections: Object.entries(grouped).map(([section, drills]) => ({
      title: sectionTitle(section, locale),
      items: drills.map((drill) => normalizeAgilityDrill(drill, locale)),
    })),
  }
}
