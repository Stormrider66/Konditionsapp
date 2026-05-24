/**
 * Nutrition Calculator
 *
 * BMR, TDEE, and macro calculations for general fitness and nutrition guidance.
 * Based on scientific formulas: Mifflin-St Jeor, Harris-Benedict, and sport-specific adjustments.
 */

import {
  applyCarbGuardrails,
  getFatPerKg,
  getProteinTarget,
  getRestCarbsPerKg,
  normalizeNutritionActivityLevel,
  type NutritionGoalType,
} from '@/lib/nutrition/macro-guardrails';

// Activity level multipliers for TDEE calculation
export const ACTIVITY_MULTIPLIERS = {
  SEDENTARY: 1.2,        // Little or no exercise
  LIGHT: 1.375,          // Light exercise 1-3 days/week
  MODERATE: 1.55,        // Moderate exercise 3-5 days/week
  ACTIVE: 1.725,         // Hard exercise 6-7 days/week
  VERY_ACTIVE: 1.9,      // Very hard exercise, physical job
  ATHLETE: 2.0,          // Elite athlete, 2x daily training
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

// Goal-based caloric adjustments
export const CALORIC_ADJUSTMENTS = {
  AGGRESSIVE_LOSS: -750,   // ~0.75 kg/week loss
  MODERATE_LOSS: -500,     // ~0.5 kg/week loss
  MILD_LOSS: -250,         // ~0.25 kg/week loss
  MAINTAIN: 0,
  MILD_GAIN: 250,          // ~0.25 kg/week gain
  MODERATE_GAIN: 500,      // ~0.5 kg/week gain
  AGGRESSIVE_GAIN: 750,    // ~0.75 kg/week gain (bulking)
} as const;

export type CaloricGoal = keyof typeof CALORIC_ADJUSTMENTS;

// Macro distribution profiles
export const MACRO_PROFILES = {
  // Balanced for general health
  BALANCED: { protein: 0.25, carbs: 0.45, fat: 0.30 },

  // Higher protein for muscle building/preservation
  HIGH_PROTEIN: { protein: 0.35, carbs: 0.40, fat: 0.25 },

  // Lower carb for weight loss
  LOW_CARB: { protein: 0.30, carbs: 0.30, fat: 0.40 },

  // Endurance athlete (higher carb)
  ENDURANCE: { protein: 0.20, carbs: 0.55, fat: 0.25 },

  // Strength athlete
  STRENGTH: { protein: 0.30, carbs: 0.45, fat: 0.25 },

  // Keto (very low carb)
  KETO: { protein: 0.25, carbs: 0.05, fat: 0.70 },

  // Custom (fallback to balanced — actual values come from custom percentages)
  CUSTOM: { protein: 0.25, carbs: 0.45, fat: 0.30 },
} as const;

export type MacroProfile = keyof typeof MACRO_PROFILES;
type AppLocale = 'en' | 'sv';

// Protein requirements by goal (g per kg body weight)
export const PROTEIN_REQUIREMENTS = {
  SEDENTARY: { min: 0.8, max: 1.0 },
  WEIGHT_LOSS: { min: 1.2, max: 1.6 },
  MUSCLE_GAIN: { min: 1.6, max: 2.2 },
  ENDURANCE_ATHLETE: { min: 1.2, max: 1.4 },
  STRENGTH_ATHLETE: { min: 1.6, max: 2.0 },
  ELITE_ATHLETE: { min: 1.8, max: 2.2 },
} as const;

export interface BMRInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: 'MALE' | 'FEMALE';
}

export interface TDEEInput extends BMRInput {
  activityLevel: ActivityLevel;
}

export interface MacroInput {
  tdee: number;
  goal: CaloricGoal;
  profile: MacroProfile;
  weightKg: number;
  activityLevel?: ActivityLevel;
  ageYears?: number;
  customProteinPerKg?: number; // Override for specific protein needs
  customProteinPercent?: number; // Custom percentage (0-100)
  customCarbsPercent?: number;   // Custom percentage (0-100)
  customFatPercent?: number;     // Custom percentage (0-100)
}

export interface NutritionPlan {
  bmr: number;
  tdee: number;
  targetCalories: number;
  deficit: number;
  macros: {
    protein: { grams: number; calories: number; percentage: number };
    carbs: { grams: number; calories: number; percentage: number };
    fat: { grams: number; calories: number; percentage: number };
  };
  recommendations: string[];
  warnings: string[];
}

export interface BodyCompositionInput {
  weightKg: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  gender: 'MALE' | 'FEMALE';
  ageYears: number;
}

export interface BodyCompositionAnalysis {
  bmi: number;
  bmiCategory: string;
  leanBodyMass?: number;
  fatMass?: number;
  idealWeightRange: { min: number; max: number };
  bodyFatCategory?: string;
  recommendations: string[];
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * Most accurate for modern populations
 *
 * Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateBMR(input: BMRInput): number {
  const { weightKg, heightCm, ageYears, gender } = input;

  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears);
  const adjustment = gender === 'MALE' ? 5 : -161;

  return Math.round(base + adjustment);
}

/**
 * Calculate BMR using Harris-Benedict equation (revised)
 * Alternative formula, slightly different results
 */
export function calculateBMRHarrisBenedict(input: BMRInput): number {
  const { weightKg, heightCm, ageYears, gender } = input;

  if (gender === 'MALE') {
    return Math.round(88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * ageYears));
  } else {
    return Math.round(447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * ageYears));
  }
}

/**
 * Calculate BMR using Katch-McArdle formula
 * Most accurate when lean body mass is known
 */
export function calculateBMRKatchMcArdle(leanBodyMassKg: number): number {
  return Math.round(370 + (21.6 * leanBodyMassKg));
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 */
export function calculateTDEE(input: TDEEInput): number {
  const bmr = calculateBMR(input);
  const multiplier = ACTIVITY_MULTIPLIERS[input.activityLevel];
  return Math.round(bmr * multiplier);
}

/**
 * Calculate TDEE with training load adjustment
 * More accurate for athletes with variable training
 */
export function calculateTDEEWithTraining(
  input: BMRInput,
  weeklyTrainingHours: number,
  averageIntensity: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
): number {
  const bmr = calculateBMR(input);

  // Base activity factor for non-training activities
  const baseActivityFactor = 1.2;

  // Calories burned per hour by intensity
  const caloriesPerHour = {
    LOW: 300,        // Easy running, walking
    MODERATE: 500,   // Steady state cardio
    HIGH: 700,       // Tempo, intervals
    VERY_HIGH: 900,  // VO2max work, racing
  };

  const weeklyTrainingCalories = weeklyTrainingHours * caloriesPerHour[averageIntensity];
  const dailyTrainingCalories = weeklyTrainingCalories / 7;

  return Math.round((bmr * baseActivityFactor) + dailyTrainingCalories);
}

/**
 * Calculate macro distribution based on goals
 */
function mapCaloricGoalToNutritionGoal(goal: CaloricGoal): NutritionGoalType {
  if (goal.includes('LOSS')) return 'WEIGHT_LOSS';
  if (goal.includes('GAIN')) return 'WEIGHT_GAIN';
  return 'MAINTAIN';
}

function calculateMacrosInternal(input: MacroInput): { macros: NutritionPlan['macros']; warnings: string[] } {
  const {
    tdee,
    goal,
    profile,
    weightKg,
    activityLevel,
    ageYears,
    customProteinPerKg,
    customProteinPercent,
    customCarbsPercent,
    customFatPercent,
  } = input;

  const targetCalories = tdee + CALORIC_ADJUSTMENTS[goal];
  const nutritionGoalType = mapCaloricGoalToNutritionGoal(goal);
  const nutritionActivityLevel = normalizeNutritionActivityLevel(activityLevel);
  const warnings: string[] = [];

  // Priority 1: Custom percentages (all three must be provided)
  if (customProteinPercent != null && customCarbsPercent != null && customFatPercent != null) {
    const requestedProteinGrams = Math.round((targetCalories * customProteinPercent / 100) / 4);
    const proteinTarget = getProteinTarget({
      weightKg,
      goalType: nutritionGoalType,
      macroProfile: profile,
      activityLevel: nutritionActivityLevel,
      customProteinPerKg: requestedProteinGrams / weightKg,
    });
    const proteinGrams = proteinTarget.grams;
    if (requestedProteinGrams > proteinGrams) {
      warnings.push(`Custom protein percentage adjusted to ${proteinGrams}g (${proteinTarget.gramsPerKg} g/kg).`);
    }
    warnings.push(...proteinTarget.warnings);

    const requestedCarbGrams = Math.round((targetCalories * customCarbsPercent / 100) / 4);
    const carbTarget = applyCarbGuardrails({
      carbsG: requestedCarbGrams,
      weightKg,
      activityLevel: nutritionActivityLevel,
      macroProfile: profile,
      ageYears,
    });
    const carbGrams = carbTarget.grams;
    if (requestedCarbGrams > carbGrams) {
      warnings.push(`Custom carbohydrate percentage adjusted to ${carbGrams}g (${carbTarget.gramsPerKg} g/kg).`);
    }
    warnings.push(...carbTarget.warnings);

    const remainingCalories = Math.max(0, targetCalories - proteinGrams * 4 - carbGrams * 4);
    const fatGrams = Math.max(Math.round(weightKg * 0.6), Math.round(remainingCalories / 9));
    const adjustedCalories = proteinGrams * 4 + carbGrams * 4 + fatGrams * 9;

    return {
      macros: {
        protein: {
          grams: proteinGrams,
          calories: proteinGrams * 4,
          percentage: Math.round((proteinGrams * 4 / adjustedCalories) * 100),
        },
        carbs: {
          grams: carbGrams,
          calories: carbGrams * 4,
          percentage: Math.round((carbGrams * 4 / adjustedCalories) * 100),
        },
        fat: {
          grams: fatGrams,
          calories: fatGrams * 9,
          percentage: Math.round((fatGrams * 9 / adjustedCalories) * 100),
        },
      },
      warnings: Array.from(new Set(warnings)),
    };
  }

  const proteinTarget = getProteinTarget({
    weightKg,
    goalType: nutritionGoalType,
    macroProfile: profile,
    activityLevel: nutritionActivityLevel,
    customProteinPerKg,
  });
  warnings.push(...proteinTarget.warnings);

  const proteinGrams = proteinTarget.grams;
  const baselineCarbsPerKg = getRestCarbsPerKg({
    activityLevel: nutritionActivityLevel,
    goalType: nutritionGoalType,
    macroProfile: profile,
  });
  let carbGrams = Math.round(weightKg * baselineCarbsPerKg);

  // Use remaining calories to raise carbs when the energy target requires it,
  // then cap by athlete ambition instead of letting percentages run away.
  const fatFloorGrams = Math.round(weightKg * getFatPerKg({ goalType: nutritionGoalType, macroProfile: profile }));
  const remainingAfterProteinAndFat = targetCalories - proteinGrams * 4 - fatFloorGrams * 9;
  if (remainingAfterProteinAndFat > carbGrams * 4) {
    carbGrams = Math.round(remainingAfterProteinAndFat / 4);
  }

  const carbTarget = applyCarbGuardrails({
    carbsG: carbGrams,
    weightKg,
    activityLevel: nutritionActivityLevel,
    macroProfile: profile,
    ageYears,
  });
  warnings.push(...carbTarget.warnings);
  carbGrams = carbTarget.grams;

  const remainingCalories = Math.max(0, targetCalories - proteinGrams * 4 - carbGrams * 4);
  const fatGrams = Math.max(fatFloorGrams, Math.round(remainingCalories / 9));

  const proteinCalories = proteinGrams * 4;
  const carbCalories = carbGrams * 4;
  const fatCalories = fatGrams * 9;
  const totalMacroCalories = proteinCalories + carbCalories + fatCalories;

  return {
    macros: {
      protein: {
        grams: proteinGrams,
        calories: proteinCalories,
        percentage: Math.round((proteinCalories / totalMacroCalories) * 100),
      },
      carbs: {
        grams: carbGrams,
        calories: carbCalories,
        percentage: Math.round((carbCalories / totalMacroCalories) * 100),
      },
      fat: {
        grams: fatGrams,
        calories: fatCalories,
        percentage: Math.round((fatCalories / totalMacroCalories) * 100),
      },
    },
    warnings: Array.from(new Set(warnings)),
  };
}

export function calculateMacros(input: MacroInput): NutritionPlan['macros'] {
  return calculateMacrosInternal(input).macros;
}

/**
 * Generate complete nutrition plan
 */
export function generateNutritionPlan(
  basicInput: TDEEInput,
  goal: CaloricGoal,
  profile: MacroProfile,
  customProteinPerKg?: number,
  locale: AppLocale = 'en'
): NutritionPlan {
  const bmr = calculateBMR(basicInput);
  const tdee = calculateTDEE(basicInput);
  const targetCalories = tdee + CALORIC_ADJUSTMENTS[goal];

  const macroResult = calculateMacrosInternal({
    tdee,
    goal,
    profile,
    weightKg: basicInput.weightKg,
    activityLevel: basicInput.activityLevel,
    ageYears: basicInput.ageYears,
    customProteinPerKg,
  });
  const macros = macroResult.macros;

  const recommendations: string[] = [];
  const warnings: string[] = [...macroResult.warnings];

  // Safety checks
  const minCalories = basicInput.gender === 'MALE' ? 1500 : 1200;
  if (targetCalories < minCalories) {
    warnings.push(locale === 'sv'
      ? `Varning: Målkalorier (${targetCalories}) är under rekommenderat minimum (${minCalories} kcal). Överväg en långsammare viktnedgång.`
      : `Warning: Target calories (${targetCalories}) are below the recommended minimum (${minCalories} kcal). Consider slower weight loss.`);
  }

  // Protein recommendations
  if (macros.protein.grams < basicInput.weightKg * 0.8) {
    warnings.push(locale === 'sv'
      ? 'Proteinintaget kan vara för lågt. Överväg att öka till minst 0.8g per kg kroppsvikt.'
      : 'Protein intake may be too low. Consider increasing to at least 0.8g per kg body weight.');
  }

  // Goal-specific recommendations
  if (goal.includes('LOSS')) {
    recommendations.push(locale === 'sv' ? 'Prioritera protein för att bevara muskelmassa under viktnedgång.' : 'Prioritize protein to preserve muscle mass during weight loss.');
    recommendations.push(locale === 'sv' ? 'Fördela kalorierna jämnt över dagen med 4-5 måltider.' : 'Distribute calories evenly across the day with 4-5 meals.');
    recommendations.push(locale === 'sv' ? 'Ät proteinrika livsmedel först på tallriken.' : 'Eat protein-rich foods first on the plate.');
  }

  if (goal.includes('GAIN')) {
    recommendations.push(locale === 'sv' ? 'Fokusera på kaloritäta, näringsrika livsmedel.' : 'Focus on calorie-dense, nutrient-rich foods.');
    recommendations.push(locale === 'sv' ? 'Timing: Ät inom 2 timmar efter träning för optimal muskeluppbyggnad.' : 'Timing: Eat within 2 hours after training to support muscle building.');
    recommendations.push(locale === 'sv' ? 'Överväg kaseinprotein före sänggåendet för nattlig muskelsyntes.' : 'Consider casein protein before bed to support overnight muscle protein synthesis.');
  }

  // Activity-specific recommendations
  if (basicInput.activityLevel === 'ATHLETE' || basicInput.activityLevel === 'VERY_ACTIVE') {
    recommendations.push(locale === 'sv' ? 'Som aktiv atlet, fokusera på kolhydrater runt träningspass.' : 'As an active athlete, focus carbohydrates around training sessions.');
    recommendations.push(locale === 'sv' ? 'Rehydrera med elektrolyter efter intensiv träning.' : 'Rehydrate with electrolytes after intense training.');
  }

  // Profile-specific recommendations
  if (profile === 'ENDURANCE') {
    recommendations.push(locale === 'sv' ? 'Högre kolhydratmål används bara vid långa pass, dubbla pass eller tävlingsförberedelse.' : 'Higher carbohydrate targets are reserved for long sessions, double days, or race preparation.');
    recommendations.push(locale === 'sv' ? 'Under pass >60 min: 30-60g kolhydrater per timme.' : 'During sessions over 60 minutes: 30-60g carbohydrates per hour.');
  }

  if (profile === 'STRENGTH') {
    recommendations.push(locale === 'sv' ? '20-40g protein inom 2 timmar efter styrketräning.' : '20-40g protein within 2 hours after strength training.');
    recommendations.push(locale === 'sv' ? 'Kreatin (3-5g dagligen) kan stödja styrkeökningar.' : 'Creatine (3-5g daily) can support strength gains.');
  }

  return {
    bmr,
    tdee,
    targetCalories,
    deficit: CALORIC_ADJUSTMENTS[goal],
    macros,
    recommendations,
    warnings,
  };
}

/**
 * Calculate BMI and categorize
 */
export function calculateBMI(weightKg: number, heightCm: number, locale: AppLocale = 'en'): { bmi: number; category: string } {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let category: string;
  if (bmi < 18.5) {
    category = locale === 'sv' ? 'Undervikt' : 'Underweight';
  } else if (bmi < 25) {
    category = locale === 'sv' ? 'Normalvikt' : 'Normal weight';
  } else if (bmi < 30) {
    category = locale === 'sv' ? 'Övervikt' : 'Overweight';
  } else if (bmi < 35) {
    category = locale === 'sv' ? 'Fetma grad I' : 'Obesity class I';
  } else if (bmi < 40) {
    category = locale === 'sv' ? 'Fetma grad II' : 'Obesity class II';
  } else {
    category = locale === 'sv' ? 'Fetma grad III' : 'Obesity class III';
  }

  return { bmi: Math.round(bmi * 10) / 10, category };
}

/**
 * Categorize body fat percentage
 */
export function categorizeBodyFat(
  bodyFatPercent: number,
  gender: 'MALE' | 'FEMALE',
  ageYears: number,
  locale: AppLocale = 'en'
): string {
  // Essential fat levels
  const essentialFat = gender === 'MALE' ? 3 : 12;

  if (bodyFatPercent < essentialFat) {
    return locale === 'sv' ? 'Under essentiell nivå (ohälsosamt)' : 'Below essential level (unhealthy)';
  }

  // Categories vary by gender
  if (gender === 'MALE') {
    if (bodyFatPercent < 6) return locale === 'sv' ? 'Tävlingsform' : 'Essential fat / Athletes';
    if (bodyFatPercent < 14) return locale === 'sv' ? 'Atletisk' : 'Athletic';
    if (bodyFatPercent < 18) return locale === 'sv' ? 'Fitness' : 'Fitness';
    if (bodyFatPercent < 25) return locale === 'sv' ? 'Acceptabel' : 'Acceptable';
    return locale === 'sv' ? 'Överskott' : 'Excess fat';
  } else {
    if (bodyFatPercent < 14) return locale === 'sv' ? 'Tävlingsform' : 'Essential fat / Athletes';
    if (bodyFatPercent < 21) return locale === 'sv' ? 'Atletisk' : 'Athletic';
    if (bodyFatPercent < 25) return locale === 'sv' ? 'Fitness' : 'Fitness';
    if (bodyFatPercent < 32) return locale === 'sv' ? 'Acceptabel' : 'Acceptable';
    return locale === 'sv' ? 'Överskott' : 'Excess fat';
  }
}

/**
 * Analyze body composition
 */
export function analyzeBodyComposition(
  input: BodyCompositionInput,
  heightCm: number,
  locale: AppLocale = 'en'
): BodyCompositionAnalysis {
  const { weightKg, bodyFatPercent, gender, ageYears } = input;

  const { bmi, category: bmiCategory } = calculateBMI(weightKg, heightCm, locale);

  const analysis: BodyCompositionAnalysis = {
    bmi,
    bmiCategory,
    idealWeightRange: calculateIdealWeightRange(heightCm, gender),
    recommendations: [],
  };

  // Calculate body composition metrics if body fat is known
  if (bodyFatPercent !== undefined) {
    analysis.fatMass = Math.round((weightKg * bodyFatPercent / 100) * 10) / 10;
    analysis.leanBodyMass = Math.round((weightKg - analysis.fatMass) * 10) / 10;
    analysis.bodyFatCategory = categorizeBodyFat(bodyFatPercent, gender, ageYears, locale);

    // Recommendations based on body fat
    if (bodyFatPercent > (gender === 'MALE' ? 25 : 32)) {
      analysis.recommendations.push(locale === 'sv' ? 'Fokusera på fettförbränning genom kaloriunderskott och konditionsträning.' : 'Focus on fat loss through a calorie deficit and endurance training.');
      analysis.recommendations.push(locale === 'sv' ? 'Styrketräning hjälper att bevara muskelmassa under viktnedgång.' : 'Strength training helps preserve muscle mass during weight loss.');
    } else if (bodyFatPercent < (gender === 'MALE' ? 8 : 16)) {
      analysis.recommendations.push(locale === 'sv' ? 'Låg kroppsfett kan påverka hormonbalans och prestation.' : 'Low body fat can affect hormonal balance and performance.');
      analysis.recommendations.push(locale === 'sv' ? 'Överväg en försiktig ökning av kaloriintaget.' : 'Consider a cautious increase in calorie intake.');
    }
  }

  // BMI-based recommendations
  if (bmi < 18.5) {
    analysis.recommendations.push(locale === 'sv' ? 'Fokusera på kaloriöverskott och styrketräning för hälsosam viktökning.' : 'Focus on a calorie surplus and strength training for healthy weight gain.');
  } else if (bmi > 30) {
    analysis.recommendations.push(locale === 'sv' ? 'Överväg konsultation med dietist för långsiktig viktkontroll.' : 'Consider consulting a dietitian for long-term weight management.');
  }

  return analysis;
}

/**
 * Calculate ideal weight range based on height
 * Using BMI range 18.5-24.9
 */
export function calculateIdealWeightRange(
  heightCm: number,
  gender: 'MALE' | 'FEMALE'
): { min: number; max: number } {
  const heightM = heightCm / 100;

  // Adjusted slightly for gender (men typically have more muscle mass)
  const minBMI = gender === 'MALE' ? 20 : 18.5;
  const maxBMI = gender === 'MALE' ? 25 : 24;

  return {
    min: Math.round(minBMI * heightM * heightM),
    max: Math.round(maxBMI * heightM * heightM),
  };
}

/**
 * Calculate weight loss/gain timeline
 */
export function calculateWeightTimeline(
  currentWeight: number,
  targetWeight: number,
  weeklyChange: number = 0.5 // kg per week
): { weeks: number; dailyDeficit: number; achievable: boolean } {
  const weightDifference = Math.abs(currentWeight - targetWeight);
  const weeks = Math.ceil(weightDifference / weeklyChange);

  // ~7700 kcal = 1 kg of body weight
  const weeklyCalories = weeklyChange * 7700;
  const dailyDeficit = Math.round(weeklyCalories / 7);

  // Check if sustainable (max ~1kg/week loss, ~0.5kg/week gain for lean mass)
  const isLoss = currentWeight > targetWeight;
  const maxWeeklyChange = isLoss ? 1.0 : 0.5;
  const achievable = weeklyChange <= maxWeeklyChange;

  return {
    weeks,
    dailyDeficit: isLoss ? -dailyDeficit : dailyDeficit,
    achievable,
  };
}

/**
 * Get protein requirements based on training goal
 */
export function getProteinRequirements(
  weightKg: number,
  goal: 'SEDENTARY' | 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'ENDURANCE_ATHLETE' | 'STRENGTH_ATHLETE' | 'ELITE_ATHLETE'
): { min: number; max: number; recommended: number } {
  const requirement = PROTEIN_REQUIREMENTS[goal];
  const recommended = (requirement.min + requirement.max) / 2;

  return {
    min: Math.round(weightKg * requirement.min),
    max: Math.round(weightKg * requirement.max),
    recommended: Math.round(weightKg * recommended),
  };
}

/**
 * Calculate hydration needs
 */
export function calculateHydration(
  weightKg: number,
  activityLevel: ActivityLevel,
  climate: 'COLD' | 'MODERATE' | 'HOT' = 'MODERATE'
): { baseML: number; withActivityML: number; recommendation: string } {
  // Base: ~33 ml/kg total water need × 0.80 = ~26 ml/kg drinking water
  // (roughly 20% of daily water comes from food)
  const baseML = Math.round(weightKg * 33 * 0.80);

  // Add for activity (reduced — original values assumed total water need)
  const activityAddition = {
    SEDENTARY: 0,
    LIGHT: 300,
    MODERATE: 500,
    ACTIVE: 750,
    VERY_ACTIVE: 1000,
    ATHLETE: 1500,
  };

  // Climate adjustment
  const climateMultiplier = {
    COLD: 1.0,
    MODERATE: 1.1,
    HOT: 1.3,
  };

  const withActivityML = Math.round(
    (baseML + activityAddition[activityLevel]) * climateMultiplier[climate]
  );

  return {
    baseML,
    withActivityML,
    recommendation: `Sikta på ${Math.round(withActivityML / 1000 * 10) / 10} liter dricksvatten per dag (exklusive vatten i mat), mer vid intensiv träning.`,
  };
}

/**
 * Build nutrition context for AI
 */
export function buildNutritionContext(
  input: TDEEInput,
  bodyComposition?: {
    bodyFatPercent?: number;
    muscleMassKg?: number;
  },
  goal?: CaloricGoal,
  sport?: string,
  locale: AppLocale = 'en'
): string {
  const bmr = calculateBMR(input);
  const tdee = calculateTDEE(input);
  const { bmi, category: bmiCategory } = calculateBMI(input.weightKg, input.heightCm, locale);
  const idealWeight = calculateIdealWeightRange(input.heightCm, input.gender);

  let context = locale === 'sv'
    ? `## NÄRINGSINFORMATION

### Metabolism
- **BMR (Basal metabolic rate)**: ${bmr} kcal/dag
- **TDEE (Total daily energy expenditure)**: ${tdee} kcal/dag
- **Aktivitetsnivå**: ${input.activityLevel}

### Kroppssammansättning
- **Vikt**: ${input.weightKg} kg
- **Längd**: ${input.heightCm} cm
- **BMI**: ${bmi} (${bmiCategory})
- **Idealvikt**: ${idealWeight.min}-${idealWeight.max} kg`
    : `## NUTRITION INFORMATION

### Metabolism
- **BMR (Basal metabolic rate)**: ${bmr} kcal/day
- **TDEE (Total daily energy expenditure)**: ${tdee} kcal/day
- **Activity level**: ${input.activityLevel}

### Body composition
- **Weight**: ${input.weightKg} kg
- **Height**: ${input.heightCm} cm
- **BMI**: ${bmi} (${bmiCategory})
- **Ideal weight**: ${idealWeight.min}-${idealWeight.max} kg`;

  if (bodyComposition?.bodyFatPercent) {
    const fatCategory = categorizeBodyFat(bodyComposition.bodyFatPercent, input.gender, input.ageYears, locale);
    const fatMass = Math.round((input.weightKg * bodyComposition.bodyFatPercent / 100) * 10) / 10;
    const leanMass = Math.round((input.weightKg - fatMass) * 10) / 10;

    context += locale === 'sv'
      ? `
- **Kroppsfett**: ${bodyComposition.bodyFatPercent}% (${fatCategory})
- **Fettmassa**: ${fatMass} kg
- **Fettfri massa**: ${leanMass} kg`
      : `
- **Body fat**: ${bodyComposition.bodyFatPercent}% (${fatCategory})
- **Fat mass**: ${fatMass} kg
- **Lean mass**: ${leanMass} kg`;
  }

  if (bodyComposition?.muscleMassKg) {
    context += locale === 'sv'
      ? `
- **Muskelmassa**: ${bodyComposition.muscleMassKg} kg`
      : `
- **Muscle mass**: ${bodyComposition.muscleMassKg} kg`;
  }

  if (goal) {
    const plan = generateNutritionPlan(input, goal, sport === 'RUNNING' ? 'ENDURANCE' : 'BALANCED', undefined, locale);

    context += locale === 'sv'
      ? `

### Näringsrekommendation
- **Målkalorier**: ${plan.targetCalories} kcal/dag
- **Kaloribalans**: ${plan.deficit > 0 ? '+' : ''}${plan.deficit} kcal/dag
- **Protein**: ${plan.macros.protein.grams}g (${plan.macros.protein.percentage}%)
- **Kolhydrater**: ${plan.macros.carbs.grams}g (${plan.macros.carbs.percentage}%)
- **Fett**: ${plan.macros.fat.grams}g (${plan.macros.fat.percentage}%)`
      : `

### Nutrition recommendation
- **Target calories**: ${plan.targetCalories} kcal/day
- **Calorie balance**: ${plan.deficit > 0 ? '+' : ''}${plan.deficit} kcal/day
- **Protein**: ${plan.macros.protein.grams}g (${plan.macros.protein.percentage}%)
- **Carbohydrates**: ${plan.macros.carbs.grams}g (${plan.macros.carbs.percentage}%)
- **Fett**: ${plan.macros.fat.grams}g (${plan.macros.fat.percentage}%)`;

    if (plan.recommendations.length > 0) {
      context += locale === 'sv'
        ? `

### Tips
${plan.recommendations.map(r => `- ${r}`).join('\n')}`
        : `

### Tips
${plan.recommendations.map(r => `- ${r}`).join('\n')}`;
    }
  }

  const hydration = calculateHydration(input.weightKg, input.activityLevel);
  context += locale === 'sv'
    ? `

### Hydrering
- **Dagligt vätskebehov**: ${Math.round(hydration.withActivityML / 100) / 10} liter`
    : `

### Hydration
- **Daily fluid need**: ${Math.round(hydration.withActivityML / 100) / 10} liters`;

  return context;
}
