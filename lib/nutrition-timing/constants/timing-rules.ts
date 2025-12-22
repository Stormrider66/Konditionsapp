/**
 * Nutrition Timing Rules
 *
 * Evidence-based timing and quantity recommendations for sports nutrition.
 * Based on the "Fuel for the Work Required" framework from ISSN, ACSM, and IOC guidelines.
 *
 * References:
 * - ISSN Position Stand on Nutrient Timing (2017)
 * - IOC Consensus Statement on Sports Nutrition (2011, updated 2018)
 * - ACSM Joint Position Statement on Nutrition and Athletic Performance (2016)
 * - Burke et al. "Carbohydrates for training and competition" (2011)
 * - Jeukendrup "Training the Gut for Athletes" (2017)
 * - Thomas et al. "Nutrition and Athletic Performance" (2016)
 */

import type { WorkoutIntensity } from '@prisma/client'
import type {
  PreWorkoutRule,
  DuringWorkoutRule,
  PostWorkoutRule,
  RestDayAdjustment,
} from '../types'

// ==========================================
// TRAINING LOAD CLASSIFICATION
// ==========================================

/**
 * Training load categories for daily carbohydrate periodization.
 * "Fuel for the Work Required" framework - carbs scaled to metabolic demand.
 *
 * Reference: Burke et al. (2011), IOC Consensus (2018)
 */
export type TrainingLoadCategory =
  | 'REST'           // Passive recovery or very light activity
  | 'LIGHT'          // Low intensity (Z1-2), <1 hour
  | 'MODERATE'       // Moderate intensity, ~1 hour
  | 'HIGH'           // 1-3 hours moderate-to-high intensity
  | 'VERY_HIGH'      // >4-5 hours elite volume
  | 'CARB_LOADING'   // 36-48h pre-competition (>90min events)

export interface DailyCarbTarget {
  minGPerKg: number
  maxGPerKg: number
  description: string
  descriptionSv: string
  physiologicalBasis: string
}

/**
 * Daily carbohydrate targets by training load (g/kg body mass)
 *
 * Reference: IOC/ACSM/AND Joint Position Statement (2016)
 */
export const DAILY_CARB_TARGETS: Record<TrainingLoadCategory, DailyCarbTarget> = {
  REST: {
    minGPerKg: 3,
    maxGPerKg: 5,
    description: 'Rest day / very light activity',
    descriptionSv: 'Vilodag / mycket lätt aktivitet',
    physiologicalBasis: 'Matches resting metabolic needs; maintains liver glycogen; brain requires ~130g glucose/day',
  },
  LIGHT: {
    minGPerKg: 3,
    maxGPerKg: 5,
    description: 'Low intensity (Zone 1-2), <1 hour',
    descriptionSv: 'Låg intensitet (Zon 1-2), <1 timme',
    physiologicalBasis: 'Minimal glycogen depletion; fat oxidation predominates',
  },
  MODERATE: {
    minGPerKg: 5,
    maxGPerKg: 7,
    description: 'Moderate intensity, ~1 hour',
    descriptionSv: 'Måttlig intensitet, ~1 timme',
    physiologicalBasis: 'Sufficient to replenish moderate glycogen use',
  },
  HIGH: {
    minGPerKg: 6,
    maxGPerKg: 10,
    description: 'Endurance program, 1-3 hours moderate-to-high intensity',
    descriptionSv: 'Uthållighetsträning, 1-3 timmar måttlig till hög intensitet',
    physiologicalBasis: 'Essential to maintain high muscle glycogen for repeated bouts',
  },
  VERY_HIGH: {
    minGPerKg: 8,
    maxGPerKg: 12,
    description: 'Elite training volume, >4-5 hours/day',
    descriptionSv: 'Elitträningsvolym, >4-5 timmar/dag',
    physiologicalBasis: 'Maximizes glycogen resynthesis; supports immune function; prevents RED-S',
  },
  CARB_LOADING: {
    minGPerKg: 10,
    maxGPerKg: 12,
    description: '36-48 hours prior to competition (>90 min event)',
    descriptionSv: '36-48 timmar före tävling (>90 min lopp)',
    physiologicalBasis: 'Induces glycogen supercompensation; expect 1-2kg temporary weight gain (glycogen + water)',
  },
}

// ==========================================
// CARB REQUIREMENTS BY WORKOUT INTENSITY
// ==========================================

/**
 * Maps workout intensity to training load category for carb calculation.
 * Considers both intensity and typical duration patterns.
 */
export const INTENSITY_TO_LOAD_CATEGORY: Record<WorkoutIntensity, TrainingLoadCategory> = {
  RECOVERY: 'REST',
  EASY: 'LIGHT',
  MODERATE: 'MODERATE',
  THRESHOLD: 'HIGH',
  INTERVAL: 'HIGH',
  MAX: 'HIGH',
}

/**
 * Daily carbohydrate ranges by workout intensity (g/kg body weight)
 * These are starting points - actual needs depend on duration too.
 */
export const CARBS_PER_KG_BY_INTENSITY: Record<WorkoutIntensity, { min: number; max: number }> = {
  RECOVERY: { min: 3, max: 5 },    // Rest day fueling
  EASY: { min: 3, max: 5 },        // Low glycogen demand
  MODERATE: { min: 5, max: 7 },    // Moderate glycogen use
  THRESHOLD: { min: 6, max: 10 },  // High glycogen demand
  INTERVAL: { min: 6, max: 10 },   // Very high glycogen demand
  MAX: { min: 8, max: 12 },        // Maximum glycogen depletion
}

// ==========================================
// PRE-WORKOUT TIMING RULES
// ==========================================

/**
 * The 4-Hour Countdown Protocol for pre-workout nutrition.
 *
 * Key insight: Nutrient density scales INVERSELY with time to workout.
 *
 * CRITICAL: The 30-75 minute window is a "danger zone" for rebound hypoglycemia
 * in ~15-20% of athletes. High GI carbs in this window can cause blood glucose
 * to plummet at exercise onset due to synergistic insulin + contraction-mediated
 * glucose uptake.
 *
 * Reference: ACSM Position Stand (2016), Jeukendrup (2017)
 */
export const PRE_WORKOUT_TIMING: Record<string, PreWorkoutRule> = {
  '4_HOURS': {
    hoursBeforeWorkout: 4,
    carbsPerKg: 4,                // 3-4 g/kg - upper range
    proteinPerKg: 0.3,
    fatLimit: 'MODERATE',
    fiberLimit: 'NORMAL',
    description: 'Complete meal with balanced macros; time allows full digestion',
    descriptionSv: 'Komplett måltid med balanserade makros; tid för full matsmältning',
  },
  '3_HOURS': {
    hoursBeforeWorkout: 3,
    carbsPerKg: 3,                // 3-4 g/kg - lower range
    proteinPerKg: 0.25,
    fatLimit: 'MODERATE',
    fiberLimit: 'NORMAL',
    description: 'Full meal acceptable; moderate protein and fat OK',
    descriptionSv: 'Full måltid acceptabel; måttligt protein och fett OK',
  },
  '2_HOURS': {
    hoursBeforeWorkout: 2,
    carbsPerKg: 2,                // 2 g/kg
    proteinPerKg: 0.15,
    fatLimit: 'LOW',
    fiberLimit: 'LOW',
    description: 'Smaller meal; reduce fiber and fat for easier digestion',
    descriptionSv: 'Mindre måltid; minska fiber och fett för lättare matsmältning',
  },
  '1_HOUR': {
    hoursBeforeWorkout: 1,
    carbsPerKg: 1,                // 1 g/kg
    proteinPerKg: 0,
    fatLimit: 'AVOID',
    fiberLimit: 'LOW',
    description: 'Light snack; liquid carbs or easily digestible solids only',
    descriptionSv: 'Lätt mellanmål; flytande kolhydrater eller lättsmälta fasta livsmedel',
  },
  // Note: 30-75 min is the "danger zone" - handled by safety alerts
  '15_MINS': {
    hoursBeforeWorkout: 0.25,
    carbsPerKg: 0.3,              // Small quick energy
    proteinPerKg: 0,
    fatLimit: 'AVOID',
    fiberLimit: 'LOW',
    description: 'Quick energy boost; sympathetic nervous system suppresses insulin response',
    descriptionSv: 'Snabb energiboost; sympatiska nervsystemet undertrycker insulinsvar',
  },
}

/**
 * Rebound Hypoglycemia Warning Window
 *
 * Consuming high-GI carbs 30-75 minutes pre-exercise can cause blood glucose
 * to plummet at exercise onset in susceptible athletes (~15-20%).
 *
 * Recommendation: Either wait until <15 min pre-start, or choose low-GI carbs.
 */
export const HYPOGLYCEMIA_DANGER_ZONE = {
  startMinutes: 30,
  endMinutes: 75,
  warningMessageSv: 'Varning: Att äta högglykmiska kolhydrater 30-75 minuter före träning kan orsaka blodsockerfall vid träningsstart. Vänta till <15 min före start, eller välj långsamma kolhydrater (havregröt, äpple).',
  warningMessageEn: 'Warning: Consuming high-GI carbs 30-75 minutes before exercise may cause blood glucose to drop at exercise onset. Wait until <15 min pre-start, or choose low-GI options (oatmeal, apple).',
}

// ==========================================
// DURING-WORKOUT FUELING RULES
// ==========================================

/**
 * Intra-workout carbohydrate and hydration by duration.
 *
 * Key physiological constraints:
 * - SGLT1 transporter saturates at ~60g/h glucose
 * - GLUT5 transporter handles fructose (additional ~30-60g/h)
 * - Combined glucose:fructose (1:0.8 ratio) allows 90-120g/h
 * - Gut training required for >60g/h tolerance
 *
 * Reference: Jeukendrup (2017), Burke et al. (2011)
 */
export const DURING_WORKOUT_RULES: DuringWorkoutRule[] = [
  {
    minDurationMinutes: 0,
    carbsPerHour: 0,
    hydrationMlPerHour: 400,
    electrolytes: false,
    // Sessions <45 min: glycogen stores sufficient; CNS mouth rinse may help
  },
  {
    minDurationMinutes: 45,
    carbsPerHour: 15,             // Small amounts or mouth rinse
    hydrationMlPerHour: 500,
    electrolytes: true,           // Add electrolytes for fluid retention
  },
  {
    minDurationMinutes: 60,
    carbsPerHour: 30,             // Single source (glucose/maltodextrin) OK
    hydrationMlPerHour: 500,
    electrolytes: true,
  },
  {
    minDurationMinutes: 90,
    carbsPerHour: 45,             // 30-60g/h range
    hydrationMlPerHour: 600,
    electrolytes: true,
  },
  {
    minDurationMinutes: 150,      // >2.5 hours
    carbsPerHour: 75,             // 60-90g/h - MUST use glucose:fructose mix
    hydrationMlPerHour: 700,
    electrolytes: true,
    // Note: Requires multiple transportable carbs (glucose + fructose)
  },
  {
    minDurationMinutes: 240,      // >4 hours (ultra)
    carbsPerHour: 90,             // 90-120g/h possible with gut training
    hydrationMlPerHour: 800,
    electrolytes: true,
    // Note: Requires gut training protocol; not achievable without practice
  },
]

/**
 * Get the appropriate during-workout rule for a given duration
 */
export function getDuringWorkoutRule(durationMinutes: number): DuringWorkoutRule {
  const sorted = [...DURING_WORKOUT_RULES].sort(
    (a, b) => b.minDurationMinutes - a.minDurationMinutes
  )
  return (
    sorted.find((rule) => durationMinutes >= rule.minDurationMinutes) ||
    DURING_WORKOUT_RULES[0]
  )
}

/**
 * Optimal glucose:fructose ratio for multiple transportable carbohydrates.
 *
 * Recent research (2015-2024) shows 1:0.8 ratio is superior to traditional 2:1
 * - Up to 17% higher exogenous oxidation efficiency
 * - Reduced GI distress (stomach fullness, nausea)
 *
 * Practical note: Sucrose is 1:1 glucose:fructose and works well.
 */
export const GLUCOSE_FRUCTOSE_RATIO = {
  glucose: 1,
  fructose: 0.8,
  note: 'For sessions >2.5h requiring >60g/h carbs',
}

// ==========================================
// POST-WORKOUT RECOVERY RULES
// ==========================================

/**
 * Post-workout recovery nutrition - The Biphasic Window
 *
 * Phase 1 (0-60 min): Insulin-independent, rapid glycogen synthesis
 *   - GLUT4 upregulated, low glycogen drives rapid uptake
 * Phase 2 (>60 min): Insulin-dependent, slower synthesis
 *
 * Key insight: Timing urgency depends on time until next session.
 * - <8h recovery: Immediate fueling critical (1.0-1.2 g/kg/h for 4h)
 * - >24h recovery: Total daily intake matters more than timing
 *
 * Protein: 0.25-0.40 g/kg (20-40g) with 2-3g leucine for MPS
 *
 * Reference: Burke et al. (2011), ISSN Position Stand (2017)
 */
export const POST_WORKOUT_TIMING: Record<WorkoutIntensity, PostWorkoutRule> = {
  RECOVERY: {
    windowMinutes: 180,           // Flexible timing
    carbsPerKg: 0.5,
    proteinPerKg: 0.25,
    priority: 'LOW',
    description: 'Light recovery meal when convenient; minimal glycogen depletion',
    descriptionSv: 'Lätt återhämtningsmåltid när det passar; minimal glykogenförbrukning',
  },
  EASY: {
    windowMinutes: 120,
    carbsPerKg: 0.8,
    proteinPerKg: 0.25,
    priority: 'LOW',
    description: 'Normal meal timing acceptable for easy sessions',
    descriptionSv: 'Normal måltidstiming fungerar för lätta pass',
  },
  MODERATE: {
    windowMinutes: 90,
    carbsPerKg: 1.0,
    proteinPerKg: 0.3,
    priority: 'MEDIUM',
    description: 'Eat within 90 minutes for optimal glycogen replenishment',
    descriptionSv: 'Ät inom 90 minuter för optimal glykogenåterfyllnad',
  },
  THRESHOLD: {
    windowMinutes: 60,
    carbsPerKg: 1.0,
    proteinPerKg: 0.3,
    priority: 'HIGH',
    description: 'Prioritize eating within 60 minutes; significant glycogen depletion',
    descriptionSv: 'Prioritera att äta inom 60 minuter; betydande glykogenförbrukning',
  },
  INTERVAL: {
    windowMinutes: 45,
    carbsPerKg: 1.2,
    proteinPerKg: 0.35,
    priority: 'HIGH',
    description: 'Recovery meal within 45 minutes important for adaptation',
    descriptionSv: 'Återhämtningsmåltid inom 45 minuter viktigt för anpassning',
  },
  MAX: {
    windowMinutes: 30,
    carbsPerKg: 1.2,
    proteinPerKg: 0.4,
    priority: 'HIGH',
    description: 'Immediate recovery nutrition critical; maximize Phase 1 window',
    descriptionSv: 'Omedelbar återhämtningsnäring kritisk; maximera Fas 1-fönstret',
  },
}

/**
 * Short recovery protocol (<8 hours between sessions)
 *
 * When training twice a day or back-to-back sessions:
 * - 1.0-1.2 g/kg carbs per hour for first 4 hours
 * - High GI sources preferred for speed
 * - Add protein (0.3 g/kg) to enhance glycogen synthesis
 */
export const SHORT_RECOVERY_PROTOCOL = {
  maxHoursBetweenSessions: 8,
  carbsPerKgPerHour: 1.2,
  durationHours: 4,
  preferHighGI: true,
  proteinPerKg: 0.3,
  descriptionSv: 'Kort återhämtning (<8h): Ät 1.0-1.2 g/kg kolhydrater per timme de första 4 timmarna. Välj snabba kolhydrater (vitt ris, potatis).',
}

// ==========================================
// REST DAY ADJUSTMENTS
// ==========================================

/**
 * Rest day macro adjustments
 *
 * Common error: Athletes either drastically under-fuel (risking RED-S)
 * or eat training-day quantities when sedentary.
 *
 * Guidelines:
 * - Carbs: 3-5 g/kg (reduced from training days)
 * - Protein: 1.4-1.6 g/kg (maintain or increase for repair)
 * - Fat: ~1.0 g/kg or ~30% of calories (fill caloric gap, hormone synthesis)
 *
 * Rest days are ideal for high-fiber, nutrient-dense foods that are
 * restricted pre-workout due to GI concerns.
 *
 * Reference: IOC Consensus (2018)
 */
export const REST_DAY_ADJUSTMENT: RestDayAdjustment = {
  carbReduction: 0.65,        // Reduce carbs to ~65% of moderate training day
  proteinMaintain: 1.15,      // Slightly increase protein for recovery
  fatIncrease: 1.2,           // Increase fat for satiety and hormones
  calorieReduction: 0.80,     // Reduce total calories by ~20%
}

/**
 * Rest day specific recommendations
 */
export const REST_DAY_TARGETS = {
  carbsPerKg: { min: 3, max: 5 },
  proteinPerKg: { min: 1.4, max: 1.6 },
  fatPerKg: { min: 0.8, max: 1.0 },
  notes: {
    sv: 'Vilodagar är optimala för fiberrika, näringstäta livsmedel (sallader, grönsaker, baljväxter) som annars undviks före träning.',
    en: 'Rest days are optimal for high-fiber, nutrient-dense foods (salads, vegetables, legumes) typically restricted pre-workout.',
  },
}

// ==========================================
// RED-S SAFETY THRESHOLDS
// ==========================================

/**
 * Relative Energy Deficiency in Sport (RED-S) monitoring
 *
 * RED-S occurs when Energy Availability (EA) < 30 kcal/kg FFM/day
 * Consequences: Hormonal disruption, menstrual dysfunction, bone density loss
 *
 * App warning: If carb intake consistently below 3-5 g/kg during high-volume
 * training, athlete is at risk for RED-S.
 *
 * Reference: IOC Consensus on RED-S (2014, updated 2018)
 */
export const RED_S_MONITORING = {
  minEnergyAvailability: 30,    // kcal/kg FFM/day
  warningThreshold: {
    carbsPerKgMin: 3,           // Below this during high training = warning
    consecutiveDays: 3,         // Trigger after 3 consecutive days
  },
  warningMessageSv: 'Varning: Ditt kolhydratintag har varit lågt i flera dagar under hög träningsbelastning. Detta ökar risken för RED-S (Relativ Energibrist). Överväg att öka intaget.',
  warningMessageEn: 'Warning: Your carbohydrate intake has been low for multiple days during high training load. This increases RED-S risk. Consider increasing intake.',
}

// ==========================================
// CALORIE EXPENDITURE ESTIMATES
// ==========================================

/**
 * Calorie expenditure estimates by intensity (kcal/hour)
 *
 * These are estimates for a ~70kg athlete. Actual values vary by:
 * - Body weight (scale linearly)
 * - Fitness level (higher fitness = higher work rate at same HR)
 * - Activity type (running vs cycling vs swimming)
 * - Environmental conditions
 */
export const CALORIES_PER_HOUR_BY_INTENSITY: Record<WorkoutIntensity, number> = {
  RECOVERY: 300,   // ~4 kcal/kg/h
  EASY: 450,       // ~6 kcal/kg/h
  MODERATE: 600,   // ~8.5 kcal/kg/h
  THRESHOLD: 750,  // ~10.5 kcal/kg/h
  INTERVAL: 850,   // ~12 kcal/kg/h
  MAX: 950,        // ~13.5 kcal/kg/h
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculate pre-workout carbohydrate target based on timing and body weight
 */
export function calculatePreWorkoutCarbs(
  hoursBeforeWorkout: number,
  weightKg: number
): { carbsG: number; rule: PreWorkoutRule } {
  let ruleKey: string

  if (hoursBeforeWorkout >= 4) {
    ruleKey = '4_HOURS'
  } else if (hoursBeforeWorkout >= 3) {
    ruleKey = '3_HOURS'
  } else if (hoursBeforeWorkout >= 2) {
    ruleKey = '2_HOURS'
  } else if (hoursBeforeWorkout >= 1) {
    ruleKey = '1_HOUR'
  } else {
    ruleKey = '15_MINS'
  }

  const rule = PRE_WORKOUT_TIMING[ruleKey]
  return {
    carbsG: Math.round(weightKg * rule.carbsPerKg),
    rule,
  }
}

/**
 * Check if timing is in the hypoglycemia danger zone
 */
export function isInHypoglycemiaDangerZone(minutesBeforeWorkout: number): boolean {
  return (
    minutesBeforeWorkout >= HYPOGLYCEMIA_DANGER_ZONE.startMinutes &&
    minutesBeforeWorkout <= HYPOGLYCEMIA_DANGER_ZONE.endMinutes
  )
}

/**
 * Calculate post-workout nutrient targets based on intensity and body weight
 */
export function calculatePostWorkoutNutrition(
  intensity: WorkoutIntensity,
  weightKg: number
): { carbsG: number; proteinG: number; windowMinutes: number; rule: PostWorkoutRule } {
  const rule = POST_WORKOUT_TIMING[intensity]
  return {
    carbsG: Math.round(weightKg * rule.carbsPerKg),
    proteinG: Math.round(weightKg * rule.proteinPerKg),
    windowMinutes: rule.windowMinutes,
    rule,
  }
}

/**
 * Calculate daily carbohydrate target based on training load
 */
export function calculateDailyCarbs(
  weightKg: number,
  intensity: WorkoutIntensity,
  durationMinutes: number,
  isDoubleDay: boolean = false
): { carbsG: number; range: { min: number; max: number }; loadCategory: TrainingLoadCategory } {
  // Determine load category based on intensity and duration
  let loadCategory: TrainingLoadCategory

  if (intensity === 'RECOVERY') {
    loadCategory = 'REST'
  } else if (intensity === 'EASY' && durationMinutes < 60) {
    loadCategory = 'LIGHT'
  } else if (durationMinutes < 75) {
    loadCategory = 'MODERATE'
  } else if (durationMinutes < 180) {
    loadCategory = 'HIGH'
  } else {
    loadCategory = 'VERY_HIGH'
  }

  const target = DAILY_CARB_TARGETS[loadCategory]
  let carbsPerKg = (target.minGPerKg + target.maxGPerKg) / 2

  // Adjust for double training days
  if (isDoubleDay) {
    carbsPerKg = Math.min(carbsPerKg * 1.3, 12) // Cap at 12 g/kg
  }

  return {
    carbsG: Math.round(weightKg * carbsPerKg),
    range: {
      min: Math.round(weightKg * target.minGPerKg),
      max: Math.round(weightKg * target.maxGPerKg),
    },
    loadCategory,
  }
}

/**
 * Get Swedish intensity label for display
 */
export function getIntensityLabelSv(intensity: WorkoutIntensity): string {
  const labels: Record<WorkoutIntensity, string> = {
    RECOVERY: 'återhämtnings',
    EASY: 'lätt',
    MODERATE: 'måttligt',
    THRESHOLD: 'tröskelhårt',
    INTERVAL: 'intervall',
    MAX: 'maxintensivt',
  }
  return labels[intensity] || intensity.toLowerCase()
}

/**
 * Calculate during-workout fueling needs
 */
export function calculateDuringWorkoutFueling(
  durationMinutes: number,
  weightKg: number
): {
  carbsTotal: number
  carbsPerHour: number
  hydrationMl: number
  needsMultipleTransportable: boolean
  rule: DuringWorkoutRule
} {
  const rule = getDuringWorkoutRule(durationMinutes)
  const hours = durationMinutes / 60

  return {
    carbsTotal: Math.round(rule.carbsPerHour * hours),
    carbsPerHour: rule.carbsPerHour,
    hydrationMl: Math.round(rule.hydrationMlPerHour * hours),
    needsMultipleTransportable: rule.carbsPerHour > 60,
    rule,
  }
}
