export interface RaceDayFuelingPlan {
  carbsPerHour: number
  durationMinutes: number | null
  totalCarbs: number | null
  intakeEvery20Min: number
  gelEquivalentCount: number | null
  bottleMixCount: number | null
  timing: Array<{
    minute: number
    carbs: number
    label: string
  }>
  notes: string[]
  /** @deprecated Use notes. Kept for existing API consumers during the transition. */
  notesSv: string[]
}

const GEL_CARBS_G = 25
const BOTTLE_MIX_CARBS_G = 40

export function buildRaceDayFuelingPlan(
  carbsPerHour: number | null | undefined,
  durationMinutes: number | null | undefined,
  locale: string = 'en'
): RaceDayFuelingPlan | null {
  if (carbsPerHour == null || carbsPerHour <= 0) return null

  const roundedCarbsPerHour = roundToFive(carbsPerHour)
  const normalizedDuration = durationMinutes != null && durationMinutes > 0 ? Math.round(durationMinutes) : null
  const totalCarbs = normalizedDuration ? Math.round(roundedCarbsPerHour * (normalizedDuration / 60)) : null
  const intakeEvery20Min = Math.round(roundedCarbsPerHour / 3)

  const notes = buildNotes(roundedCarbsPerHour, normalizedDuration, locale)

  return {
    carbsPerHour: roundedCarbsPerHour,
    durationMinutes: normalizedDuration,
    totalCarbs,
    intakeEvery20Min,
    gelEquivalentCount: totalCarbs ? Math.ceil(totalCarbs / GEL_CARBS_G) : null,
    bottleMixCount: totalCarbs ? Math.ceil(totalCarbs / BOTTLE_MIX_CARBS_G) : null,
    timing: buildTiming(normalizedDuration, intakeEvery20Min),
    notes,
    notesSv: notes,
  }
}

function buildTiming(durationMinutes: number | null, intakeEvery20Min: number): RaceDayFuelingPlan['timing'] {
  if (!durationMinutes) return []

  const points: RaceDayFuelingPlan['timing'] = []
  for (let minute = 20; minute < durationMinutes; minute += 20) {
    points.push({
      minute,
      carbs: intakeEvery20Min,
      label: `${minute} min`,
    })
  }

  return points.slice(0, 12)
}

function buildNotes(carbsPerHour: number, durationMinutes: number | null, locale: string): string[] {
  if (locale.startsWith('sv')) {
    const notes = [
      'Testa alltid planen på långpass innan tävling.',
      'Drick efter törst och väder, men undvik att skölja ned stora kolhydratdoser utan vätska.',
    ]

    if (carbsPerHour > 60) {
      notes.push('Vid över 60 g/timme bör produkterna innehålla flera kolhydrattyper, till exempel glukos/fruktos.')
    }

    if (durationMinutes != null && durationMinutes >= 180) {
      notes.push('För lopp över tre timmar: planera även salt/vätska separat utifrån värme och svettförlust.')
    }

    return notes
  }

  const notes = [
    'Always test the plan during long sessions before race day.',
    'Drink according to thirst and weather, but avoid taking large carbohydrate doses without fluid.',
  ]

  if (carbsPerHour > 60) {
    notes.push('Above 60 g/hour, products should include multiple carbohydrate types, such as glucose/fructose.')
  }

  if (durationMinutes != null && durationMinutes >= 180) {
    notes.push('For races over three hours, also plan sodium/fluid separately based on heat and sweat loss.')
  }

  return notes
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5
}
