/**
 * Program Evaluator
 *
 * Deterministic scoring of AI-generated training programs against 8 quality criteria.
 * Zero AI cost per evaluation — all scoring is rule-based.
 */

import type { SportType } from '@prisma/client'
import type { ParsedProgram, ParsedPhase } from '@/lib/ai/program-parser'
import { validateProgramCompleteness } from '@/lib/ai/program-parser'
import { METHODOLOGIES, SPORT_PROMPTS } from '@/lib/ai/program-prompts'
import type {
  EvaluationResult,
  EvaluationContext,
  CriterionName,
  CriterionResult,
} from './types'
import { isGymSport } from './types'

// ── Criterion Weights ───────────────────────────────────────────────

const DEFAULT_WEIGHTS: Record<CriterionName, number> = {
  structuralCompleteness: 0.20,
  progressiveOverload: 0.15,
  zoneDistribution: 0.15,
  sportSpecificCorrectness: 0.15,
  calendarCompliance: 0.10,
  injuryAwareness: 0.05,
  periodizationQuality: 0.10,
  segmentDetail: 0.10,
}

// ── Main Evaluator ──────────────────────────────────────────────────

// Weight overrides for gym/strength sports
const GYM_WEIGHT_OVERRIDES: Partial<Record<CriterionName, number>> = {
  progressiveOverload: 0.20,
  zoneDistribution: 0.05,
  sportSpecificCorrectness: 0.20,
  periodizationQuality: 0.15,
}

export function evaluateProgram(
  program: ParsedProgram,
  context: EvaluationContext,
  weights?: Partial<Record<CriterionName, number>>
): EvaluationResult {
  const gymOverrides = isGymSport(context.sport) ? GYM_WEIGHT_OVERRIDES : {}
  const w = { ...DEFAULT_WEIGHTS, ...gymOverrides, ...weights }

  const criteria: Record<CriterionName, CriterionResult> = {
    structuralCompleteness: scoreStructuralCompleteness(program, context),
    progressiveOverload: scoreProgressiveOverload(program, context),
    zoneDistribution: scoreZoneDistribution(program, context),
    sportSpecificCorrectness: scoreSportSpecificCorrectness(program, context),
    calendarCompliance: scoreCalendarCompliance(program, context),
    injuryAwareness: scoreInjuryAwareness(program, context),
    periodizationQuality: scorePeriodizationQuality(program, context),
    segmentDetail: scoreSegmentDetail(program),
  }

  // Apply weights
  for (const key of Object.keys(criteria) as CriterionName[]) {
    criteria[key].weight = w[key]
  }

  const overallScore = Object.entries(criteria).reduce(
    (sum, [key, c]) => sum + c.score * w[key as CriterionName],
    0
  )

  const warnings = Object.values(criteria).flatMap(c => c.details.filter(d => d.startsWith('⚠')))

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    criteria,
    parseSuccess: true,
    warnings,
  }
}

// ── Criterion 1: Structural Completeness (20%) ─────────────────────

function scoreStructuralCompleteness(
  program: ParsedProgram,
  context: EvaluationContext
): CriterionResult {
  const details: string[] = []
  let score = 100

  // Use existing validation
  const validation = validateProgramCompleteness(program)
  if (!validation.valid) {
    score -= validation.errors.length * 15
    details.push(...validation.errors.map(e => `⚠ ${e}`))
  }
  if (validation.warnings.length > 0) {
    score -= validation.warnings.length * 5
    details.push(...validation.warnings.map(w => `⚠ ${w}`))
  }

  // Check week coverage
  const coveredWeeks = new Set<number>()
  for (const phase of program.phases) {
    const [startStr, endStr] = phase.weeks.split('-')
    const start = parseInt(startStr)
    const end = endStr ? parseInt(endStr) : start
    if (!isNaN(start) && !isNaN(end)) {
      for (let w = start; w <= end; w++) coveredWeeks.add(w)
    }
  }

  const expectedWeeks = context.totalWeeks || program.totalWeeks
  const missingWeeks = []
  for (let w = 1; w <= expectedWeeks; w++) {
    if (!coveredWeeks.has(w)) missingWeeks.push(w)
  }
  if (missingWeeks.length > 0) {
    const penalty = Math.min(30, missingWeeks.length * 5)
    score -= penalty
    details.push(`⚠ Missing weeks: ${missingWeeks.join(', ')}`)
  }

  // Check sessions per week alignment
  if (context.sessionsPerWeek && program.phases.length > 0) {
    const firstPhaseWithTemplate = program.phases.find(p => p.weeklyTemplate)
    if (firstPhaseWithTemplate?.weeklyTemplate) {
      const templateDays = Object.values(firstPhaseWithTemplate.weeklyTemplate)
      const trainingDays = templateDays.filter(d => d.type !== 'REST').length
      const diff = Math.abs(trainingDays - context.sessionsPerWeek)
      if (diff > 1) {
        score -= 10
        details.push(`⚠ Template has ${trainingDays} training days, expected ~${context.sessionsPerWeek}`)
      }
    }
  }

  // Check rest days
  const hasRestDays = program.phases.some(
    p => p.weeklyTemplate && Object.values(p.weeklyTemplate).some(d => d.type === 'REST')
  )
  if (!hasRestDays) {
    score -= 10
    details.push('⚠ No explicit rest days found')
  }

  if (details.length === 0) details.push('All structural checks passed')

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.structuralCompleteness, details }
}

// ── Criterion 2: Progressive Overload (15%) ─────────────────────────

function scoreProgressiveOverload(
  program: ParsedProgram,
  context: EvaluationContext
): CriterionResult {
  const details: string[] = []
  let score = 100

  if (program.phases.length < 2) {
    details.push('Too few phases to assess progression')
    return { score: 50, weight: DEFAULT_WEIGHTS.progressiveOverload, details }
  }

  const phases = classifyPhases(program.phases)

  // Check volume increases from BASE to BUILD
  const basePhases = phases.filter(p => p.type === 'BASE')
  const buildPhases = phases.filter(p => p.type === 'BUILD')
  const peakPhases = phases.filter(p => p.type === 'PEAK')
  const taperPhases = phases.filter(p => p.type === 'TAPER')

  // Base → Build should show progression
  if (basePhases.length > 0 && buildPhases.length > 0) {
    details.push('Base → Build progression detected')
  } else if (program.phases.length >= 3) {
    score -= 15
    details.push('⚠ No clear Base → Build progression')
  }

  // Taper should reduce volume
  if (taperPhases.length > 0) {
    const taperPhase = taperPhases[0]
    const hasVolumeReduction = taperPhase.phase.volumeGuidance?.toLowerCase().match(
      /reduc|minska|nedtrapp|lätt|vila|återhämt/i
    )
    if (hasVolumeReduction) {
      details.push('Taper phase shows volume reduction')
    } else {
      score -= 10
      details.push('⚠ Taper phase found but no volume reduction guidance')
    }
  } else if (context.totalWeeks >= 8) {
    score -= 10
    details.push('⚠ No taper phase for program >= 8 weeks')
  }

  // Check for deload weeks in longer programs
  if (context.totalWeeks >= 12 && !program.phases.some(p =>
    p.name.toLowerCase().match(/deload|avlast|vila|återhämt/)
  )) {
    score -= 10
    details.push('⚠ No deload/recovery weeks in 12+ week program')
  }

  // Phases should be in logical order
  if (phases.length >= 2) {
    const phaseOrder = ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RECOVERY']
    const indices = phases.map(p => phaseOrder.indexOf(p.type)).filter(i => i >= 0)
    const isOrdered = indices.every((val, i) => i === 0 || val >= indices[i - 1])
    if (isOrdered) {
      details.push('Phases in logical order')
    } else {
      score -= 15
      details.push('⚠ Phases not in standard periodization order')
    }
  }

  if (details.length === 0) details.push('Progressive overload checks passed')

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.progressiveOverload, details }
}

// ── Criterion 3: Zone Distribution (15%) ────────────────────────────

function scoreZoneDistribution(
  program: ParsedProgram,
  context: EvaluationContext
): CriterionResult {
  const details: string[] = []
  let score = 100

  // For gym sports, check intensity variety instead of HR zone distribution
  if (isGymSport(context.sport)) {
    return scoreGymIntensityVariety(program, context)
  }

  const methodology = context.methodology?.toUpperCase()
  const methodologyData = methodology && methodology in METHODOLOGIES
    ? METHODOLOGIES[methodology as keyof typeof METHODOLOGIES]
    : null

  if (!methodologyData) {
    details.push('No methodology specified, basic zone checks only')
  }

  // Collect all workouts across phases
  const allWorkouts: Array<{ intensity?: string; zone?: string | number; description: string }> = []
  for (const phase of program.phases) {
    if (!phase.weeklyTemplate) continue
    for (const day of Object.values(phase.weeklyTemplate)) {
      if (day.type !== 'REST' && 'name' in day) {
        allWorkouts.push(day as { intensity?: string; zone?: string | number; description: string })
      }
    }
  }

  if (allWorkouts.length === 0) {
    details.push('⚠ No workouts found to analyze zone distribution')
    return { score: 30, weight: DEFAULT_WEIGHTS.zoneDistribution, details }
  }

  // Categorize workouts by intensity
  const intensityCounts = { low: 0, moderate: 0, high: 0 }
  for (const w of allWorkouts) {
    const cat = categorizeIntensity(w)
    intensityCounts[cat]++
  }

  const total = allWorkouts.length
  const lowPct = (intensityCounts.low / total) * 100
  const highPct = (intensityCounts.high / total) * 100

  details.push(`Distribution: ${Math.round(lowPct)}% low / ${Math.round(100 - lowPct - highPct)}% moderate / ${Math.round(highPct)}% high`)

  // Check against methodology targets
  if (methodology === 'POLARIZED') {
    // 80/20: ~80% low, ~20% high, minimal moderate
    if (lowPct < 60) {
      score -= 25
      details.push('⚠ Polarized: too few low-intensity sessions (target ~80%)')
    } else if (lowPct < 70) {
      score -= 10
      details.push('⚠ Polarized: low intensity slightly below target')
    }
    if (highPct < 10) {
      score -= 15
      details.push('⚠ Polarized: too few high-intensity sessions (target ~20%)')
    }
  } else if (methodology === 'NORWEGIAN') {
    // High volume, ~2 threshold sessions per week
    if (highPct < 15) {
      score -= 15
      details.push('⚠ Norwegian: needs more threshold sessions')
    }
  } else if (methodology === 'PYRAMIDAL') {
    // 70/20/10 distribution
    if (lowPct < 55) {
      score -= 15
      details.push('⚠ Pyramidal: needs more low-intensity base')
    }
  }

  // General: any program should have mix of intensities
  if (intensityCounts.low === 0) {
    score -= 20
    details.push('⚠ No low-intensity/recovery sessions')
  }
  if (intensityCounts.high === 0 && context.totalWeeks >= 4) {
    score -= 15
    details.push('⚠ No high-intensity sessions found')
  }

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.zoneDistribution, details }
}

/**
 * Gym-specific intensity variety check.
 * Instead of HR zones, check for mix of heavy/moderate/light days and deload presence.
 */
function scoreGymIntensityVariety(
  program: ParsedProgram,
  context: EvaluationContext
): CriterionResult {
  const details: string[] = []
  let score = 100

  const allWorkouts: Array<{ intensity?: string; zone?: string | number; description: string }> = []
  for (const phase of program.phases) {
    if (!phase.weeklyTemplate) continue
    for (const day of Object.values(phase.weeklyTemplate)) {
      if (day.type !== 'REST' && 'name' in day) {
        allWorkouts.push(day as { intensity?: string; zone?: string | number; description: string })
      }
    }
  }

  if (allWorkouts.length === 0) {
    details.push('⚠ No workouts found to analyze intensity variety')
    return { score: 30, weight: DEFAULT_WEIGHTS.zoneDistribution, details }
  }

  // Categorize using gym-aware intensity mapping
  const intensityCounts = { low: 0, moderate: 0, high: 0 }
  for (const w of allWorkouts) {
    const cat = categorizeIntensity(w)
    intensityCounts[cat]++
  }

  const total = allWorkouts.length
  const uniqueIntensities = Object.values(intensityCounts).filter(c => c > 0).length

  details.push(`Intensity mix: ${intensityCounts.high} heavy / ${intensityCounts.moderate} moderate / ${intensityCounts.low} light sessions`)

  // Check for variety — all sessions same intensity is bad
  if (uniqueIntensities === 1) {
    score -= 30
    details.push('⚠ All workouts at same intensity — need variety (heavy/moderate/light)')
  } else if (uniqueIntensities === 2) {
    score -= 10
    details.push('⚠ Only 2 intensity levels — consider adding light/deload days')
  } else {
    details.push('Good intensity variety across heavy, moderate, and light days')
  }

  // Check for deload presence in longer programs
  const combinedText = getAllWorkoutDescriptions(program).join(' ').toLowerCase()
  if (context.totalWeeks >= 6) {
    const hasDeload = combinedText.match(/deload|avlast|återhämt|lätt vecka|vila.*vecka/)
    if (hasDeload) {
      details.push('Deload/recovery weeks detected')
    } else {
      score -= 15
      details.push('⚠ No deload/recovery weeks in gym program ≥6 weeks')
    }
  }

  // Check for heavy days (important for strength programs)
  if (intensityCounts.high === 0 && context.totalWeeks >= 4) {
    score -= 15
    details.push('⚠ No heavy/high-intensity sessions — strength programs need heavy days')
  }

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.zoneDistribution, details }
}

// ── Criterion 4: Sport-Specific Correctness (15%) ───────────────────

function scoreSportSpecificCorrectness(
  program: ParsedProgram,
  context: EvaluationContext
): CriterionResult {
  const details: string[] = []
  let score = 100

  const allWorkoutDescriptions = getAllWorkoutDescriptions(program)
  const combinedText = allWorkoutDescriptions.join(' ').toLowerCase()

  // Gym-specific keyword checks
  if (isGymSport(context.sport)) {
    return scoreGymSportSpecific(program, context, combinedText)
  }

  const sportPrompt = SPORT_PROMPTS[context.sport]
  if (!sportPrompt) {
    details.push(`No sport prompt defined for ${context.sport}`)
    return { score: 70, weight: DEFAULT_WEIGHTS.sportSpecificCorrectness, details }
  }

  const expectedSessionTypes = sportPrompt.sessionTypes

  // Check if at least some expected session types appear
  let matchedTypes = 0
  for (const sessionType of expectedSessionTypes) {
    // Extract key terms from session type description
    const keywords = extractKeywords(sessionType)
    const found = keywords.some(kw => combinedText.includes(kw.toLowerCase()))
    if (found) matchedTypes++
  }

  const matchRatio = expectedSessionTypes.length > 0
    ? matchedTypes / Math.min(expectedSessionTypes.length, 5) // don't require all types
    : 0.5

  if (matchRatio >= 0.6) {
    details.push(`Matched ${matchedTypes}/${expectedSessionTypes.length} expected session types`)
  } else if (matchRatio >= 0.3) {
    score -= 15
    details.push(`⚠ Only ${matchedTypes}/${expectedSessionTypes.length} expected session types found`)
  } else {
    score -= 30
    details.push(`⚠ Very few expected session types (${matchedTypes}/${expectedSessionTypes.length})`)
  }

  // Check workout types match sport
  const sportWorkoutTypes = getSportWorkoutTypes(context.sport)
  const phaseWorkoutTypes = new Set<string>()
  for (const phase of program.phases) {
    if (!phase.weeklyTemplate) continue
    for (const day of Object.values(phase.weeklyTemplate)) {
      if (day.type && day.type !== 'REST' && 'name' in day) phaseWorkoutTypes.add(day.type)
    }
  }

  if (phaseWorkoutTypes.size > 0) {
    const relevantTypes = [...phaseWorkoutTypes].filter(t => sportWorkoutTypes.includes(t))
    if (relevantTypes.length === 0) {
      score -= 20
      details.push('⚠ No sport-appropriate workout types found')
    } else {
      details.push(`Sport-appropriate workout types: ${relevantTypes.join(', ')}`)
    }
  }

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.sportSpecificCorrectness, details }
}

/**
 * Gym-specific sport correctness: check for set/rep schemes, exercise names,
 * split patterns, and compound movements.
 */
function scoreGymSportSpecific(
  program: ParsedProgram,
  context: EvaluationContext,
  combinedText: string
): CriterionResult {
  const details: string[] = []
  let score = 100

  // Check for set/rep scheme mentions
  const setRepPatterns = [
    /\d+\s*[x×]\s*\d+/,                       // "3x10", "4×8"
    /set|reps?|repetition/i,                    // "3 sets", "8 reps"
    /serie/i,                                   // Swedish: "3 serier"
  ]
  const hasSetRep = setRepPatterns.some(p => p.test(combinedText))
  if (hasSetRep) {
    details.push('Set/rep schemes detected')
  } else {
    score -= 25
    details.push('⚠ No set/rep schemes found — gym programs must specify sets and reps')
  }

  // Check for compound exercise names
  const compoundKeywords = [
    'squat', 'knäböj', 'bänkpress', 'bench', 'marklyft', 'deadlift',
    'press', 'rodd', 'row', 'chins', 'pull-up', 'pullup',
    'hip thrust', 'rdl', 'utfall', 'lunge', 'split squat',
  ]
  const foundCompounds = compoundKeywords.filter(kw => combinedText.includes(kw))
  if (foundCompounds.length >= 3) {
    details.push(`Compound exercises: ${foundCompounds.slice(0, 5).join(', ')}`)
  } else if (foundCompounds.length >= 1) {
    score -= 10
    details.push(`⚠ Few compound exercises (${foundCompounds.length}) — expect more variety`)
  } else {
    score -= 25
    details.push('⚠ No compound exercises found')
  }

  // Check for split pattern mentions
  const splitKeywords = [
    'helbod', 'fullbod', 'full body', 'helkropp',
    'upper', 'lower', 'överkropp', 'underkropp',
    'push', 'pull', 'legs', 'ppl',
    'a-pass', 'b-pass', 'dag a', 'dag b',
  ]
  const foundSplits = splitKeywords.filter(kw => combinedText.includes(kw))
  if (foundSplits.length > 0) {
    details.push(`Split pattern detected: ${foundSplits.slice(0, 3).join(', ')}`)
  } else {
    score -= 10
    details.push('⚠ No recognizable split pattern (full body, upper/lower, PPL)')
  }

  // Check for RPE/RIR or %1RM mentions (intensity prescription)
  const intensityPrescription = combinedText.match(/rpe|rir|1rm|%.*rm|procent.*max/)
  if (intensityPrescription) {
    details.push('Intensity prescription (RPE/RIR/%1RM) detected')
  }

  // Check for advanced method mentions (bonus, not penalized if absent)
  const advancedMethods = [
    'wave', 'våg', 'cluster', 'myo-rep', 'rest-pause', 'drop.?set',
    'superset', 'dup', 'undul', 'tempo.*\\d', 'pause.*rep',
  ]
  const foundMethods = advancedMethods.filter(m => new RegExp(m, 'i').test(combinedText))
  if (foundMethods.length > 0) {
    details.push(`Advanced methods: ${foundMethods.slice(0, 3).join(', ')}`)
  }

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.sportSpecificCorrectness, details }
}

// ── Criterion 5: Calendar Compliance (10%) ──────────────────────────

function scoreCalendarCompliance(
  program: ParsedProgram,
  context: EvaluationContext
): CriterionResult {
  const details: string[] = []
  let score = 100

  if (!context.calendarConstraints) {
    details.push('No calendar constraints to check')
    return { score: 100, weight: DEFAULT_WEIGHTS.calendarCompliance, details }
  }

  const { blockedDates, reducedDates } = context.calendarConstraints

  // We can't check exact date mapping without start date,
  // but we check if the program mentions calendar awareness
  const combinedText = getAllWorkoutDescriptions(program).join(' ').toLowerCase()

  if (blockedDates && blockedDates.length > 0) {
    const mentionsBlocked = combinedText.match(/vila|ledig|blocked|fri|paus|break/)
    if (mentionsBlocked) {
      details.push('Program mentions rest/blocked periods')
    } else {
      score -= 20
      details.push('⚠ Blocked dates specified but no rest/break mentions found')
    }
  }

  if (reducedDates && reducedDates.length > 0) {
    const mentionsReduced = combinedText.match(/reducera|lätt|anpass|lägre|reduced/)
    if (mentionsReduced) {
      details.push('Program mentions reduced load periods')
    } else {
      score -= 15
      details.push('⚠ Reduced dates specified but no load reduction mentions found')
    }
  }

  // Check altitude periods
  if (context.calendarConstraints.altitudePeriods?.length) {
    const mentionsAltitude = combinedText.match(/höjd|altitude|acclimat/)
    if (mentionsAltitude) {
      details.push('Program mentions altitude training')
    } else {
      score -= 15
      details.push('⚠ Altitude periods specified but not referenced')
    }
  }

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.calendarCompliance, details }
}

// ── Criterion 6: Injury Awareness (5%) ──────────────────────────────

function scoreInjuryAwareness(
  program: ParsedProgram,
  context: EvaluationContext
): CriterionResult {
  const details: string[] = []
  let score = 100

  if (!context.injuries || context.injuries.length === 0) {
    details.push('No injuries in context')
    return { score: 100, weight: DEFAULT_WEIGHTS.injuryAwareness, details }
  }

  const combinedText = getAllWorkoutDescriptions(program).join(' ').toLowerCase()

  // Swedish and English injury-related keywords
  const injuryKeywords = [
    'anpassning', 'anpassad', 'skada', 'smärta', 'modifi',
    'alternativ', 'undvik', 'försiktig', 'rehab', 'prevent',
    'injury', 'pain', 'adapt', 'avoid', 'careful'
  ]

  const foundKeywords = injuryKeywords.filter(kw => combinedText.includes(kw))

  if (foundKeywords.length >= 2) {
    details.push(`Injury awareness detected (keywords: ${foundKeywords.join(', ')})`)
  } else if (foundKeywords.length === 1) {
    score -= 20
    details.push('⚠ Minimal injury awareness (only 1 keyword found)')
  } else {
    score -= 50
    details.push('⚠ No injury adaptation found despite active injuries')
  }

  // Check for specific body part mentions
  for (const injury of context.injuries) {
    const bodyPartLower = injury.bodyPart.toLowerCase()
    if (combinedText.includes(bodyPartLower)) {
      details.push(`Mentions ${injury.bodyPart}`)
    } else if (injury.painLevel >= 4) {
      score -= 15
      details.push(`⚠ High-pain injury (${injury.bodyPart}, pain ${injury.painLevel}) not addressed`)
    }
  }

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.injuryAwareness, details }
}

// ── Criterion 7: Periodization Quality (10%) ────────────────────────

function scorePeriodizationQuality(
  program: ParsedProgram,
  context: EvaluationContext
): CriterionResult {
  const details: string[] = []
  let score = 100

  if (program.phases.length === 0) {
    details.push('⚠ No phases defined')
    return { score: 0, weight: DEFAULT_WEIGHTS.periodizationQuality, details }
  }

  const phases = classifyPhases(program.phases)

  // Check logical phase sequence
  const phaseTypeOrder = ['BASE', 'BUILD', 'PEAK', 'TAPER', 'RECOVERY']
  const orderedTypes = phases.map(p => p.type)

  // Must start with BASE or BUILD
  if (orderedTypes[0] !== 'BASE' && orderedTypes[0] !== 'BUILD') {
    score -= 10
    details.push('⚠ Program should start with Base or Build phase')
  }

  // Check phase durations are reasonable
  for (const phase of phases) {
    const weeks = phase.weekCount
    if (phase.type === 'BASE' && weeks < 2) {
      score -= 10
      details.push(`⚠ Base phase too short (${weeks} weeks)`)
    }
    if (phase.type === 'TAPER' && weeks > 4) {
      score -= 10
      details.push(`⚠ Taper phase too long (${weeks} weeks)`)
    }
    if (phase.type === 'PEAK' && weeks > 4) {
      score -= 5
      details.push(`⚠ Peak phase quite long (${weeks} weeks)`)
    }
  }

  // Check total covered weeks
  const totalPhaseWeeks = phases.reduce((sum, p) => sum + p.weekCount, 0)
  if (totalPhaseWeeks < context.totalWeeks) {
    score -= 10
    details.push(`⚠ Phases cover ${totalPhaseWeeks} weeks, expected ${context.totalWeeks}`)
  }

  // Minimum phases for longer programs
  if (context.totalWeeks >= 8 && program.phases.length < 2) {
    score -= 15
    details.push('⚠ Only 1 phase for 8+ week program')
  }
  if (context.totalWeeks >= 16 && program.phases.length < 3) {
    score -= 10
    details.push('⚠ Only 2 phases for 16+ week program')
  }

  // Positive: good variety of phases
  const uniqueTypes = new Set(orderedTypes)
  if (uniqueTypes.size >= 3) {
    details.push(`Good phase variety: ${[...uniqueTypes].join(', ')}`)
  }

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.periodizationQuality, details }
}

// ── Criterion 8: Segment Detail (10%) ───────────────────────────────

function scoreSegmentDetail(program: ParsedProgram): CriterionResult {
  const details: string[] = []
  let score = 100

  let totalWorkouts = 0
  let workoutsWithSegments = 0
  let workoutsWithWarmup = 0
  let workoutsWithCooldown = 0
  let workoutsWithTargets = 0

  for (const phase of program.phases) {
    if (!phase.weeklyTemplate) continue
    for (const rawDay of Object.values(phase.weeklyTemplate)) {
      if (rawDay.type === 'REST') continue
      const day = rawDay as { type: string; segments?: Array<{ type: string; zone?: number; pace?: string; power?: number; heartRate?: string; description?: string; notes?: string }>; [key: string]: unknown }
      totalWorkouts++

      if (day.segments && day.segments.length > 0) {
        workoutsWithSegments++

        const hasWarmup = day.segments.some(
          (s: { type: string }) => s.type === 'warmup'
        )
        const hasCooldown = day.segments.some(
          (s: { type: string }) => s.type === 'cooldown'
        )
        const hasTargets = day.segments.some(
          (s: { zone?: number; pace?: string; power?: number; heartRate?: string }) =>
            s.zone || s.pace || s.power || s.heartRate
        )

        if (hasWarmup) workoutsWithWarmup++
        if (hasCooldown) workoutsWithCooldown++
        if (hasTargets) workoutsWithTargets++
      }
    }
  }

  if (totalWorkouts === 0) {
    details.push('⚠ No workouts to analyze')
    return { score: 30, weight: DEFAULT_WEIGHTS.segmentDetail, details }
  }

  const segmentRatio = workoutsWithSegments / totalWorkouts
  if (segmentRatio >= 0.7) {
    details.push(`${Math.round(segmentRatio * 100)}% of workouts have detailed segments`)
  } else if (segmentRatio >= 0.3) {
    score -= 20
    details.push(`⚠ Only ${Math.round(segmentRatio * 100)}% of workouts have segments`)
  } else {
    score -= 40
    details.push(`⚠ Very few workouts have segments (${Math.round(segmentRatio * 100)}%)`)
  }

  // Warmup/cooldown presence
  if (workoutsWithSegments > 0) {
    const warmupRatio = workoutsWithWarmup / workoutsWithSegments
    if (warmupRatio < 0.5) {
      score -= 10
      details.push('⚠ Less than half of segmented workouts have warmup')
    }
    const cooldownRatio = workoutsWithCooldown / workoutsWithSegments
    if (cooldownRatio < 0.3) {
      score -= 10
      details.push('⚠ Few segmented workouts have cooldown')
    }
  }

  // Specific targets in segments
  if (workoutsWithTargets > 0) {
    const targetRatio = workoutsWithTargets / Math.max(workoutsWithSegments, 1)
    details.push(`${Math.round(targetRatio * 100)}% of segmented workouts have specific targets`)
  } else if (workoutsWithSegments > 0) {
    score -= 15
    details.push('⚠ No segments have specific targets (zone/pace/power/HR)')
  }

  return { score: Math.max(0, score), weight: DEFAULT_WEIGHTS.segmentDetail, details }
}

// ── Helpers ─────────────────────────────────────────────────────────

interface ClassifiedPhase {
  phase: ParsedPhase
  type: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION'
  weekCount: number
}

function classifyPhases(phases: ParsedPhase[]): ClassifiedPhase[] {
  return phases.map(phase => {
    const [startStr, endStr] = phase.weeks.split('-')
    const start = parseInt(startStr)
    const end = endStr ? parseInt(endStr) : start
    const weekCount = isNaN(start) || isNaN(end) ? 1 : end - start + 1

    return {
      phase,
      type: mapToPeriodPhase(phase.name),
      weekCount,
    }
  })
}

function mapToPeriodPhase(
  phaseName: string
): 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION' {
  const normalized = phaseName.toUpperCase().trim()

  if (['BASE', 'BUILD', 'PEAK', 'TAPER', 'RECOVERY', 'TRANSITION'].includes(normalized)) {
    return normalized as 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION'
  }

  if (normalized.includes('BAS') || normalized.includes('GRUND') || normalized.includes('AEROB')) return 'BASE'
  if (normalized.includes('BYGG') || normalized.includes('BUILD') || normalized.includes('UTVECKL')) return 'BUILD'
  if (normalized.includes('PEAK') || normalized.includes('TOPP') || normalized.includes('SPECIFIC') || normalized.includes('TÄVLING')) return 'PEAK'
  if (normalized.includes('TAPER') || normalized.includes('NEDTRAPP') || normalized.includes('VILA')) return 'TAPER'
  if (normalized.includes('RECOVER') || normalized.includes('ÅTERHÄMT') || normalized.includes('DELOAD') || normalized.includes('AVLAST')) return 'RECOVERY'
  if (normalized.includes('TRANS') || normalized.includes('OFF')) return 'TRANSITION'

  return 'BASE'
}

function categorizeIntensity(
  workout: { intensity?: string; zone?: string | number; description: string }
): 'low' | 'moderate' | 'high' {
  // Check explicit intensity field
  if (workout.intensity) {
    const i = workout.intensity.toLowerCase()
    if (['recovery', 'easy'].includes(i)) return 'low'
    if (['moderate', 'threshold'].includes(i)) return 'moderate'
    if (['interval', 'max', 'hard', 'race_pace', 'heavy'].includes(i)) return 'high'
  }

  // Check zone
  if (workout.zone) {
    const zone = typeof workout.zone === 'string' ? parseInt(workout.zone) : workout.zone
    if (zone <= 2) return 'low'
    if (zone <= 3) return 'moderate'
    return 'high'
  }

  // Keyword-based classification from description
  const desc = workout.description?.toLowerCase() || ''

  // Gym-specific high intensity keywords
  if (desc.match(/tungt|heavy|maxstyrka|max.*styrka|power|explosiv|1rm|tung/i)) return 'high'
  // Endurance high intensity keywords
  if (desc.match(/interval|VO2|fart|sprint|max|hög|tempo/i)) return 'high'

  // Gym moderate keywords
  if (desc.match(/hypertrofi|moderate|medel|8-12|10-12/i)) return 'moderate'
  // Endurance moderate keywords
  if (desc.match(/tröskel|threshold|tempo|medel/i)) return 'moderate'

  // Gym low/deload keywords
  if (desc.match(/deload|lätt|avlast|återhämt|aa|anatomisk/i)) return 'low'

  return 'low'
}

function getAllWorkoutDescriptions(program: ParsedProgram): string[] {
  const descriptions: string[] = []
  for (const phase of program.phases) {
    if (phase.focus) descriptions.push(phase.focus)
    if (phase.notes) descriptions.push(phase.notes)
    if (phase.keyWorkouts) descriptions.push(...phase.keyWorkouts)
    if (phase.volumeGuidance) descriptions.push(phase.volumeGuidance)
    if (!phase.weeklyTemplate) continue
    for (const day of Object.values(phase.weeklyTemplate)) {
      if ('description' in day && day.description) descriptions.push(day.description)
      if ('name' in day && day.name) descriptions.push(day.name as string)
      if ('notes' in day && day.notes) descriptions.push(day.notes as string)
      if ('segments' in day && day.segments) {
        for (const seg of day.segments) {
          if (seg.description) descriptions.push(seg.description)
          if ('notes' in seg && seg.notes) descriptions.push(seg.notes as string)
        }
      }
    }
  }
  return descriptions
}

function extractKeywords(sessionType: string): string[] {
  // Extract meaningful words from session type descriptions like "Långpass (90-150 min, Zon 1-2)"
  return sessionType
    .replace(/\(.*?\)/g, '') // remove parentheticals
    .split(/[\s,]+/)
    .filter(w => w.length > 3)
    .map(w => w.toLowerCase())
}

function getSportWorkoutTypes(sport: SportType): string[] {
  const mapping: Partial<Record<SportType, string[]>> = {
    RUNNING: ['RUNNING', 'STRENGTH', 'CROSS_TRAINING', 'CORE', 'PLYOMETRIC'],
    CYCLING: ['CYCLING', 'STRENGTH', 'CORE', 'CROSS_TRAINING'],
    SWIMMING: ['SWIMMING', 'STRENGTH', 'CORE'],
    TRIATHLON: ['RUNNING', 'CYCLING', 'SWIMMING', 'STRENGTH', 'CORE'],
    SKIING: ['SKIING', 'RUNNING', 'STRENGTH', 'CORE'],
    HYROX: ['HYROX', 'RUNNING', 'STRENGTH', 'CORE', 'CROSS_TRAINING'],
    STRENGTH: ['STRENGTH', 'CORE', 'PLYOMETRIC'],
    GENERAL_FITNESS: ['STRENGTH', 'RUNNING', 'CYCLING', 'CORE', 'CROSS_TRAINING'],
    FUNCTIONAL_FITNESS: ['STRENGTH', 'CROSS_TRAINING', 'CORE', 'PLYOMETRIC'],
    TEAM_FOOTBALL: ['RUNNING', 'STRENGTH', 'PLYOMETRIC', 'CORE'],
    TEAM_ICE_HOCKEY: ['RUNNING', 'STRENGTH', 'PLYOMETRIC', 'CORE', 'CYCLING'],
    TEAM_HANDBALL: ['RUNNING', 'STRENGTH', 'PLYOMETRIC', 'CORE'],
    TEAM_FLOORBALL: ['RUNNING', 'STRENGTH', 'CORE', 'PLYOMETRIC'],
    TEAM_BASKETBALL: ['RUNNING', 'STRENGTH', 'PLYOMETRIC', 'CORE'],
    TEAM_VOLLEYBALL: ['STRENGTH', 'PLYOMETRIC', 'CORE'],
    TENNIS: ['RUNNING', 'STRENGTH', 'PLYOMETRIC', 'CORE'],
    PADEL: ['RUNNING', 'STRENGTH', 'CORE'],
  }
  return mapping[sport] || ['STRENGTH', 'RUNNING', 'CORE']
}
