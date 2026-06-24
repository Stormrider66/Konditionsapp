/**
 * Pure portion solver — no I/O, no AI, no server-only. Given foods (per-100 g
 * macros) and a meal's macro target, compute how many grams of each to eat to
 * best hit the target, prioritising calories. Kept dependency-free so it is
 * cheap to unit-test.
 */

export interface MacroVector {
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface PortionFitFood {
  name: string
  grams: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  /** Where the per-100 g values came from. */
  source: 'DATABASE' | 'ESTIMATE'
  foodId?: string
}

export interface PortionFitResult {
  foods: PortionFitFood[]
  totals: MacroVector
  target: MacroVector
}

export interface SolverFood {
  name: string
  per100g: MacroVector
  source: 'DATABASE' | 'ESTIMATE'
  foodId?: string
}

const MAX_GRAMS = 2000

// Calories are the primary constraint (the athlete asks "how much to cover the
// calorie need"). Errors are normalised by target, so calories must be weighted
// far higher than the macros — otherwise a small-target macro (e.g. ~8 g fat)
// dominates the objective and the calorie goal is missed. With this weighting
// calories are effectively hit while macros only decide the split between foods.
const METRIC_WEIGHTS: Record<keyof MacroVector, number> = {
  caloriesKcal: 80,
  proteinG: 0.5,
  carbsG: 0.4,
  fatG: 0.3,
}

const METRIC_KEYS: (keyof MacroVector)[] = ['caloriesKcal', 'proteinG', 'carbsG', 'fatG']

function round(value: number, decimals = 0): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/**
 * Non-negative bounded coordinate descent on a convex weighted-least-squares
 * objective. Converges reliably for the handful of foods a meal involves and
 * needs no learning-rate tuning.
 */
export function solvePortions(foods: SolverFood[], target: MacroVector): PortionFitResult {
  const n = foods.length
  // a[i][m] = per-gram value of metric m for food i.
  const a = foods.map((food) => METRIC_KEYS.map((m) => (food.per100g[m] || 0) / 100))
  // Scale each metric by its target so relative errors are comparable.
  const scale = METRIC_KEYS.map((m) => Math.max(target[m] || 0, m === 'caloriesKcal' ? 50 : 5))
  const weight = METRIC_KEYS.map((m) => METRIC_WEIGHTS[m])

  // Initialise each food at an equal share of the calorie target.
  const grams = foods.map((food) => {
    const perGramKcal = (food.per100g.caloriesKcal || 0) / 100
    if (perGramKcal <= 0) return 0
    return Math.min(MAX_GRAMS, target.caloriesKcal / n / perGramKcal)
  })

  for (let sweep = 0; sweep < 120; sweep++) {
    for (let i = 0; i < n; i++) {
      let numerator = 0
      let denominator = 0
      for (let mIdx = 0; mIdx < METRIC_KEYS.length; mIdx++) {
        let restPred = 0
        for (let j = 0; j < n; j++) {
          if (j === i) continue
          restPred += grams[j] * a[j][mIdx]
        }
        const wOverScaleSq = weight[mIdx] / (scale[mIdx] * scale[mIdx])
        const aim = a[i][mIdx]
        numerator += wOverScaleSq * aim * (restPred - target[METRIC_KEYS[mIdx]])
        denominator += wOverScaleSq * aim * aim
      }
      const next = denominator > 0 ? -numerator / denominator : 0
      grams[i] = Math.max(0, Math.min(MAX_GRAMS, next))
    }
  }

  const resultFoods: PortionFitFood[] = foods.map((food, i) => {
    const g = round(grams[i])
    return {
      name: food.name,
      grams: g,
      caloriesKcal: round(((food.per100g.caloriesKcal || 0) * g) / 100),
      proteinG: round(((food.per100g.proteinG || 0) * g) / 100, 1),
      carbsG: round(((food.per100g.carbsG || 0) * g) / 100, 1),
      fatG: round(((food.per100g.fatG || 0) * g) / 100, 1),
      source: food.source,
      foodId: food.foodId,
    }
  })

  const totals: MacroVector = {
    caloriesKcal: round(resultFoods.reduce((s, f) => s + f.caloriesKcal, 0)),
    proteinG: round(resultFoods.reduce((s, f) => s + f.proteinG, 0), 1),
    carbsG: round(resultFoods.reduce((s, f) => s + f.carbsG, 0), 1),
    fatG: round(resultFoods.reduce((s, f) => s + f.fatG, 0), 1),
  }

  return { foods: resultFoods, totals, target }
}
