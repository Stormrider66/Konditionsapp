/**
 * Swedish Food Suggestions Database
 *
 * Curated list of foods commonly available in Sweden with accurate macros.
 * Used for generating personalized nutrition guidance.
 *
 * Each food includes:
 * - Swedish and English names
 * - Portion size with macros
 * - Dietary compatibility flags (vegan, gluten-free, etc.)
 * - Timing suitability (pre/during/post workout)
 */

import type { FoodSuggestion, DietaryPreferencesInput } from '../types'

// ==========================================
// CARBOHYDRATE SOURCES
// ==========================================

export const CARB_SOURCES: FoodSuggestion[] = [
  // Quick-digesting carbs (good for pre-workout 1h or less)
  {
    nameSv: 'Banan',
    nameEn: 'Banana',
    portion: '1 medium (120g)',
    carbsG: 27,
    proteinG: 1,
    fatG: 0,
    caloriesKcal: 105,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: false,
    suitableForPreWorkout: true,
    suitableForDuring: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Havregrynsgröt',
    nameEn: 'Oatmeal porridge',
    portion: '2 dl torrt havre + vatten',
    carbsG: 54,
    proteinG: 10,
    fatG: 5,
    caloriesKcal: 300,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    isLowFODMAP: false,
    isWholeGrain: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Vitt ris',
    nameEn: 'White rice',
    portion: '1.5 dl kokt',
    carbsG: 45,
    proteinG: 3,
    fatG: 0,
    caloriesKcal: 190,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Pasta',
    nameEn: 'Pasta',
    portion: '2 dl kokt',
    carbsG: 50,
    proteinG: 7,
    fatG: 1,
    caloriesKcal: 235,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Potatis',
    nameEn: 'Potato',
    portion: '2 medium (200g)',
    carbsG: 35,
    proteinG: 4,
    fatG: 0,
    caloriesKcal: 155,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Rostat bröd (vitt)',
    nameEn: 'White toast',
    portion: '2 skivor',
    carbsG: 30,
    proteinG: 4,
    fatG: 1,
    caloriesKcal: 140,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    suitableForPreWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Knäckebröd',
    nameEn: 'Crispbread',
    portion: '3 skivor',
    carbsG: 30,
    proteinG: 4,
    fatG: 1,
    caloriesKcal: 145,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    isWholeGrain: true,
    suitableForPreWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Honung',
    nameEn: 'Honey',
    portion: '2 msk (40g)',
    carbsG: 35,
    proteinG: 0,
    fatG: 0,
    caloriesKcal: 130,
    category: 'CARBS',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: false,
    suitableForPreWorkout: true,
    suitableForDuring: true,
    isSwedish: true,
  },
  {
    nameSv: 'Müsli',
    nameEn: 'Muesli',
    portion: '1 dl (50g)',
    carbsG: 35,
    proteinG: 5,
    fatG: 4,
    caloriesKcal: 195,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    containsNuts: true,
    isWholeGrain: true,
    suitableForPreWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Bär (blåbär/hallon)',
    nameEn: 'Berries (blueberries/raspberries)',
    portion: '1.5 dl',
    carbsG: 15,
    proteinG: 1,
    fatG: 0,
    caloriesKcal: 60,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Fullkornsbröd',
    nameEn: 'Whole grain bread',
    portion: '2 skivor',
    carbsG: 30,
    proteinG: 6,
    fatG: 2,
    caloriesKcal: 160,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    isWholeGrain: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Sötpotatis',
    nameEn: 'Sweet potato',
    portion: '1 medium (150g)',
    carbsG: 30,
    proteinG: 2,
    fatG: 0,
    caloriesKcal: 130,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
]

// ==========================================
// PROTEIN SOURCES
// ==========================================

export const PROTEIN_SOURCES: FoodSuggestion[] = [
  {
    nameSv: 'Kyckling',
    nameEn: 'Chicken breast',
    portion: '150g',
    carbsG: 0,
    proteinG: 40,
    fatG: 5,
    caloriesKcal: 200,
    category: 'PROTEIN',
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Ägg',
    nameEn: 'Eggs',
    portion: '3 st',
    carbsG: 1,
    proteinG: 20,
    fatG: 15,
    caloriesKcal: 220,
    category: 'PROTEIN',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    containsEggs: true,
    isLowFODMAP: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Kvarg',
    nameEn: 'Quark',
    portion: '250g',
    carbsG: 10,
    proteinG: 30,
    fatG: 1,
    caloriesKcal: 170,
    category: 'PROTEIN',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: false,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Lax',
    nameEn: 'Salmon',
    portion: '150g',
    carbsG: 0,
    proteinG: 35,
    fatG: 18,
    caloriesKcal: 310,
    category: 'PROTEIN',
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isDairyFree: true,
    containsFish: true,
    isLowFODMAP: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Cottage cheese',
    nameEn: 'Cottage cheese',
    portion: '200g',
    carbsG: 5,
    proteinG: 25,
    fatG: 5,
    caloriesKcal: 165,
    category: 'PROTEIN',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: false,
    isLowFODMAP: false,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Proteinpulver (vassle)',
    nameEn: 'Whey protein',
    portion: '1 scoop (30g)',
    carbsG: 3,
    proteinG: 25,
    fatG: 1,
    caloriesKcal: 120,
    category: 'PROTEIN',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: false,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Grekisk yoghurt',
    nameEn: 'Greek yogurt',
    portion: '200g',
    carbsG: 8,
    proteinG: 20,
    fatG: 10,
    caloriesKcal: 200,
    category: 'PROTEIN',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: false,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Nötfärs (mager)',
    nameEn: 'Lean ground beef',
    portion: '150g',
    carbsG: 0,
    proteinG: 35,
    fatG: 10,
    caloriesKcal: 230,
    category: 'PROTEIN',
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  // Vegan protein sources
  {
    nameSv: 'Tofu',
    nameEn: 'Tofu',
    portion: '150g',
    carbsG: 3,
    proteinG: 15,
    fatG: 8,
    caloriesKcal: 145,
    category: 'PROTEIN',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    containsSoy: true,
    isLowFODMAP: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Linser',
    nameEn: 'Lentils',
    portion: '2 dl kokta',
    carbsG: 30,
    proteinG: 15,
    fatG: 1,
    caloriesKcal: 185,
    category: 'PROTEIN',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: false,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Kikärtor',
    nameEn: 'Chickpeas',
    portion: '2 dl kokta',
    carbsG: 35,
    proteinG: 12,
    fatG: 3,
    caloriesKcal: 210,
    category: 'PROTEIN',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: false,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Tempeh',
    nameEn: 'Tempeh',
    portion: '100g',
    carbsG: 10,
    proteinG: 20,
    fatG: 10,
    caloriesKcal: 200,
    category: 'PROTEIN',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    containsSoy: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Seitan',
    nameEn: 'Seitan',
    portion: '100g',
    carbsG: 5,
    proteinG: 25,
    fatG: 2,
    caloriesKcal: 140,
    category: 'PROTEIN',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Växtbaserat proteinpulver',
    nameEn: 'Plant-based protein powder',
    portion: '1 scoop (30g)',
    carbsG: 3,
    proteinG: 20,
    fatG: 2,
    caloriesKcal: 110,
    category: 'PROTEIN',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
]

// ==========================================
// DURING-WORKOUT FUEL
// ==========================================

export const DURING_WORKOUT_FUEL: FoodSuggestion[] = [
  {
    nameSv: 'Sportdryck',
    nameEn: 'Sports drink',
    portion: '5 dl',
    carbsG: 30,
    proteinG: 0,
    fatG: 0,
    caloriesKcal: 120,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    suitableForDuring: true,
    isSwedish: true,
  },
  {
    nameSv: 'Energigel',
    nameEn: 'Energy gel',
    portion: '1 gel (40g)',
    carbsG: 25,
    proteinG: 0,
    fatG: 0,
    caloriesKcal: 100,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    suitableForDuring: true,
    isSwedish: true,
  },
  {
    nameSv: 'Energitugg',
    nameEn: 'Energy chews',
    portion: '4-5 st',
    carbsG: 25,
    proteinG: 0,
    fatG: 0,
    caloriesKcal: 100,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    suitableForDuring: true,
    isSwedish: true,
  },
  {
    nameSv: 'Dadlar',
    nameEn: 'Dates',
    portion: '4-5 st (50g)',
    carbsG: 35,
    proteinG: 1,
    fatG: 0,
    caloriesKcal: 140,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: false,
    suitableForDuring: true,
    isSwedish: true,
  },
  {
    nameSv: 'Russin',
    nameEn: 'Raisins',
    portion: '0.5 dl (40g)',
    carbsG: 30,
    proteinG: 1,
    fatG: 0,
    caloriesKcal: 120,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: false,
    suitableForDuring: true,
    isSwedish: true,
  },
  {
    nameSv: 'Banan',
    nameEn: 'Banana',
    portion: '1 st',
    carbsG: 27,
    proteinG: 1,
    fatG: 0,
    caloriesKcal: 105,
    category: 'CARBS',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: true,
    suitableForDuring: true,
    isSwedish: true,
  },
]

// ==========================================
// MIXED MEALS / SNACKS
// ==========================================

export const MIXED_FOODS: FoodSuggestion[] = [
  {
    nameSv: 'Fil med müsli',
    nameEn: 'Yogurt with muesli',
    portion: '2 dl fil + 0.5 dl müsli',
    carbsG: 35,
    proteinG: 12,
    fatG: 6,
    caloriesKcal: 240,
    category: 'MIXED',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: false,
    containsNuts: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Smörgås med ost och skinka',
    nameEn: 'Sandwich with cheese and ham',
    portion: '2 skivor bröd + pålägg',
    carbsG: 35,
    proteinG: 18,
    fatG: 12,
    caloriesKcal: 320,
    category: 'MIXED',
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: false,
    isDairyFree: false,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Smoothie (frukt + protein)',
    nameEn: 'Smoothie (fruit + protein)',
    portion: '3 dl',
    carbsG: 30,
    proteinG: 20,
    fatG: 3,
    caloriesKcal: 230,
    category: 'MIXED',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: true,
    isDairyFree: false,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Havregrynsgröt med banan och nötter',
    nameEn: 'Oatmeal with banana and nuts',
    portion: '1 portion',
    carbsG: 60,
    proteinG: 12,
    fatG: 12,
    caloriesKcal: 390,
    category: 'MIXED',
    isVegan: true,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    containsNuts: true,
    isWholeGrain: true,
    suitableForPreWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Kyckling med ris',
    nameEn: 'Chicken with rice',
    portion: '150g kyckling + 1.5 dl ris',
    carbsG: 45,
    proteinG: 42,
    fatG: 6,
    caloriesKcal: 400,
    category: 'MIXED',
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isDairyFree: true,
    isLowFODMAP: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Lax med potatis',
    nameEn: 'Salmon with potatoes',
    portion: '150g lax + 2 potatisar',
    carbsG: 35,
    proteinG: 38,
    fatG: 20,
    caloriesKcal: 470,
    category: 'MIXED',
    isVegan: false,
    isVegetarian: false,
    isGlutenFree: true,
    isDairyFree: true,
    containsFish: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
  {
    nameSv: 'Ägg på rostat bröd',
    nameEn: 'Eggs on toast',
    portion: '2 ägg + 2 skivor bröd',
    carbsG: 30,
    proteinG: 18,
    fatG: 12,
    caloriesKcal: 300,
    category: 'MIXED',
    isVegan: false,
    isVegetarian: true,
    isGlutenFree: false,
    isDairyFree: true,
    containsEggs: true,
    suitableForPreWorkout: true,
    suitableForPostWorkout: true,
    isSwedish: true,
  },
]

// ==========================================
// ALL FOODS COMBINED
// ==========================================

export const ALL_FOODS: FoodSuggestion[] = [
  ...CARB_SOURCES,
  ...PROTEIN_SOURCES,
  ...DURING_WORKOUT_FUEL,
  ...MIXED_FOODS,
]

// ==========================================
// FILTERING FUNCTIONS
// ==========================================

/**
 * Filter food suggestions based on dietary preferences
 */
export function filterByPreferences(
  suggestions: FoodSuggestion[],
  preferences: DietaryPreferencesInput
): FoodSuggestion[] {
  return suggestions.filter((food) => {
    // Filter by dietary style
    if (preferences.dietaryStyle === 'VEGAN' && !food.isVegan) return false
    if (preferences.dietaryStyle === 'VEGETARIAN' && !food.isVegetarian) return false
    if (preferences.dietaryStyle === 'PESCATARIAN') {
      // Pescatarian: can eat fish but not meat
      if (!food.isVegetarian && !food.containsFish) return false
    }

    // Filter by allergies
    if (preferences.allergies?.includes('GLUTEN') && !food.isGlutenFree) return false
    if (preferences.allergies?.includes('DAIRY') && !food.isDairyFree) return false
    if (preferences.allergies?.includes('NUTS') && food.containsNuts) return false
    if (preferences.allergies?.includes('EGGS') && food.containsEggs) return false
    if (preferences.allergies?.includes('SOY') && food.containsSoy) return false
    if (preferences.allergies?.includes('FISH') && food.containsFish) return false

    // Filter by intolerances
    if (preferences.intolerances?.includes('LACTOSE') && !food.isDairyFree) return false

    // Filter by FODMAP preference
    if (preferences.preferLowFODMAP && food.isLowFODMAP === false) return false

    // Filter by whole grain preference (soft filter - don't exclude, just deprioritize)
    // This is handled in sorting instead

    // Filter by dislikes (case-insensitive partial match)
    if (
      preferences.dislikedFoods?.some(
        (dislike) =>
          food.nameSv.toLowerCase().includes(dislike.toLowerCase()) ||
          food.nameEn.toLowerCase().includes(dislike.toLowerCase())
      )
    ) {
      return false
    }

    return true
  })
}

/**
 * Get carb sources suitable for pre-workout
 */
export function getPreWorkoutCarbs(preferences?: DietaryPreferencesInput): FoodSuggestion[] {
  const suitable = CARB_SOURCES.filter((f) => f.suitableForPreWorkout)
  return preferences ? filterByPreferences(suitable, preferences) : suitable
}

/**
 * Get protein sources suitable for post-workout
 */
export function getPostWorkoutProtein(preferences?: DietaryPreferencesInput): FoodSuggestion[] {
  const suitable = PROTEIN_SOURCES.filter((f) => f.suitableForPostWorkout)
  return preferences ? filterByPreferences(suitable, preferences) : suitable
}

/**
 * Get foods suitable for during-workout fueling
 */
export function getDuringWorkoutFuel(preferences?: DietaryPreferencesInput): FoodSuggestion[] {
  const suitable = DURING_WORKOUT_FUEL.filter((f) => f.suitableForDuring)
  return preferences ? filterByPreferences(suitable, preferences) : suitable
}

/**
 * Get mixed meals suitable for pre or post workout
 */
export function getMixedMeals(
  timing: 'pre' | 'post',
  preferences?: DietaryPreferencesInput
): FoodSuggestion[] {
  const suitable = MIXED_FOODS.filter((f) =>
    timing === 'pre' ? f.suitableForPreWorkout : f.suitableForPostWorkout
  )
  return preferences ? filterByPreferences(suitable, preferences) : suitable
}

/**
 * Get food suggestions that meet a target carb amount (within 20% tolerance)
 */
export function getFoodsForCarbTarget(
  targetCarbsG: number,
  preferences?: DietaryPreferencesInput,
  timing?: 'pre' | 'during' | 'post'
): FoodSuggestion[] {
  let pool: FoodSuggestion[]

  switch (timing) {
    case 'pre':
      pool = [...CARB_SOURCES, ...MIXED_FOODS].filter((f) => f.suitableForPreWorkout)
      break
    case 'during':
      pool = DURING_WORKOUT_FUEL.filter((f) => f.suitableForDuring)
      break
    case 'post':
      pool = [...CARB_SOURCES, ...MIXED_FOODS].filter((f) => f.suitableForPostWorkout)
      break
    default:
      pool = [...CARB_SOURCES, ...MIXED_FOODS]
  }

  const filtered = preferences ? filterByPreferences(pool, preferences) : pool

  // Return foods within 20% of target
  const tolerance = targetCarbsG * 0.2
  return filtered.filter(
    (f) => f.carbsG && f.carbsG >= targetCarbsG - tolerance && f.carbsG <= targetCarbsG + tolerance
  )
}

/**
 * Get food suggestions that meet a target protein amount (within 20% tolerance)
 */
export function getFoodsForProteinTarget(
  targetProteinG: number,
  preferences?: DietaryPreferencesInput
): FoodSuggestion[] {
  const filtered = preferences
    ? filterByPreferences(PROTEIN_SOURCES, preferences)
    : PROTEIN_SOURCES

  const tolerance = targetProteinG * 0.2
  return filtered.filter(
    (f) =>
      f.proteinG &&
      f.proteinG >= targetProteinG - tolerance &&
      f.proteinG <= targetProteinG + tolerance
  )
}

/**
 * Format food suggestion for display (Swedish)
 */
export function formatFoodSuggestionSv(food: FoodSuggestion): string {
  const macros: string[] = []
  if (food.carbsG) macros.push(`${food.carbsG}g kolhydrater`)
  if (food.proteinG) macros.push(`${food.proteinG}g protein`)

  return `${food.nameSv} (${food.portion}) - ${macros.join(', ')}`
}
