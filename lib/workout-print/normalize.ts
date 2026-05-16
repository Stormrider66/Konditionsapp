export type PrintableWorkoutKind = 'strength' | 'cardio' | 'hybrid' | 'agility'

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

const KIND_LABELS: Record<PrintableWorkoutKind, string> = {
  strength: 'Styrka',
  cardio: 'Kondition',
  hybrid: 'Hybrid',
  agility: 'Agility',
}

const SECTION_LABELS: Record<string, string> = {
  WARMUP: 'Uppvärmning',
  MAIN: 'Huvudpass',
  CORE: 'Core',
  COOLDOWN: 'Nedvarvning',
  STRENGTH: 'Styrka',
  METCON: 'Metcon',
}

const CARDIO_SEGMENT_LABELS: Record<string, string> = {
  WARMUP: 'Uppvärmning',
  COOLDOWN: 'Nedvarvning',
  INTERVAL: 'Intervall',
  STEADY: 'Distansträning',
  RECOVERY: 'Återhämtning',
  HILL: 'Backe',
  DRILLS: 'Löpskolning',
  REST: 'Vila',
  REPEAT_GROUP: 'Repetitionsblock',
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

function formatSeconds(seconds?: number): string | undefined {
  if (!seconds || seconds <= 0) return undefined
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes > 0 && remainder > 0) return `${minutes}:${String(remainder).padStart(2, '0')}`
  if (minutes > 0) return `${minutes} min`
  return `${seconds} sek`
}

function formatDuration(seconds?: number, minutes?: number): string | undefined {
  if (seconds && seconds > 0) return formatSeconds(seconds)
  if (minutes && minutes > 0) return `${minutes} min`
  return undefined
}

function formatDistance(meters?: number): string | undefined {
  if (!meters || meters <= 0) return undefined
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function sectionTitle(type: string): string {
  return SECTION_LABELS[type] || type
}

function joinDetails(details: Array<string | undefined | null | false>): string[] {
  return details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
}

function normalizeStrengthExercise(exercise: Record<string, unknown>): PrintableWorkoutItem {
  const setRows = asArray(exercise.setRows)
  const followUps = asArray(exercise.followUps)
  const weight = asNumber(exercise.weight)
  const weightUnit = asString(exercise.weightUnit) === 'percent' ? '%' : 'kg'
  const durationSeconds = asNumber(exercise.durationSeconds)
  const distanceMeters = asNumber(exercise.distanceMeters)
  const isCardio = asString(exercise.kind) === 'cardio'

  const details = isCardio
    ? joinDetails([
        formatDuration(durationSeconds),
        formatDistance(distanceMeters),
        asString(exercise.intensity),
        asString(exercise.notes),
      ])
    : joinDetails([
        `${asNumber(exercise.sets) || 1} set`,
        exercise.reps != null ? `${String(exercise.reps)} reps` : undefined,
        weight != null ? `${weight} ${weightUnit}` : undefined,
        asNumber(exercise.restSeconds) ? `vila ${exercise.restSeconds} sek` : undefined,
        asString(exercise.tempo) ? `tempo ${exercise.tempo}` : undefined,
      ])

  for (const [index, row] of setRows.entries()) {
    const rowWeight = asNumber(row.weight)
    details.push(`Set ${index + 1}: ${row.reps ?? '-'} reps${rowWeight != null ? `, ${rowWeight} ${weightUnit}` : ''}`)
  }

  for (const followUp of followUps) {
    details.push(`Följdövning: ${asString(followUp.exerciseName) || asString(followUp.name) || 'Övning'} ${followUp.reps ?? ''}`.trim())
  }

  return {
    title: asString(exercise.exerciseName) || asString(exercise.name) || 'Övning',
    details,
    notes: asString(exercise.notes),
  }
}

function normalizeStrengthSection(title: string, data: unknown, fallbackExercises?: unknown): PrintableWorkoutSection | null {
  const sectionData = isRecord(data) ? data : {}
  const exercises = asArray(sectionData.exercises ?? fallbackExercises)
  if (exercises.length === 0) return null

  return {
    title,
    subtitle: formatDuration(undefined, asNumber(sectionData.duration)),
    notes: asString(sectionData.notes),
    items: exercises.map(normalizeStrengthExercise),
  }
}

function normalizeCardioSegment(segment: Record<string, unknown>, index: number): PrintableWorkoutItem {
  if (segment.type === 'REPEAT_GROUP') {
    const steps = asArray(segment.steps)
    const repeats = asNumber(segment.repeats) || 1
    return {
      title: `${CARDIO_SEGMENT_LABELS.REPEAT_GROUP} x${repeats}`,
      details: [
        ...joinDetails([
          asNumber(segment.restBetweenRounds) ? `vila mellan rundor ${formatSeconds(asNumber(segment.restBetweenRounds))}` : undefined,
        ]),
        ...steps.map((step, stepIndex) => {
          const duration = formatDuration(asNumber(step.duration))
          const distance = formatDistance(asNumber(step.distance))
          return `${stepIndex + 1}. ${CARDIO_SEGMENT_LABELS[String(step.type)] || String(step.type || 'Steg')}${duration ? `, ${duration}` : ''}${distance ? `, ${distance}` : ''}${step.zone ? `, zon ${step.zone}` : ''}`
        }),
      ],
      notes: asString(segment.notes),
    }
  }

  return {
    title: `${index + 1}. ${CARDIO_SEGMENT_LABELS[String(segment.type)] || String(segment.type || 'Segment')}`,
    details: joinDetails([
      formatDuration(asNumber(segment.duration)),
      formatDistance(asNumber(segment.distance)),
      segment.zone ? `zon ${segment.zone}` : undefined,
      asString(segment.pace) ? `tempo ${segment.pace}` : undefined,
      asString(segment.heartRate) ? `puls ${segment.heartRate}` : undefined,
      asNumber(segment.repeats) && asNumber(segment.repeats)! > 1 ? `${segment.repeats} repetitioner` : undefined,
      asNumber(segment.restDuration) ? `vila ${formatSeconds(asNumber(segment.restDuration))}` : undefined,
    ]),
    notes: asString(segment.notes),
  }
}

function normalizeHybridMovement(movement: Record<string, unknown>): PrintableWorkoutItem {
  const exercise = isRecord(movement.exercise) ? movement.exercise : {}
  const title =
    asString(movement.exerciseName) ||
    asString(exercise.nameSv) ||
    asString(exercise.name) ||
    asString(movement.name) ||
    'Rörelse'
  return {
    title,
    details: joinDetails([
      movement.reps != null ? `${movement.reps} reps` : undefined,
      movement.calories != null ? `${movement.calories} cal` : undefined,
      formatDistance(asNumber(movement.distance)),
      formatDuration(asNumber(movement.duration)),
      asNumber(movement.weightMale) ? `herr ${movement.weightMale} kg` : undefined,
      asNumber(movement.weightFemale) ? `dam ${movement.weightFemale} kg` : undefined,
      asNumber(movement.percentOfMax) ? `${movement.percentOfMax}%` : undefined,
    ]),
    notes: asString(movement.notes),
  }
}

function formatHybridMovementSummary(movement: Record<string, unknown>): string {
  const item = normalizeHybridMovement(movement)
  return [item.title, item.details.join(', ')].filter(Boolean).join(' ')
}

function normalizeHybridSection(title: string, data: unknown): PrintableWorkoutSection | null {
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
          asNumber(block.rounds) ? `${block.rounds} rundor` : undefined,
          formatDuration(asNumber(block.intervalSeconds)),
          formatDuration(asNumber(block.workSeconds)) ? `arbete ${formatDuration(asNumber(block.workSeconds))}` : undefined,
          formatDuration(asNumber(block.restSeconds)) ? `vila ${formatDuration(asNumber(block.restSeconds))}` : undefined,
          formatDuration(asNumber(block.restAfterSeconds)) ? `vila efter ${formatDuration(asNumber(block.restAfterSeconds))}` : undefined,
          ...asArray(block.movements).map(formatHybridMovementSummary),
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
    items: movements.map(normalizeHybridMovement),
  }
}

function normalizeAgilityDrill(item: Record<string, unknown>): PrintableWorkoutItem {
  const drill = isRecord(item.drill) ? item.drill : {}
  return {
    title: asString(drill.nameSv) || asString(drill.name) || 'Drill',
    details: joinDetails([
      asNumber(item.sets) ? `${item.sets} set` : undefined,
      asNumber(item.reps) ? `${item.reps} reps` : undefined,
      formatDuration(asNumber(item.duration)),
      asNumber(item.restSeconds) ? `vila ${item.restSeconds} sek` : undefined,
      asString(drill.category),
      asNumber(drill.distanceMeters) ? `${drill.distanceMeters} m` : undefined,
    ]),
    notes: asString(item.notes) || asString(drill.descriptionSv) || asString(drill.description),
  }
}

export function normalizePrintableWorkout(
  kind: PrintableWorkoutKind,
  workout: Record<string, unknown>,
  context?: { dateLabel?: string | null; athleteName?: string | null }
): PrintableWorkout {
  if (kind === 'strength') {
    const sections = [
      normalizeStrengthSection('Uppvärmning', workout.warmupData),
      normalizeStrengthSection('Huvudpass', {}, workout.exercises),
      normalizeStrengthSection('Stabilitet / Prehab', workout.prehabData),
      normalizeStrengthSection('Core', workout.coreData),
      normalizeStrengthSection('Nedvarvning', workout.cooldownData),
    ].filter((section): section is PrintableWorkoutSection => !!section)

    return {
      title: asString(workout.name) || 'Styrkepass',
      kind,
      kindLabel: KIND_LABELS[kind],
      description: asString(workout.description),
      durationLabel: formatDuration(undefined, asNumber(workout.estimatedDuration)),
      dateLabel: context?.dateLabel,
      athleteName: context?.athleteName,
      tags: Array.isArray(workout.tags) ? workout.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      sections,
    }
  }

  if (kind === 'cardio') {
    return {
      title: asString(workout.name) || 'Konditionspass',
      kind,
      kindLabel: KIND_LABELS[kind],
      description: asString(workout.description),
      durationLabel: formatDuration(asNumber(workout.totalDuration)),
      dateLabel: context?.dateLabel,
      athleteName: context?.athleteName,
      tags: Array.isArray(workout.tags) ? workout.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      sections: [{
        title: 'Passupplägg',
        subtitle: joinDetails([
          asString(workout.sport),
          formatDistance(asNumber(workout.totalDistance)),
          asNumber(workout.avgZone) ? `snittzon ${Number(workout.avgZone).toFixed(1)}` : undefined,
        ]).join(' · '),
        items: asArray(workout.segments).map(normalizeCardioSegment),
      }],
    }
  }

  if (kind === 'hybrid') {
    const metconSection = normalizeHybridSection('Metcon', workout.metconData) || {
      title: 'Metcon',
      items: asArray(workout.movements).map(normalizeHybridMovement),
    }
    const sections = [
      normalizeHybridSection('Uppvärmning', workout.warmupData),
      normalizeHybridSection('Styrka', workout.strengthData),
      metconSection.items.length > 0 ? metconSection : null,
      normalizeHybridSection('Nedvarvning', workout.cooldownData),
    ].filter((section): section is PrintableWorkoutSection => !!section)

    return {
      title: asString(workout.name) || 'Hybridpass',
      kind,
      kindLabel: KIND_LABELS[kind],
      description: asString(workout.description),
      durationLabel: formatDuration(asNumber(workout.timeCap)) || (asNumber(workout.totalMinutes) ? `${workout.totalMinutes} min` : undefined),
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
    title: asString(workout.name) || 'Agilitypass',
    kind,
    kindLabel: KIND_LABELS[kind],
    description: asString(workout.description),
    durationLabel: formatDuration(undefined, asNumber(workout.totalDuration)),
    dateLabel: context?.dateLabel,
    athleteName: context?.athleteName,
    tags: Array.isArray(workout.tags) ? workout.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    sections: Object.entries(grouped).map(([section, drills]) => ({
      title: sectionTitle(section),
      items: drills.map(normalizeAgilityDrill),
    })),
  }
}
