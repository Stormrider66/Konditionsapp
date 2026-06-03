export interface MacroGramValues {
  carbsGrams: number
  proteinGrams: number
  fatGrams: number
}

export interface MacroDistributionPercentages {
  carbsPercent: number
  proteinPercent: number
  fatPercent: number
}

function safeGramValue(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function calculateMacroDistributionPercentages({
  carbsGrams,
  proteinGrams,
  fatGrams,
}: MacroGramValues): MacroDistributionPercentages {
  const macroCalories = [
    { key: 'carbsPercent' as const, calories: safeGramValue(carbsGrams) * 4 },
    { key: 'proteinPercent' as const, calories: safeGramValue(proteinGrams) * 4 },
    { key: 'fatPercent' as const, calories: safeGramValue(fatGrams) * 9 },
  ]
  const totalCalories = macroCalories.reduce((sum, macro) => sum + macro.calories, 0)

  if (totalCalories <= 0) {
    return { carbsPercent: 0, proteinPercent: 0, fatPercent: 0 }
  }

  const rounded = macroCalories.map((macro, index) => {
    const exactPercent = (macro.calories / totalCalories) * 100
    const floor = Math.floor(exactPercent)

    return {
      ...macro,
      index,
      floor,
      fraction: exactPercent - floor,
    }
  })

  let remaining = 100 - rounded.reduce((sum, macro) => sum + macro.floor, 0)
  const byLargestRemainder = [...rounded].sort((a, b) => b.fraction - a.fraction || a.index - b.index)

  for (const macro of byLargestRemainder) {
    if (remaining <= 0) break
    macro.floor += 1
    remaining -= 1
  }

  return rounded.reduce<MacroDistributionPercentages>(
    (result, macro) => ({
      ...result,
      [macro.key]: macro.floor,
    }),
    { carbsPercent: 0, proteinPercent: 0, fatPercent: 0 }
  )
}
