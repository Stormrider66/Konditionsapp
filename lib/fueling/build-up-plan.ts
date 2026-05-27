export interface FuelingBuildUpSession {
  week: number
  targetCarbsGPerHour: number
  focusSv: string
  focusEn: string
  noteSv: string
  noteEn: string
}

export interface FuelingBuildUpPlan {
  startCarbsGPerHour: number
  raceTargetGPerHour: number
  sessions: FuelingBuildUpSession[]
}

export function buildFuelingBuildUpPlan({
  raceTargetGPerHour,
  currentGutToleranceGPerHour,
  weeksAvailable,
}: {
  raceTargetGPerHour: number | null | undefined
  currentGutToleranceGPerHour?: number | null
  weeksAvailable?: number | null
}): FuelingBuildUpPlan | null {
  if (!isPositiveNumber(raceTargetGPerHour)) return null

  const raceTarget = roundToFive(clamp(raceTargetGPerHour, 30, 120))
  const start = roundToFive(clamp(currentGutToleranceGPerHour ?? Math.min(50, raceTarget), 30, raceTarget))
  const weeks = clamp(Math.round(weeksAvailable ?? suggestedWeeks(start, raceTarget)), 3, 12)
  const sessions = Array.from({ length: weeks }, (_, index) => {
    const progress = weeks === 1 ? 1 : index / (weeks - 1)
    const target = roundToFive(start + (raceTarget - start) * progress)
    return buildSession(index + 1, target, raceTarget)
  })

  return {
    startCarbsGPerHour: start,
    raceTargetGPerHour: raceTarget,
    sessions,
  }
}

function buildSession(week: number, target: number, raceTarget: number): FuelingBuildUpSession {
  const isRaceLevel = target >= raceTarget - 5
  const needsMultiCarb = target > 60

  if (week === 1) {
    return {
      week,
      targetCarbsGPerHour: target,
      focusSv: 'Sätt basnivå',
      focusEn: 'Set baseline',
      noteSv: 'Logga mage, energi och vilka produkter som användes direkt efter långpasset.',
      noteEn: 'Log gut feel, energy, and products used right after the long session.',
    }
  }

  if (isRaceLevel) {
    return {
      week,
      targetCarbsGPerHour: target,
      focusSv: 'Race-repetition',
      focusEn: 'Race rehearsal',
      noteSv: 'Repetera tävlingsprodukter, timing och vätska så nära raceupplägget som möjligt.',
      noteEn: 'Repeat race products, timing, and fluid as close to the race setup as possible.',
    }
  }

  return {
    week,
    targetCarbsGPerHour: target,
    focusSv: needsMultiCarb ? 'Bygg upptag' : 'Höj försiktigt',
    focusEn: needsMultiCarb ? 'Build absorption' : 'Increase carefully',
    noteSv: needsMultiCarb
      ? 'Använd glukos/fruktos-blandning och sprid intaget jämnt över passet.'
      : 'Höj bara om magen var stabil på förra nivån.',
    noteEn: needsMultiCarb
      ? 'Use a glucose/fructose mix and spread intake evenly across the session.'
      : 'Only increase if gut feel was stable at the previous level.',
  }
}

function suggestedWeeks(start: number, raceTarget: number): number {
  const gap = Math.max(0, raceTarget - start)
  if (gap <= 10) return 3
  if (gap <= 25) return 5
  return 7
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5
}
