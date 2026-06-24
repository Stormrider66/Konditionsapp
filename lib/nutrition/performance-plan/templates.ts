import type { MealType } from '@prisma/client'
import type { DailyMacroTargets } from '@/lib/nutrition-timing'
import type {
  MealPortionSummary,
  PerformanceMealTimingRole,
  PerformancePlanDayType,
  PlannedMealDraft,
  PlannedMealOptionDraft,
  ScheduleSignal,
} from './types'

type MealSlot = {
  mealType: MealType
  time: string
  title: string
  timingRole: PerformanceMealTimingRole
  kcalShare: number
  proteinShare: number
  carbsShare: number
  fatShare: number
  explanation: string
}

const DEFAULT_SLOTS: MealSlot[] = [
  { mealType: 'BREAKFAST', time: '08:00', title: 'Performance breakfast', timingRole: 'REGULAR', kcalShare: 0.22, proteinShare: 0.22, carbsShare: 0.23, fatShare: 0.22, explanation: 'Start the day with protein and enough carbohydrates to protect training quality.' },
  { mealType: 'MORNING_SNACK', time: '10:30', title: 'Morning protein snack', timingRole: 'REGULAR', kcalShare: 0.1, proteinShare: 0.12, carbsShare: 0.1, fatShare: 0.08, explanation: 'A small snack keeps protein distribution even without making lunch too heavy.' },
  { mealType: 'LUNCH', time: '12:30', title: 'Balanced lunch', timingRole: 'REGULAR', kcalShare: 0.24, proteinShare: 0.25, carbsShare: 0.24, fatShare: 0.24, explanation: 'Main daytime meal with lean protein, starch, and vegetables.' },
  { mealType: 'AFTERNOON_SNACK', time: '15:30', title: 'Training snack', timingRole: 'PRE_WORKOUT', kcalShare: 0.12, proteinShare: 0.08, carbsShare: 0.16, fatShare: 0.04, explanation: 'Easy carbohydrates before training without much fat or fiber.' },
  { mealType: 'DINNER', time: '19:00', title: 'Recovery dinner', timingRole: 'POST_WORKOUT', kcalShare: 0.24, proteinShare: 0.25, carbsShare: 0.22, fatShare: 0.3, explanation: 'Dinner restores glycogen and gives a high-quality protein dose.' },
  { mealType: 'EVENING_SNACK', time: '21:30', title: 'Evening recovery snack', timingRole: 'RECOVERY', kcalShare: 0.08, proteinShare: 0.08, carbsShare: 0.05, fatShare: 0.12, explanation: 'Optional evening protein to support overnight recovery.' },
]

const GAME_SLOTS: MealSlot[] = [
  { mealType: 'BREAKFAST', time: '08:00', title: 'Game-day breakfast', timingRole: 'GAME_FUEL', kcalShare: 0.2, proteinShare: 0.2, carbsShare: 0.22, fatShare: 0.16, explanation: 'A calm, familiar breakfast that begins glycogen top-up.' },
  { mealType: 'MORNING_SNACK', time: '10:30', title: 'Light top-up', timingRole: 'GAME_FUEL', kcalShare: 0.09, proteinShare: 0.08, carbsShare: 0.12, fatShare: 0.04, explanation: 'Keep the stomach light while adding easy carbohydrates.' },
  { mealType: 'LUNCH', time: '12:30', title: 'Pre-game main meal', timingRole: 'GAME_FUEL', kcalShare: 0.26, proteinShare: 0.25, carbsShare: 0.29, fatShare: 0.18, explanation: 'Main pre-game meal: high carbohydrate, moderate protein, low-to-moderate fat.' },
  { mealType: 'PRE_WORKOUT', time: '16:30', title: 'Pre-game snack', timingRole: 'PRE_WORKOUT', kcalShare: 0.12, proteinShare: 0.05, carbsShare: 0.18, fatShare: 0.02, explanation: 'Fast fuel in the final window before warm-up.' },
  { mealType: 'POST_WORKOUT', time: '21:15', title: 'Post-game recovery', timingRole: 'POST_WORKOUT', kcalShare: 0.13, proteinShare: 0.17, carbsShare: 0.13, fatShare: 0.06, explanation: 'Start recovery quickly after the game with protein and carbohydrates.' },
  { mealType: 'DINNER', time: '22:15', title: 'Late recovery meal', timingRole: 'RECOVERY', kcalShare: 0.2, proteinShare: 0.25, carbsShare: 0.06, fatShare: 0.54, explanation: 'A controlled late meal finishes protein and energy needs without forcing more bulky carbs.' },
]

const REST_SLOTS: MealSlot[] = [
  { mealType: 'BREAKFAST', time: '08:30', title: 'Protein breakfast', timingRole: 'REGULAR', kcalShare: 0.24, proteinShare: 0.25, carbsShare: 0.2, fatShare: 0.25, explanation: 'Rest-day breakfast keeps protein high while carbohydrates are calmer.' },
  { mealType: 'MORNING_SNACK', time: '11:00', title: 'Light snack', timingRole: 'REGULAR', kcalShare: 0.1, proteinShare: 0.12, carbsShare: 0.08, fatShare: 0.08, explanation: 'Small protein dose for satiety.' },
  { mealType: 'LUNCH', time: '13:00', title: 'Lean lunch', timingRole: 'REGULAR', kcalShare: 0.26, proteinShare: 0.28, carbsShare: 0.24, fatShare: 0.22, explanation: 'A lean, nutrient-dense lunch is where the gentle deficit can live.' },
  { mealType: 'AFTERNOON_SNACK', time: '16:00', title: 'Recovery snack', timingRole: 'RECOVERY', kcalShare: 0.1, proteinShare: 0.1, carbsShare: 0.09, fatShare: 0.1, explanation: 'Keep hunger stable without over-fueling a low-demand afternoon.' },
  { mealType: 'DINNER', time: '19:00', title: 'Rest-day dinner', timingRole: 'REGULAR', kcalShare: 0.22, proteinShare: 0.2, carbsShare: 0.25, fatShare: 0.22, explanation: 'Dinner still includes carbohydrate so tomorrow starts well fueled.' },
  { mealType: 'EVENING_SNACK', time: '21:30', title: 'Evening protein', timingRole: 'RECOVERY', kcalShare: 0.08, proteinShare: 0.05, carbsShare: 0.14, fatShare: 0.13, explanation: 'Optional if the day is short on protein or hunger is high.' },
]

function slotsForDay(dayType: PerformancePlanDayType): MealSlot[] {
  if (dayType === 'GAME') return GAME_SLOTS
  if (dayType === 'REST' || dayType === 'RECOVERY' || dayType === 'TRAVEL') return REST_SLOTS
  return DEFAULT_SLOTS
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}

function makePortions(slot: MealSlot, macros: { proteinG: number; carbsG: number; fatG: number }, dayType: PerformancePlanDayType): MealPortionSummary {
  const proteinSource =
    slot.mealType === 'BREAKFAST' || slot.mealType === 'EVENING_SNACK'
      ? 'kvarg / Greek yoghurt'
      : slot.mealType === 'POST_WORKOUT'
        ? 'whey or recovery yoghurt'
        : 'chicken, fish, eggs, or lean beef'
  const carbSource =
    slot.timingRole === 'PRE_WORKOUT' || slot.timingRole === 'GAME_FUEL'
      ? 'rice, pasta, potatoes, bread, banana, or sports drink'
      : dayType === 'REST' || dayType === 'RECOVERY'
        ? 'potatoes, oats, fruit, berries, or whole-grain bread'
        : 'rice, pasta, potatoes, oats, or bread'
  const fatSource =
    slot.timingRole === 'PRE_WORKOUT' || slot.timingRole === 'GAME_FUEL'
      ? 'small amount of olive oil or avocado'
      : 'olive oil, avocado, nuts, eggs, or salmon'

  return {
    items: [
      { name: proteinSource, amount: `${Math.max(15, Math.round(macros.proteinG))} g protein` },
      { name: carbSource, amount: `${Math.max(10, Math.round(macros.carbsG))} g carbohydrates` },
      { name: fatSource, amount: `${Math.max(2, Math.round(macros.fatG))} g fat` },
      { name: 'vegetables / fruit', amount: slot.timingRole === 'PRE_WORKOUT' ? 'small, low-fiber portion' : '1-2 fists' },
    ],
    note:
      slot.timingRole === 'PRE_WORKOUT'
        ? 'Keep this easy to digest: low fat, low fiber, familiar foods.'
        : slot.timingRole === 'GAME_FUEL'
          ? 'Prioritize familiar carbohydrates and avoid experimenting on game day.'
          : 'Use the listed macros as the target; food choices can be swapped.',
  }
}

function makeOptions(slot: MealSlot, macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }, dayType: PerformancePlanDayType): PlannedMealOptionDraft[] {
  const base = {
    caloriesKcal: macros.caloriesKcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
  }

  const optionA = slot.mealType === 'BREAKFAST'
    ? 'Oats, banana, yoghurt, whey'
    : slot.timingRole === 'PRE_WORKOUT'
      ? 'Banana, toast with honey, sports drink'
      : slot.timingRole === 'POST_WORKOUT'
        ? 'Recovery shake, yoghurt, cereal, fruit'
        : 'Chicken, rice, vegetables'
  const optionB = slot.mealType === 'BREAKFAST'
    ? 'Eggs, bread, fruit, yoghurt'
    : slot.timingRole === 'PRE_WORKOUT'
      ? 'Rice cakes, jam, diluted sports drink'
      : slot.timingRole === 'POST_WORKOUT'
        ? 'Chocolate milk, quark, banana'
        : dayType === 'REST'
          ? 'Salmon, potatoes, vegetables'
          : 'Lean beef, pasta, tomato sauce'

  return [optionA, optionB].map((title, index) => ({
    title,
    description: 'Equivalent macro swap for this meal slot.',
    portionSummary: {
      items: [
        { name: title, amount: `${base.caloriesKcal} kcal target` },
        { name: 'macro target', amount: `${Math.round(base.proteinG)}P / ${Math.round(base.carbsG)}C / ${Math.round(base.fatG)}F` },
      ],
    },
    ...base,
    sortOrder: index,
  }))
}

export function buildPlannedMealsForDay(input: {
  dayType: PerformancePlanDayType
  targets: DailyMacroTargets
  scheduleSignals: ScheduleSignal[]
}): PlannedMealDraft[] {
  const slots = slotsForDay(input.dayType)
  let remainingCalories = input.targets.caloriesKcal
  let remainingProtein = input.targets.proteinG
  let remainingCarbs = input.targets.carbsG
  let remainingFat = input.targets.fatG

  return slots.map((slot, index) => {
    const isLast = index === slots.length - 1
    const caloriesKcal = isLast ? remainingCalories : Math.round(input.targets.caloriesKcal * slot.kcalShare)
    const proteinG = isLast ? remainingProtein : roundMacro(input.targets.proteinG * slot.proteinShare)
    const carbsG = isLast ? remainingCarbs : roundMacro(input.targets.carbsG * slot.carbsShare)
    const fatG = isLast ? remainingFat : roundMacro(input.targets.fatG * slot.fatShare)

    remainingCalories -= caloriesKcal
    remainingProtein = roundMacro(remainingProtein - proteinG)
    remainingCarbs = roundMacro(remainingCarbs - carbsG)
    remainingFat = roundMacro(remainingFat - fatG)

    const macros = { caloriesKcal, proteinG, carbsG, fatG }
    const portionSummary = makePortions(slot, macros, input.dayType)

    return {
      mealType: slot.mealType,
      time: slot.time,
      title: slot.title,
      description: `${caloriesKcal} kcal: ${Math.round(proteinG)}g protein, ${Math.round(carbsG)}g carbs, ${Math.round(fatG)}g fat.`,
      timingRole: slot.timingRole,
      explanation: slot.explanation,
      portionSummary,
      caloriesKcal,
      proteinG,
      carbsG,
      fatG,
      sortOrder: index,
      options: makeOptions(slot, macros, input.dayType),
    }
  })
}
