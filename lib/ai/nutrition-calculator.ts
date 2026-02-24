/**
 * Nutrition Calculator
 *
 * BMR, TDEE, and macro calculations for general fitness and nutrition guidance.
 * Based on scientific formulas: Mifflin-St Jeor, Harris-Benedict, and sport-specific adjustments.
 */

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
} as const;

export type MacroProfile = keyof typeof MACRO_PROFILES;

// Protein requirements by goal (g per kg body weight)
export const PROTEIN_REQUIREMENTS = {
  SEDENTARY: { min: 0.8, max: 1.0 },
  WEIGHT_LOSS: { min: 1.2, max: 1.6 },
  MUSCLE_GAIN: { min: 1.6, max: 2.2 },
  ENDURANCE_ATHLETE: { min: 1.2, max: 1.4 },
  STRENGTH_ATHLETE: { min: 1.6, max: 2.0 },
  ELITE_ATHLETE: { min: 1.8, max: 2.4 },
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
  customProteinPerKg?: number; // Override for specific protein needs
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
export function calculateMacros(input: MacroInput): NutritionPlan['macros'] {
  const { tdee, goal, profile, weightKg, customProteinPerKg } = input;

  const targetCalories = tdee + CALORIC_ADJUSTMENTS[goal];
  const ratios = MACRO_PROFILES[profile];

  // Calculate protein - can use custom per-kg value or percentage
  let proteinGrams: number;
  if (customProteinPerKg) {
    proteinGrams = Math.round(weightKg * customProteinPerKg);
  } else {
    proteinGrams = Math.round((targetCalories * ratios.protein) / 4);
  }

  const proteinCalories = proteinGrams * 4;
  const proteinPercentage = Math.round((proteinCalories / targetCalories) * 100);

  // Distribute remaining calories between carbs and fat
  const remainingCalories = targetCalories - proteinCalories;
  const carbRatio = ratios.carbs / (ratios.carbs + ratios.fat);

  const carbCalories = Math.round(remainingCalories * carbRatio);
  const fatCalories = remainingCalories - carbCalories;

  const carbGrams = Math.round(carbCalories / 4);
  const fatGrams = Math.round(fatCalories / 9);

  return {
    protein: {
      grams: proteinGrams,
      calories: proteinCalories,
      percentage: proteinPercentage,
    },
    carbs: {
      grams: carbGrams,
      calories: carbCalories,
      percentage: Math.round((carbCalories / targetCalories) * 100),
    },
    fat: {
      grams: fatGrams,
      calories: fatCalories,
      percentage: Math.round((fatCalories / targetCalories) * 100),
    },
  };
}

/**
 * Generate complete nutrition plan
 */
export function generateNutritionPlan(
  basicInput: TDEEInput,
  goal: CaloricGoal,
  profile: MacroProfile,
  customProteinPerKg?: number
): NutritionPlan {
  const bmr = calculateBMR(basicInput);
  const tdee = calculateTDEE(basicInput);
  const targetCalories = tdee + CALORIC_ADJUSTMENTS[goal];

  const macros = calculateMacros({
    tdee,
    goal,
    profile,
    weightKg: basicInput.weightKg,
    customProteinPerKg,
  });

  const recommendations: string[] = [];
  const warnings: string[] = [];

  // Safety checks
  const minCalories = basicInput.gender === 'MALE' ? 1500 : 1200;
  if (targetCalories < minCalories) {
    warnings.push(`Varning: Målkalorier (${targetCalories}) är under rekommenderat minimum (${minCalories} kcal). Överväg en långsammare viktnedgång.`);
  }

  // Protein recommendations
  if (macros.protein.grams < basicInput.weightKg * 0.8) {
    warnings.push('Proteinintaget kan vara för lågt. Överväg att öka till minst 0.8g per kg kroppsvikt.');
  }

  // Goal-specific recommendations
  if (goal.includes('LOSS')) {
    recommendations.push('Prioritera protein för att bevara muskelmassa under viktnedgång.');
    recommendations.push('Fördela kalorierna jämnt över dagen med 4-5 måltider.');
    recommendations.push('Ät proteinrika livsmedel först på tallriken.');
  }

  if (goal.includes('GAIN')) {
    recommendations.push('Fokusera på kaloritäta, näringsrika livsmedel.');
    recommendations.push('Timing: Ät inom 2 timmar efter träning för optimal muskeluppbyggnad.');
    recommendations.push('Överväg kaseinprotein före sänggåendet för nattlig muskelsyntes.');
  }

  // Activity-specific recommendations
  if (basicInput.activityLevel === 'ATHLETE' || basicInput.activityLevel === 'VERY_ACTIVE') {
    recommendations.push('Som aktiv atlet, fokusera på kolhydrater runt träningspass.');
    recommendations.push('Rehydrera med elektrolyter efter intensiv träning.');
  }

  // Profile-specific recommendations
  if (profile === 'ENDURANCE') {
    recommendations.push('Ladda med kolhydrater (7-10g/kg) innan långa pass eller tävling.');
    recommendations.push('Under pass >60 min: 30-60g kolhydrater per timme.');
  }

  if (profile === 'STRENGTH') {
    recommendations.push('20-40g protein inom 2 timmar efter styrketräning.');
    recommendations.push('Kreatin (3-5g dagligen) kan stödja styrkeökningar.');
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
export function calculateBMI(weightKg: number, heightCm: number): { bmi: number; category: string } {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let category: string;
  if (bmi < 18.5) {
    category = 'Undervikt';
  } else if (bmi < 25) {
    category = 'Normalvikt';
  } else if (bmi < 30) {
    category = 'Övervikt';
  } else if (bmi < 35) {
    category = 'Fetma grad I';
  } else if (bmi < 40) {
    category = 'Fetma grad II';
  } else {
    category = 'Fetma grad III';
  }

  return { bmi: Math.round(bmi * 10) / 10, category };
}

/**
 * Categorize body fat percentage
 */
export function categorizeBodyFat(
  bodyFatPercent: number,
  gender: 'MALE' | 'FEMALE',
  ageYears: number
): string {
  // Essential fat levels
  const essentialFat = gender === 'MALE' ? 3 : 12;

  if (bodyFatPercent < essentialFat) {
    return 'Under essentiell nivå (ohälsosamt)';
  }

  // Categories vary by gender
  if (gender === 'MALE') {
    if (bodyFatPercent < 6) return 'Tävlingsform';
    if (bodyFatPercent < 14) return 'Atletisk';
    if (bodyFatPercent < 18) return 'Fitness';
    if (bodyFatPercent < 25) return 'Acceptabel';
    return 'Överskott';
  } else {
    if (bodyFatPercent < 14) return 'Tävlingsform';
    if (bodyFatPercent < 21) return 'Atletisk';
    if (bodyFatPercent < 25) return 'Fitness';
    if (bodyFatPercent < 32) return 'Acceptabel';
    return 'Överskott';
  }
}

/**
 * Analyze body composition
 */
export function analyzeBodyComposition(
  input: BodyCompositionInput,
  heightCm: number
): BodyCompositionAnalysis {
  const { weightKg, bodyFatPercent, muscleMassKg, gender, ageYears } = input;

  const { bmi, category: bmiCategory } = calculateBMI(weightKg, heightCm);

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
    analysis.bodyFatCategory = categorizeBodyFat(bodyFatPercent, gender, ageYears);

    // Recommendations based on body fat
    if (bodyFatPercent > (gender === 'MALE' ? 25 : 32)) {
      analysis.recommendations.push('Fokusera på fettförbränning genom kaloriunderskott och konditionsträning.');
      analysis.recommendations.push('Styrketräning hjälper att bevara muskelmassa under viktnedgång.');
    } else if (bodyFatPercent < (gender === 'MALE' ? 8 : 16)) {
      analysis.recommendations.push('Låg kroppsfett kan påverka hormonbalans och prestation.');
      analysis.recommendations.push('Överväg en försiktig ökning av kaloriintaget.');
    }
  }

  // BMI-based recommendations
  if (bmi < 18.5) {
    analysis.recommendations.push('Fokusera på kaloriöverskott och styrketräning för hälsosam viktökning.');
  } else if (bmi > 30) {
    analysis.recommendations.push('Överväg konsultation med dietist för långsiktig viktkontroll.');
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
  sport?: string
): string {
  const bmr = calculateBMR(input);
  const tdee = calculateTDEE(input);
  const { bmi, category: bmiCategory } = calculateBMI(input.weightKg, input.heightCm);
  const idealWeight = calculateIdealWeightRange(input.heightCm, input.gender);

  let context = `## NÄRINGSINFORMATION

### Metabolism
- **BMR (Basal metabolic rate)**: ${bmr} kcal/dag
- **TDEE (Total daily energy expenditure)**: ${tdee} kcal/dag
- **Aktivitetsnivå**: ${input.activityLevel}

### Kroppssammansättning
- **Vikt**: ${input.weightKg} kg
- **Längd**: ${input.heightCm} cm
- **BMI**: ${bmi} (${bmiCategory})
- **Idealvikt**: ${idealWeight.min}-${idealWeight.max} kg`;

  if (bodyComposition?.bodyFatPercent) {
    const fatCategory = categorizeBodyFat(bodyComposition.bodyFatPercent, input.gender, input.ageYears);
    const fatMass = Math.round((input.weightKg * bodyComposition.bodyFatPercent / 100) * 10) / 10;
    const leanMass = Math.round((input.weightKg - fatMass) * 10) / 10;

    context += `
- **Kroppsfett**: ${bodyComposition.bodyFatPercent}% (${fatCategory})
- **Fettmassa**: ${fatMass} kg
- **Fettfri massa**: ${leanMass} kg`;
  }

  if (bodyComposition?.muscleMassKg) {
    context += `
- **Muskelmassa**: ${bodyComposition.muscleMassKg} kg`;
  }

  if (goal) {
    const plan = generateNutritionPlan(input, goal, sport === 'RUNNING' ? 'ENDURANCE' : 'BALANCED');

    context += `

### Näringsrekommendation
- **Målkalorier**: ${plan.targetCalories} kcal/dag
- **Kaloribalans**: ${plan.deficit > 0 ? '+' : ''}${plan.deficit} kcal/dag
- **Protein**: ${plan.macros.protein.grams}g (${plan.macros.protein.percentage}%)
- **Kolhydrater**: ${plan.macros.carbs.grams}g (${plan.macros.carbs.percentage}%)
- **Fett**: ${plan.macros.fat.grams}g (${plan.macros.fat.percentage}%)`;

    if (plan.recommendations.length > 0) {
      context += `

### Tips
${plan.recommendations.map(r => `- ${r}`).join('\n')}`;
    }
  }

  const hydration = calculateHydration(input.weightKg, input.activityLevel);
  context += `

### Hydrering
- **Dagligt vätskebehov**: ${Math.round(hydration.withActivityML / 100) / 10} liter`;

  return context;
}
