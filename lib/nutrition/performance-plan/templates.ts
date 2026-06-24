import type { MealType } from '@prisma/client'
import type { DailyMacroTargets } from '@/lib/nutrition-timing'
import type {
  MealPortionSummary,
  PerformanceMealTimingRole,
  PerformancePlanDayType,
  PlannedMealDraft,
  PlannedMealOptionDraft,
  PlannedMealRecipe,
  ScheduleSignal,
} from './types'
import {
  BREAKFAST_RECIPES,
  MAIN_RECIPES,
  PRE_RECIPES,
  POST_RECIPES,
  SNACK_RECIPES,
  pickRecipe,
  type RecipeContext,
} from './recipe-library'

type PlanLocale = 'en' | 'sv'
type LocalizedText = { en: string; sv: string }

type MealSlot = {
  mealType: MealType
  time: string
  title: LocalizedText
  timingRole: PerformanceMealTimingRole
  kcalShare: number
  proteinShare: number
  carbsShare: number
  fatShare: number
  explanation: LocalizedText
}

function pickText(locale: PlanLocale, text: LocalizedText): string {
  return locale === 'sv' ? text.sv : text.en
}

const DEFAULT_SLOTS: MealSlot[] = [
  { mealType: 'BREAKFAST', time: '08:00', title: { en: 'Performance breakfast', sv: 'Prestationsfrukost' }, timingRole: 'REGULAR', kcalShare: 0.22, proteinShare: 0.22, carbsShare: 0.23, fatShare: 0.22, explanation: { en: 'Start the day with protein and enough carbohydrates to protect training quality.', sv: 'Starta dagen med protein och tillräckligt med kolhydrater för att skydda träningskvaliteten.' } },
  { mealType: 'MORNING_SNACK', time: '10:30', title: { en: 'Morning protein snack', sv: 'Proteinsnack på förmiddagen' }, timingRole: 'REGULAR', kcalShare: 0.1, proteinShare: 0.12, carbsShare: 0.1, fatShare: 0.08, explanation: { en: 'A small snack keeps protein distribution even without making lunch too heavy.', sv: 'Ett mindre mellanmål håller proteinintaget jämnt utan att lunchen blir för tung.' } },
  { mealType: 'LUNCH', time: '12:30', title: { en: 'Balanced lunch', sv: 'Balanserad lunch' }, timingRole: 'REGULAR', kcalShare: 0.24, proteinShare: 0.25, carbsShare: 0.24, fatShare: 0.24, explanation: { en: 'Main daytime meal with lean protein, starch, and vegetables.', sv: 'Dagens huvudmål med magert protein, stärkelse och grönsaker.' } },
  { mealType: 'AFTERNOON_SNACK', time: '15:30', title: { en: 'Training snack', sv: 'Träningsmellanmål' }, timingRole: 'PRE_WORKOUT', kcalShare: 0.12, proteinShare: 0.08, carbsShare: 0.16, fatShare: 0.04, explanation: { en: 'Easy carbohydrates before training without much fat or fiber.', sv: 'Lättsmälta kolhydrater före träning med lite fett och fiber.' } },
  { mealType: 'DINNER', time: '19:00', title: { en: 'Recovery dinner', sv: 'Återhämtningsmiddag' }, timingRole: 'POST_WORKOUT', kcalShare: 0.24, proteinShare: 0.25, carbsShare: 0.22, fatShare: 0.3, explanation: { en: 'Dinner restores glycogen and gives a high-quality protein dose.', sv: 'Middagen fyller på glykogen och ger en högkvalitativ proteindos.' } },
  { mealType: 'EVENING_SNACK', time: '21:30', title: { en: 'Evening recovery snack', sv: 'Kvällsmål för återhämtning' }, timingRole: 'RECOVERY', kcalShare: 0.08, proteinShare: 0.08, carbsShare: 0.05, fatShare: 0.12, explanation: { en: 'Optional evening protein to support overnight recovery.', sv: 'Kvällsprotein vid behov för att stödja återhämtning över natten.' } },
]

const GAME_SLOTS: MealSlot[] = [
  { mealType: 'BREAKFAST', time: '08:00', title: { en: 'Game-day breakfast', sv: 'Matchdagsfrukost' }, timingRole: 'GAME_FUEL', kcalShare: 0.2, proteinShare: 0.2, carbsShare: 0.22, fatShare: 0.16, explanation: { en: 'A calm, familiar breakfast that begins glycogen top-up.', sv: 'En lugn och välbekant frukost som startar påfyllnaden av glykogen.' } },
  { mealType: 'MORNING_SNACK', time: '10:30', title: { en: 'Light top-up', sv: 'Lätt påfyllning' }, timingRole: 'GAME_FUEL', kcalShare: 0.09, proteinShare: 0.08, carbsShare: 0.12, fatShare: 0.04, explanation: { en: 'Keep the stomach light while adding easy carbohydrates.', sv: 'Håll magen lätt samtidigt som du fyller på med lättsmälta kolhydrater.' } },
  { mealType: 'LUNCH', time: '12:30', title: { en: 'Pre-game main meal', sv: 'Huvudmål före match' }, timingRole: 'GAME_FUEL', kcalShare: 0.26, proteinShare: 0.25, carbsShare: 0.29, fatShare: 0.18, explanation: { en: 'Main pre-game meal: high carbohydrate, moderate protein, low-to-moderate fat.', sv: 'Huvudmål inför match: mycket kolhydrater, måttligt med protein och låg till måttlig fettmängd.' } },
  { mealType: 'PRE_WORKOUT', time: '16:30', title: { en: 'Pre-game snack', sv: 'Mellanmål före match' }, timingRole: 'PRE_WORKOUT', kcalShare: 0.12, proteinShare: 0.05, carbsShare: 0.18, fatShare: 0.02, explanation: { en: 'Fast fuel in the final window before warm-up.', sv: 'Snabb energi i sista fönstret före uppvärmning.' } },
  { mealType: 'POST_WORKOUT', time: '21:15', title: { en: 'Post-game recovery', sv: 'Återhämtning efter match' }, timingRole: 'POST_WORKOUT', kcalShare: 0.13, proteinShare: 0.17, carbsShare: 0.13, fatShare: 0.06, explanation: { en: 'Start recovery quickly after the game with protein and carbohydrates.', sv: 'Starta återhämtningen snabbt efter matchen med protein och kolhydrater.' } },
  { mealType: 'DINNER', time: '22:15', title: { en: 'Late recovery meal', sv: 'Sent återhämtningsmål' }, timingRole: 'RECOVERY', kcalShare: 0.2, proteinShare: 0.25, carbsShare: 0.06, fatShare: 0.54, explanation: { en: 'A controlled late meal finishes protein and energy needs without forcing more bulky carbs.', sv: 'Ett kontrollerat sent mål fyller protein- och energibehov utan att pressa in för mycket tung mat.' } },
]

const REST_SLOTS: MealSlot[] = [
  { mealType: 'BREAKFAST', time: '08:30', title: { en: 'Protein breakfast', sv: 'Proteinfrukost' }, timingRole: 'REGULAR', kcalShare: 0.24, proteinShare: 0.25, carbsShare: 0.2, fatShare: 0.25, explanation: { en: 'Rest-day breakfast keeps protein high while carbohydrates are calmer.', sv: 'Vilodagsfrukosten håller proteinet högt medan kolhydraterna är lugnare.' } },
  { mealType: 'MORNING_SNACK', time: '11:00', title: { en: 'Light snack', sv: 'Lätt mellanmål' }, timingRole: 'REGULAR', kcalShare: 0.1, proteinShare: 0.12, carbsShare: 0.08, fatShare: 0.08, explanation: { en: 'Small protein dose for satiety.', sv: 'En liten proteindos för mättnad.' } },
  { mealType: 'LUNCH', time: '13:00', title: { en: 'Lean lunch', sv: 'Lättare lunch' }, timingRole: 'REGULAR', kcalShare: 0.26, proteinShare: 0.28, carbsShare: 0.24, fatShare: 0.22, explanation: { en: 'A lean, nutrient-dense lunch is where the gentle deficit can live.', sv: 'En lättare och näringstät lunch är där det milda underskottet kan ligga.' } },
  { mealType: 'AFTERNOON_SNACK', time: '16:00', title: { en: 'Recovery snack', sv: 'Återhämtningsmellanmål' }, timingRole: 'RECOVERY', kcalShare: 0.1, proteinShare: 0.1, carbsShare: 0.09, fatShare: 0.1, explanation: { en: 'Keep hunger stable without over-fueling a low-demand afternoon.', sv: 'Håll hungern stabil utan att överfylla en lågintensiv eftermiddag.' } },
  { mealType: 'DINNER', time: '19:00', title: { en: 'Rest-day dinner', sv: 'Vilodagsmiddag' }, timingRole: 'REGULAR', kcalShare: 0.22, proteinShare: 0.2, carbsShare: 0.25, fatShare: 0.22, explanation: { en: 'Dinner still includes carbohydrate so tomorrow starts well fueled.', sv: 'Middagen innehåller fortfarande kolhydrater så att morgondagen börjar välfylld.' } },
  { mealType: 'EVENING_SNACK', time: '21:30', title: { en: 'Evening protein', sv: 'Kvällsprotein' }, timingRole: 'RECOVERY', kcalShare: 0.08, proteinShare: 0.05, carbsShare: 0.14, fatShare: 0.13, explanation: { en: 'Optional if the day is short on protein or hunger is high.', sv: 'Valfritt om dagen saknar protein eller hungern är hög.' } },
]

function slotsForDay(dayType: PerformancePlanDayType): MealSlot[] {
  if (dayType === 'GAME') return GAME_SLOTS
  if (dayType === 'REST' || dayType === 'RECOVERY' || dayType === 'TRAVEL') return REST_SLOTS
  return DEFAULT_SLOTS
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}

function makePortions(slot: MealSlot, macros: { proteinG: number; carbsG: number; fatG: number }, dayType: PerformancePlanDayType, locale: PlanLocale): MealPortionSummary {
  const sv = locale === 'sv'
  const proteinSource =
    slot.mealType === 'BREAKFAST' || slot.mealType === 'EVENING_SNACK'
      ? (sv ? 'kvarg / grekisk yoghurt' : 'quark / Greek yoghurt')
      : slot.mealType === 'POST_WORKOUT'
        ? (sv ? 'vassle eller återhämtningsyoghurt' : 'whey or recovery yoghurt')
        : (sv ? 'kyckling, fisk, ägg eller magert nötkött' : 'chicken, fish, eggs, or lean beef')
  const carbSource =
    slot.timingRole === 'PRE_WORKOUT' || slot.timingRole === 'GAME_FUEL'
      ? (sv ? 'ris, pasta, potatis, bröd, banan eller sportdryck' : 'rice, pasta, potatoes, bread, banana, or sports drink')
      : dayType === 'REST' || dayType === 'RECOVERY'
        ? (sv ? 'potatis, havregryn, frukt, bär eller fullkornsbröd' : 'potatoes, oats, fruit, berries, or whole-grain bread')
        : (sv ? 'ris, pasta, potatis, havregryn eller bröd' : 'rice, pasta, potatoes, oats, or bread')
  const fatSource =
    slot.timingRole === 'PRE_WORKOUT' || slot.timingRole === 'GAME_FUEL'
      ? (sv ? 'liten mängd olivolja eller avokado' : 'small amount of olive oil or avocado')
      : (sv ? 'olivolja, avokado, nötter, ägg eller lax' : 'olive oil, avocado, nuts, eggs, or salmon')

  return {
    items: [
      { name: proteinSource, amount: `${Math.max(15, Math.round(macros.proteinG))} g protein` },
      { name: carbSource, amount: `${Math.max(10, Math.round(macros.carbsG))} g ${sv ? 'kolhydrater' : 'carbohydrates'}` },
      { name: fatSource, amount: `${Math.max(2, Math.round(macros.fatG))} g ${sv ? 'fett' : 'fat'}` },
      { name: sv ? 'grönsaker / frukt' : 'vegetables / fruit', amount: slot.timingRole === 'PRE_WORKOUT' ? (sv ? 'liten portion med låg fiberhalt' : 'small, low-fiber portion') : (sv ? '1-2 nävar' : '1-2 fists') },
    ],
    note:
      slot.timingRole === 'PRE_WORKOUT'
        ? (sv ? 'Håll detta lättsmält: lite fett, lite fiber och välbekanta livsmedel.' : 'Keep this easy to digest: low fat, low fiber, familiar foods.')
        : slot.timingRole === 'GAME_FUEL'
          ? (sv ? 'Prioritera välbekanta kolhydrater och undvik att experimentera på matchdag.' : 'Prioritize familiar carbohydrates and avoid experimenting on game day.')
          : (sv ? 'Använd makrona som målet; livsmedlen kan bytas.' : 'Use the listed macros as the target; food choices can be swapped.'),
  }
}

function makeOptions(slot: MealSlot, macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }, dayType: PerformancePlanDayType, locale: PlanLocale): PlannedMealOptionDraft[] {
  const sv = locale === 'sv'
  const base = {
    caloriesKcal: macros.caloriesKcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
  }

  const optionA = slot.mealType === 'BREAKFAST'
    ? (sv ? 'Havregryn, banan, yoghurt, vassle' : 'Oats, banana, yoghurt, whey')
    : slot.timingRole === 'PRE_WORKOUT'
      ? (sv ? 'Banan, toast med honung, sportdryck' : 'Banana, toast with honey, sports drink')
      : slot.timingRole === 'POST_WORKOUT'
        ? (sv ? 'Återhämtningsshake, yoghurt, flingor, frukt' : 'Recovery shake, yoghurt, cereal, fruit')
        : (sv ? 'Kyckling, ris, grönsaker' : 'Chicken, rice, vegetables')
  const optionB = slot.mealType === 'BREAKFAST'
    ? (sv ? 'Ägg, bröd, frukt, yoghurt' : 'Eggs, bread, fruit, yoghurt')
    : slot.timingRole === 'PRE_WORKOUT'
      ? (sv ? 'Riskakor, sylt, utspädd sportdryck' : 'Rice cakes, jam, diluted sports drink')
      : slot.timingRole === 'POST_WORKOUT'
        ? (sv ? 'Chokladmjölk, kvarg, banan' : 'Chocolate milk, quark, banana')
        : dayType === 'REST'
          ? (sv ? 'Lax, potatis, grönsaker' : 'Salmon, potatoes, vegetables')
          : (sv ? 'Magert nötkött, pasta, tomatsås' : 'Lean beef, pasta, tomato sauce')

  return [optionA, optionB].map((title, index) => ({
    title,
    description: sv ? 'Likvärdigt makrobyte för den här måltiden.' : 'Equivalent macro swap for this meal slot.',
    portionSummary: {
      items: [
        { name: title, amount: `${base.caloriesKcal} kcal ${sv ? 'mål' : 'target'}` },
        { name: sv ? 'makromål' : 'macro target', amount: `${Math.round(base.proteinG)}P / ${Math.round(base.carbsG)}${sv ? 'K' : 'C'} / ${Math.round(base.fatG)}F` },
      ],
    },
    ...base,
    sortOrder: index,
  }))
}

function buildRecipeFromPreference(input: {
  slot: MealSlot
  macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }
  dayType: PerformancePlanDayType
  locale: PlanLocale
  preference?: string | null
  source?: 'TEMPLATE' | 'AI'
  /** Rotates the recipe choice within each pool so the guide isn't repetitive. */
  variant?: number
}): PlannedMealRecipe {
  const preference = input.preference?.trim().toLowerCase() ?? ''
  const wantsChicken = /chicken|kyckling/.test(preference)
  const isBreakfast = input.slot.mealType === 'BREAKFAST'
  const isPre = input.slot.timingRole === 'PRE_WORKOUT' || input.slot.timingRole === 'GAME_FUEL'
  const isPost = input.slot.timingRole === 'POST_WORKOUT' || input.slot.timingRole === 'RECOVERY'
  const isSnack = input.slot.mealType.includes('SNACK') || input.slot.mealType === 'PRE_WORKOUT' || input.slot.mealType === 'POST_WORKOUT'
  // Every slot is exactly one of: breakfast, a full main meal (lunch/dinner),
  // or a snack. Routing is exhaustive on that split so a slot can never fall
  // through to an unintended recipe (a light snack once got a full salmon
  // dinner). Within each kind a pool of recipes is rotated by `variant` so the
  // athlete sees variety across days instead of the same meal every time.
  const isMain = !isBreakfast && !isSnack
  const variant = input.variant ?? 0
  const ctx: RecipeContext = {
    macros: input.macros,
    locale: input.locale,
    source: input.source ?? 'TEMPLATE',
    preference: input.preference,
    isPre,
  }

  if (isBreakfast) return pickRecipe(BREAKFAST_RECIPES, variant)(ctx)

  if (isMain) {
    // Explicit chicken request -> chicken (index 0). Pre-game mains stay lean
    // and familiar (chicken). Otherwise rotate the pool, offsetting dinner so it
    // differs from lunch on the same day (default lunch=chicken, dinner=salmon).
    if (wantsChicken || isPre) return MAIN_RECIPES[0](ctx)
    const mainVariant = input.slot.mealType === 'DINNER' ? variant + 1 : variant
    return pickRecipe(MAIN_RECIPES, mainVariant)(ctx)
  }

  // Snack slots (breakfast and main meals have already returned).
  if (isPre) return pickRecipe(PRE_RECIPES, variant)(ctx)
  if (isPost) return pickRecipe(POST_RECIPES, variant)(ctx)
  return pickRecipe(SNACK_RECIPES, variant)(ctx)
}

export function buildConcreteRecipeForMeal(input: {
  mealType: MealType
  timingRole: PerformanceMealTimingRole
  title?: string
  dayType: PerformancePlanDayType
  macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }
  locale?: PlanLocale
  preference?: string | null
  source?: 'TEMPLATE' | 'AI'
  /** Rotates the recipe pool; randomise it to vary a "surprise me" regenerate. */
  variant?: number
}): PlannedMealRecipe {
  const slot: MealSlot = {
    mealType: input.mealType,
    time: '',
    title: { en: input.title ?? '', sv: input.title ?? '' },
    timingRole: input.timingRole,
    kcalShare: 0,
    proteinShare: 0,
    carbsShare: 0,
    fatShare: 0,
    explanation: { en: '', sv: '' },
  }

  return buildRecipeFromPreference({
    slot,
    macros: input.macros,
    dayType: input.dayType,
    locale: input.locale ?? 'en',
    preference: input.preference,
    source: input.source,
    variant: input.variant,
  })
}

export function buildPlannedMealsForDay(input: {
  dayType: PerformancePlanDayType
  targets: DailyMacroTargets
  scheduleSignals: ScheduleSignal[]
  locale?: PlanLocale
  /** Per-day seed (e.g. an epoch-day number) so recipes rotate across days. */
  variantSeed?: number
}): PlannedMealDraft[] {
  const locale = input.locale ?? 'en'
  const variantSeed = input.variantSeed ?? 0
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
    const portionSummary = makePortions(slot, macros, input.dayType, locale)
    const title = pickText(locale, slot.title)

    return {
      mealType: slot.mealType,
      time: slot.time,
      title,
      description: locale === 'sv'
        ? `${caloriesKcal} kcal: ${Math.round(proteinG)} g protein, ${Math.round(carbsG)} g kolhydrater, ${Math.round(fatG)} g fett.`
        : `${caloriesKcal} kcal: ${Math.round(proteinG)}g protein, ${Math.round(carbsG)}g carbs, ${Math.round(fatG)}g fat.`,
      timingRole: slot.timingRole,
      explanation: pickText(locale, slot.explanation),
      portionSummary,
      caloriesKcal,
      proteinG,
      carbsG,
      fatG,
      sortOrder: index,
      options: makeOptions(slot, macros, input.dayType, locale),
      recipe: buildRecipeFromPreference({
        slot,
        macros,
        dayType: input.dayType,
        locale,
        // Offset by slot index so meals within a day don't all land on the same
        // pool position; offset by the day seed so consecutive days differ.
        variant: variantSeed + index,
      }),
    }
  })
}
