import {
  buildNutritionContext,
  calculateHydration,
  calculateMacros,
  generateNutritionPlan,
} from '@/lib/ai/nutrition-calculator'

describe('nutrition-calculator macro guardrails', () => {
  it('keeps endurance-plan protein reasonable for a 57 kg regular athlete', () => {
    const plan = generateNutritionPlan(
      {
        weightKg: 57,
        heightCm: 165,
        ageYears: 30,
        gender: 'FEMALE',
        activityLevel: 'ACTIVE',
      },
      'MAINTAIN',
      'ENDURANCE'
    )

    expect(plan.macros.protein.grams).toBeLessThanOrEqual(110)
    expect(plan.macros.protein.grams).toBeLessThan(174)
    expect(plan.macros.carbs.grams).toBeLessThan(422)
  })

  it('caps custom macro percentages that request excessive protein', () => {
    const macros = calculateMacros({
      tdee: 2400,
      goal: 'MAINTAIN',
      profile: 'CUSTOM',
      weightKg: 57,
      activityLevel: 'ACTIVE',
      customProteinPercent: 70,
      customCarbsPercent: 20,
      customFatPercent: 10,
    })

    expect(macros.protein.grams / 57).toBeLessThanOrEqual(2.2)
  })

  it('localizes hydration recommendations', () => {
    expect(calculateHydration(70, 'ACTIVE', 'MODERATE', 'en').recommendation).toContain('Aim for')
    expect(calculateHydration(70, 'ACTIVE', 'MODERATE', 'sv').recommendation).toContain('Sikta på')
  })

  it('uses English macro labels in English nutrition context', () => {
    const context = buildNutritionContext(
      {
        weightKg: 70,
        heightCm: 178,
        ageYears: 35,
        gender: 'MALE',
        activityLevel: 'ACTIVE',
      },
      undefined,
      'MAINTAIN',
      'RUNNING',
      'en'
    )

    expect(context).toContain('**Fat**')
    expect(context).not.toContain('**Fett**')
  })
})
