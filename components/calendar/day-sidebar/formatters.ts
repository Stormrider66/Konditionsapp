// Formatters extracted from DaySidebar.tsx (Phase 7k)

export function formatDistanceValue(distance: unknown): { label: string | null } {
  if (typeof distance === 'number' && Number.isFinite(distance) && distance > 0) {
    return { label: `${distance % 1 === 0 ? distance.toFixed(0) : distance.toFixed(1)} km` }
  }
  if (typeof distance === 'string' && distance.trim()) {
    const normalized = distance.trim()
    return { label: normalized.includes('km') ? normalized : `${normalized} km` }
  }
  return { label: null }
}

export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '-'
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} s`
  }
  return `${minutes} min`
}

export function formatWorkoutTypeLabel(type?: string | null): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    STRENGTH: 'Styrka',
    PLYOMETRIC: 'Plyometri',
    CORE: 'Core',
    RECOVERY: 'Återhämtning',
    CYCLING: 'Cykling',
    SKIING: 'Skidor',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'Hyrox',
    ALTERNATIVE: 'Alternativt',
    OTHER: 'Övrigt',
  }
  return labels[type || ''] || type || 'Pass'
}

export function formatIntensityLabel(intensity?: string | null): string {
  const labels: Record<string, string> = {
    RECOVERY: 'Återhämtning',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return labels[intensity || ''] || intensity || 'Pass'
}

export function formatFeelingLabel(feeling?: string | null): string {
  const labels: Record<string, string> = {
    Great: 'Fantastiskt',
    Good: 'Bra',
    Okay: 'Okej',
    Tired: 'Trött',
    Struggled: 'Kämpigt',
  }
  return labels[feeling || ''] || feeling || '-'
}

export function formatAdHocInputType(inputType?: string | null): string {
  const labels: Record<string, string> = {
    PHOTO: 'Foto',
    AUDIO: 'Ljud',
    TEXT: 'Text',
    MANUAL_FORM: 'Manuell',
    GARMIN: 'Garmin',
    STRAVA: 'Strava',
    TEMPLATE: 'Mall',
  }
  return labels[inputType || ''] || 'Ad-hoc'
}

export function formatAdHocTypeLabel(parsedType?: string | null): string {
  return formatWorkoutTypeLabel(parsedType || 'OTHER')
}

export function formatRaceDistanceLabel(distance?: string | null): string {
  const labels: Record<string, string> = {
    '5K': '5 km-resultat',
    '10K': '10 km-resultat',
    HALF_MARATHON: 'Halvmaraton-resultat',
    MARATHON: 'Maraton-resultat',
    CUSTOM: 'Tävlingsresultat',
  }
  return labels[distance || ''] || 'Tävlingsresultat'
}

export function getAdHocPreviewItems(parsed: Record<string, unknown>): string[] {
  const items: string[] = []

  const strengthExercises = Array.isArray(parsed.strengthExercises) ? parsed.strengthExercises : []
  for (const exercise of strengthExercises.slice(0, 3)) {
    if (exercise && typeof exercise === 'object') {
      const nameSv = typeof (exercise as { nameSv?: unknown }).nameSv === 'string'
        ? (exercise as { nameSv?: string }).nameSv
        : null
      const name = typeof (exercise as { name?: unknown }).name === 'string'
        ? (exercise as { name?: string }).name
        : null
      if (nameSv || name) {
        items.push(nameSv || name || '')
      }
    }
  }

  const cardioSegments = Array.isArray(parsed.cardioSegments) ? parsed.cardioSegments : []
  for (const segment of cardioSegments.slice(0, 3 - items.length)) {
    if (segment && typeof segment === 'object') {
      const segmentType = typeof (segment as { type?: unknown }).type === 'string'
        ? (segment as { type?: string }).type
        : null
      const duration = typeof (segment as { duration?: unknown }).duration === 'number'
        ? (segment as { duration?: number }).duration
        : null
      if (segmentType) {
        items.push(`${formatCardioSegmentLabel(segmentType)}${duration ? ` ${duration} min` : ''}`)
      }
    }
  }

  const hybridMovements = Array.isArray(parsed.hybridMovements) ? parsed.hybridMovements : []
  for (const movement of hybridMovements.slice(0, 3 - items.length)) {
    if (movement && typeof movement === 'object') {
      const name = typeof (movement as { movementName?: unknown }).movementName === 'string'
        ? (movement as { movementName?: string }).movementName
        : null
      if (name) {
        items.push(name)
      }
    }
  }

  return items.slice(0, 3)
}

export function formatCardioSegmentLabel(type: string): string {
  const labels: Record<string, string> = {
    WARMUP: 'Uppvärmning',
    WORK: 'Arbete',
    INTERVAL: 'Intervall',
    RECOVERY: 'Återhämtning',
    COOLDOWN: 'Nedjogg',
    REST: 'Vila',
  }
  return labels[type] || type
}

export function formatConfidenceLabel(confidence?: string | null): string | null {
  if (!confidence) return null
  const labels: Record<string, string> = {
    VERY_HIGH: 'Mycket hög säkerhet',
    HIGH: 'Hög säkerhet',
    MEDIUM: 'Medelhög säkerhet',
    LOW: 'Låg säkerhet',
  }
  return labels[confidence] || confidence
}

export function formatFieldTestType(type?: string): string {
  const labels: Record<string, string> = {
    THIRTY_MIN_TT: '30 min TT',
    TWENTY_MIN_TT: '20 min TT',
    HR_DRIFT: 'HR-drift',
    CRITICAL_VELOCITY: 'Critical Velocity',
    RACE_BASED: 'Tävlingsbaserat',
  }
  return labels[type || ''] || type || 'Fälttest'
}

export function formatPaceSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}/km`
}

export function normalizeMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return []
}

export function getFieldTestMetrics(results: Record<string, unknown> | null): string[] {
  if (!results) return []
  const metrics: string[] = []

  if (typeof results.thresholdPace === 'number') {
    metrics.push(`Tröskeltempo ${formatPaceSeconds(results.thresholdPace)}`)
  }
  if (typeof results.thresholdHR === 'number') {
    metrics.push(`Tröskelpuls ${Math.round(results.thresholdHR)} bpm`)
  }
  if (typeof results.driftPercent === 'number') {
    metrics.push(`Drift ${results.driftPercent.toFixed(1)}%`)
  }
  if (typeof results.criticalVelocity === 'number') {
    metrics.push(`CV ${results.criticalVelocity.toFixed(2)} m/s`)
  }
  if (typeof results.vdot === 'number') {
    metrics.push(`VDOT ${results.vdot.toFixed(1)}`)
  }

  return metrics.slice(0, 4)
}
