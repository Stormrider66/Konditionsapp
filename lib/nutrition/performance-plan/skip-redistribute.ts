/**
 * Skip & redistribute: when an athlete skips a planned meal, its macros move to
 * the remaining un-logged, non-skipped meals so the day's target is still
 * covered — without forcing any single meal to balloon (capped). Pure and
 * deterministic so it's cheap to unit-test and safe to run on read.
 */

export interface RedistributeMealInput {
  id: string
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  /** Athlete marked this meal as skipped. */
  skipped: boolean
  /** A meal has already been logged against this slot. */
  logged: boolean
}

export interface RedistributedMeal {
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  skipped: boolean
  /** This meal absorbed macros from one or more skipped meals. */
  redistributed: boolean
}

// A recipient meal can grow to at most this multiple of its original target, so
// skipping a big meal doesn't create an unrealistic single sitting. Any macros
// that don't fit under the cap are simply not redistributed.
const MAX_GROWTH_FACTOR = 1.75

function round(value: number): number {
  return Math.round(value)
}
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Returns adjusted per-meal targets keyed by meal id. Skipped meals keep their
 * original macros in the map (flagged `skipped` so the UI can show what was
 * skipped) but are excluded as recipients; remaining un-logged meals grow to
 * absorb the skipped macros, proportional to their size and capped.
 */
export function redistributeSkippedMeals(
  meals: RedistributeMealInput[]
): Map<string, RedistributedMeal> {
  const result = new Map<string, RedistributedMeal>()
  for (const meal of meals) {
    result.set(meal.id, {
      caloriesKcal: meal.caloriesKcal,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
      skipped: meal.skipped,
      redistributed: false,
    })
  }

  const skipped = meals.filter((m) => m.skipped)
  const recipients = meals.filter((m) => !m.skipped && !m.logged && m.caloriesKcal > 0)
  if (skipped.length === 0 || recipients.length === 0) return result

  const skippedTotal = skipped.reduce(
    (acc, m) => ({
      caloriesKcal: acc.caloriesKcal + m.caloriesKcal,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  const recipientKcalTotal = recipients.reduce((sum, m) => sum + m.caloriesKcal, 0)

  for (const recipient of recipients) {
    const share = recipient.caloriesKcal / recipientKcalTotal
    const intendedKcal = skippedTotal.caloriesKcal * share
    const capKcal = recipient.caloriesKcal * (MAX_GROWTH_FACTOR - 1)
    const appliedKcal = Math.min(intendedKcal, capKcal)
    // Scale the macro additions by how much of the intended kcal actually fit
    // under the cap, so macros stay consistent with the calories added.
    const fraction = intendedKcal > 0 ? appliedKcal / intendedKcal : 0

    const entry = result.get(recipient.id)!
    entry.caloriesKcal = round(recipient.caloriesKcal + appliedKcal)
    entry.proteinG = round1(recipient.proteinG + skippedTotal.proteinG * share * fraction)
    entry.carbsG = round1(recipient.carbsG + skippedTotal.carbsG * share * fraction)
    entry.fatG = round1(recipient.fatG + skippedTotal.fatG * share * fraction)
    entry.redistributed = appliedKcal > 0
  }

  return result
}
