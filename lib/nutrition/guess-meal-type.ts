import { MealType } from '@prisma/client'

export function guessDefaultMealType(): MealType {
  const hour = new Date().getHours()
  if (hour < 10) return 'BREAKFAST'
  if (hour < 12) return 'MORNING_SNACK'
  if (hour < 14) return 'LUNCH'
  if (hour < 16) return 'AFTERNOON_SNACK'
  if (hour < 19) return 'DINNER'
  return 'EVENING_SNACK'
}
