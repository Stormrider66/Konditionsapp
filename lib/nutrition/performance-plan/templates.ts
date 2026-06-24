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

function macroAmount(value: number, unit: string): string {
  return `${Math.max(1, Math.round(value))} ${unit}`
}

function buildRecipeFromPreference(input: {
  slot: MealSlot
  macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }
  dayType: PerformancePlanDayType
  locale: PlanLocale
  preference?: string | null
  source?: 'TEMPLATE' | 'AI'
}): PlannedMealRecipe {
  const sv = input.locale === 'sv'
  const preference = input.preference?.trim().toLowerCase() ?? ''
  const wantsChicken = /chicken|kyckling/.test(preference)
  const wantsSurprise = /surprise|överraska|overraska/.test(preference)
  const isBreakfast = input.slot.mealType === 'BREAKFAST'
  const isPre = input.slot.timingRole === 'PRE_WORKOUT' || input.slot.timingRole === 'GAME_FUEL'
  const isPost = input.slot.timingRole === 'POST_WORKOUT' || input.slot.timingRole === 'RECOVERY'
  const isSnack = input.slot.mealType.includes('SNACK') || input.slot.mealType === 'PRE_WORKOUT' || input.slot.mealType === 'POST_WORKOUT'

  if (isBreakfast) {
    const title = sv ? 'Kvargbowl med havre, banan och bär' : 'Quark bowl with oats, banana, and berries'
    return {
      title,
      summary: sv ? 'Kall, snabb frukost med jämnt protein och kontrollerade kolhydrater.' : 'Cold, fast breakfast with even protein and controlled carbohydrates.',
      servings: 1,
      prepMinutes: 7,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'kvarg eller grekisk yoghurt' : 'quark or Greek yoghurt', amount: macroAmount(input.macros.proteinG * 7, 'g') },
        { name: sv ? 'havregryn' : 'oats', amount: macroAmount(input.macros.carbsG * 0.7, 'g') },
        { name: 'banan', amount: sv ? '1 st' : '1' },
        { name: sv ? 'blåbär eller hallon' : 'blueberries or raspberries', amount: '100 g' },
        { name: sv ? 'honung eller sylt' : 'honey or jam', amount: isPre ? '15 g' : '10 g' },
      ],
      steps: sv
        ? ['Lägg kvarg i en skål.', 'Toppa med havregryn, banan och bär.', 'Justera med honung eller sylt om passet/matchen ligger nära.']
        : ['Add quark to a bowl.', 'Top with oats, banana, and berries.', 'Adjust with honey or jam if practice/game is close.'],
      tips: [sv ? 'Förbered kvarg och bär kvällen före om morgonen är tight.' : 'Prepare quark and berries the night before if the morning is tight.'],
      source: input.source ?? 'TEMPLATE',
      prompt: input.preference ?? undefined,
    }
  }

  if (wantsChicken || (!isSnack && !wantsSurprise)) {
    return {
      title: sv ? 'Kyckling, ris och grönsaker' : 'Chicken, rice, and vegetables',
      summary: sv ? 'En rak prestationsmåltid som är enkel att skala upp eller ned efter makromålet.' : 'A direct performance meal that is easy to scale up or down to the macro target.',
      servings: 1,
      prepMinutes: 10,
      cookMinutes: 20,
      ingredients: [
        { name: sv ? 'kycklingfilé' : 'chicken breast', amount: macroAmount(input.macros.proteinG * 5, 'g') },
        { name: sv ? 'kokt ris' : 'cooked rice', amount: macroAmount(input.macros.carbsG * 3, 'g') },
        { name: sv ? 'grönsaker' : 'vegetables', amount: '150 g' },
        { name: sv ? 'olivolja' : 'olive oil', amount: macroAmount(input.macros.fatG * 1.2, 'g') },
        { name: sv ? 'salt, peppar och citron' : 'salt, pepper, and lemon', amount: sv ? 'efter smak' : 'to taste' },
      ],
      steps: sv
        ? ['Koka riset eller värm färdigkokt ris.', 'Stek kycklingen i lite olja tills den är genomstekt.', 'Lägg upp ris, kyckling och grönsaker. Ringla över resterande olja.', 'Smaka av med salt, peppar och citron.']
        : ['Cook rice or heat pre-cooked rice.', 'Pan-fry the chicken in a little oil until cooked through.', 'Plate rice, chicken, and vegetables. Drizzle remaining oil on top.', 'Season with salt, pepper, and lemon.'],
      tips: [isPre ? (sv ? 'Håll grönsakerna milda och undvik mycket stark kryddning nära match/pass.' : 'Keep vegetables mild and avoid heavy spice close to game/practice.') : (sv ? 'Laga två portioner och spara en till nästa dag.' : 'Cook two portions and save one for tomorrow.')],
      source: input.source ?? 'TEMPLATE',
      prompt: input.preference ?? undefined,
    }
  }

  if (isPre) {
    return {
      title: sv ? 'Toast med banan, honung och sportdryck' : 'Toast with banana, honey, and sports drink',
      summary: sv ? 'Lättsmält energi inför träning eller match.' : 'Easy-digesting fuel before practice or game.',
      servings: 1,
      prepMinutes: 5,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'ljust bröd eller toast' : 'white bread or toast', amount: sv ? '2 skivor' : '2 slices' },
        { name: 'banan', amount: sv ? '1 st' : '1' },
        { name: sv ? 'honung eller sylt' : 'honey or jam', amount: macroAmount(input.macros.carbsG * 0.35, 'g') },
        { name: 'sportdryck', amount: '300 ml' },
      ],
      steps: sv
        ? ['Rosta brödet lätt om du vill.', 'Lägg på banan och honung eller sylt.', 'Drick sportdrycken långsamt före uppvärmning.']
        : ['Lightly toast the bread if preferred.', 'Add banana and honey or jam.', 'Sip the sports drink before warm-up.'],
      tips: [sv ? 'Undvik extra fett här så magen känns lätt.' : 'Avoid extra fat here so the stomach stays light.'],
      source: input.source ?? 'TEMPLATE',
      prompt: input.preference ?? undefined,
    }
  }

  if (isPost) {
    return {
      title: sv ? 'Återhämtningsshake med yoghurt, flingor och frukt' : 'Recovery shake with yoghurt, cereal, and fruit',
      summary: sv ? 'Snabbt protein och kolhydrater när aptiten är låg efter belastning.' : 'Fast protein and carbohydrates when appetite is low after load.',
      servings: 1,
      prepMinutes: 6,
      cookMinutes: 0,
      ingredients: [
        { name: sv ? 'drickyoghurt eller yoghurt' : 'drink yoghurt or yoghurt', amount: '300 g' },
        { name: sv ? 'vassleprotein' : 'whey protein', amount: macroAmount(input.macros.proteinG * 0.45, 'g') },
        { name: sv ? 'flingor eller granola' : 'cereal or granola', amount: macroAmount(input.macros.carbsG * 0.65, 'g') },
        { name: sv ? 'frukt' : 'fruit', amount: sv ? '1 st' : '1 piece' },
      ],
      steps: sv
        ? ['Mixa yoghurt och proteinpulver eller rör ihop i en shaker.', 'Toppa med flingor/granola och frukt.', 'Ät eller drick inom 30-60 minuter efter passet.']
        : ['Blend yoghurt and protein powder or shake together.', 'Top with cereal/granola and fruit.', 'Eat or drink within 30-60 minutes after the session.'],
      tips: [sv ? 'Ha ingredienserna redo i väskan vid sen match.' : 'Keep ingredients ready in the bag for a late game.'],
      source: input.source ?? 'TEMPLATE',
      prompt: input.preference ?? undefined,
    }
  }

  return {
    title: sv ? 'Lax, potatis och yoghurtsås' : 'Salmon, potatoes, and yoghurt sauce',
    summary: sv ? 'Näringstät vilodagsmåltid med bra fett och lugna kolhydrater.' : 'Nutrient-dense rest-day meal with quality fats and steady carbohydrates.',
    servings: 1,
    prepMinutes: 10,
    cookMinutes: 25,
    ingredients: [
      { name: sv ? 'laxfilé' : 'salmon fillet', amount: macroAmount(input.macros.proteinG * 5, 'g') },
      { name: sv ? 'potatis' : 'potatoes', amount: macroAmount(input.macros.carbsG * 4, 'g') },
      { name: sv ? 'grekisk yoghurt' : 'Greek yoghurt', amount: '100 g' },
      { name: sv ? 'grönsaker' : 'vegetables', amount: '150 g' },
      { name: sv ? 'citron, dill, salt' : 'lemon, dill, salt', amount: sv ? 'efter smak' : 'to taste' },
    ],
    steps: sv
      ? ['Koka potatisen mjuk.', 'Tillaga laxen i panna eller ugn.', 'Rör ihop yoghurt med citron, dill och salt.', 'Servera med grönsaker.']
      : ['Boil potatoes until tender.', 'Cook salmon in a pan or oven.', 'Mix yoghurt with lemon, dill, and salt.', 'Serve with vegetables.'],
    tips: [sv ? 'Bra val när målet är återhämtning utan att jaga snabba kolhydrater.' : 'Good choice when the goal is recovery without chasing fast carbs.'],
    source: input.source ?? 'TEMPLATE',
    prompt: input.preference ?? undefined,
  }
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
  })
}

export function buildPlannedMealsForDay(input: {
  dayType: PerformancePlanDayType
  targets: DailyMacroTargets
  scheduleSignals: ScheduleSignal[]
  locale?: PlanLocale
}): PlannedMealDraft[] {
  const locale = input.locale ?? 'en'
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
      }),
    }
  })
}
