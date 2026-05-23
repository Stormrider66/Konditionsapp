import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const MODEL_TYPE = 'wod_generation_strategy'

export type WODResearchScenario = {
  id: string
  name: string
  sport: string
  experienceLevel: string
  workoutType: string
  readiness: 'low' | 'moderate' | 'high'
  equipment: string[]
  hasInjuryRestriction: boolean
  desiredSignal: string
}

export type WODStrategyEvaluation = {
  score: number
  safetyScore: number
  scenarioScores: Record<string, number>
  warnings: string[]
}

export type WODAutoresearchRun = {
  runId: string
  decision: 'KEEP' | 'DISCARD'
  candidateVariantId: string
  baselineVariantId: string | null
  candidateScore: number
  baselineScore: number
  safetyDelta: number
  scenarioCount: number
}

export const WOD_RESEARCH_SCENARIOS: WODResearchScenario[] = [
  {
    id: 'beginner-limited-equipment',
    name: 'Beginner limited equipment',
    sport: 'GENERAL_FITNESS',
    experienceLevel: 'BEGINNER',
    workoutType: 'strength',
    readiness: 'moderate',
    equipment: ['none', 'resistance_band'],
    hasInjuryRestriction: false,
    desiredSignal: 'simple accessible progression',
  },
  {
    id: 'elite-endurance-low-readiness',
    name: 'Elite endurance low readiness',
    sport: 'RUNNING',
    experienceLevel: 'ELITE',
    workoutType: 'cardio',
    readiness: 'low',
    equipment: ['none', 'treadmill'],
    hasInjuryRestriction: false,
    desiredSignal: 'protect recovery while preserving aerobic value',
  },
  {
    id: 'hyrox-functional-candidate',
    name: 'HYROX functional athlete',
    sport: 'HYROX',
    experienceLevel: 'ADVANCED',
    workoutType: 'mixed',
    readiness: 'high',
    equipment: ['rower', 'sled', 'wall_ball', 'kettlebell'],
    hasInjuryRestriction: false,
    desiredSignal: 'station-specific variety with controlled intensity',
  },
  {
    id: 'team-sport-injury-restricted',
    name: 'Team sport injury restricted',
    sport: 'TEAM_ICE_HOCKEY',
    experienceLevel: 'INTERMEDIATE',
    workoutType: 'core',
    readiness: 'moderate',
    equipment: ['none', 'resistance_band'],
    hasInjuryRestriction: true,
    desiredSignal: 'strict restriction handling and low-risk trunk work',
  },
]

export async function runWODAutoresearchIteration(): Promise<WODAutoresearchRun> {
  const baseline = await ensureActiveWODStrategyVariant()
  const anonymousLessons = await prisma.wODGlobalLearningAggregate.findMany({
    where: {
      sampleSize: { gte: 10 },
    },
    orderBy: { sampleSize: 'desc' },
    take: 5,
  })
  const candidatePrompt = buildCandidateStrategyPrompt(
    baseline.promptTemplate || BASELINE_WOD_STRATEGY_PROMPT,
    anonymousLessons.map((lesson) => lesson.promptSummary).filter((summary): summary is string => !!summary),
  )
  const baselineEval = evaluateWODStrategyPrompt(baseline.promptTemplate || BASELINE_WOD_STRATEGY_PROMPT)
  const candidateEval = evaluateWODStrategyPrompt(candidatePrompt)
  const safetyDelta = candidateEval.safetyScore - baselineEval.safetyScore
  const decision = candidateEval.score >= baselineEval.score && safetyDelta >= 0 ? 'KEEP' : 'DISCARD'
  const candidate = await createWODStrategyVariant({
    promptTemplate: candidatePrompt,
    parentId: baseline.id,
    status: decision === 'KEEP' ? 'ACTIVE' : 'DEPRECATED',
    score: candidateEval.score,
    evaluation: candidateEval,
  })

  if (decision === 'KEEP') {
    await prisma.aIModelVersion.updateMany({
      where: {
        modelType: MODEL_TYPE,
        status: 'ACTIVE',
        id: { not: candidate.id },
      },
      data: {
        status: 'DEPRECATED',
        deprecatedAt: new Date(),
      },
    })
  }

  const runId = `wod_iter_${Date.now()}`
  await prisma.accuracySnapshot.create({
    data: {
      periodStart: new Date(),
      periodEnd: new Date(),
      snapshotType: 'wod_auto_optimize_iteration',
      programOutcomes: {
        type: 'wod_auto_optimize',
        runId,
        baselineId: baseline.id,
        candidateId: candidate.id,
        decision,
        baselineScore: baselineEval.score,
        candidateScore: candidateEval.score,
        safetyDelta,
        scenarioScores: candidateEval.scenarioScores,
      } as Prisma.InputJsonValue,
      overallSampleSize: WOD_RESEARCH_SCENARIOS.length,
      overallAccuracy: candidateEval.score,
      confidenceLevel: Math.min(0.95, 0.55 + WOD_RESEARCH_SCENARIOS.length * 0.05),
    },
  })

  return {
    runId,
    decision,
    candidateVariantId: candidate.id,
    baselineVariantId: baseline.id,
    candidateScore: candidateEval.score,
    baselineScore: baselineEval.score,
    safetyDelta,
    scenarioCount: WOD_RESEARCH_SCENARIOS.length,
  }
}

export function evaluateWODStrategyPrompt(prompt: string): WODStrategyEvaluation {
  const normalized = prompt.toLowerCase()
  const warnings: string[] = []
  const scenarioScores: Record<string, number> = {}
  let safetyTotal = 0

  for (const scenario of WOD_RESEARCH_SCENARIOS) {
    let score = 55
    let safety = 70
    if (normalized.includes('safety') || normalized.includes('säkerhet')) safety += 10
    if (normalized.includes('injury') || normalized.includes('restriction') || normalized.includes('skada')) safety += 10
    if (scenario.hasInjuryRestriction && !(normalized.includes('veto') || normalized.includes('never override') || normalized.includes('strict'))) {
      safety -= 25
      warnings.push(`${scenario.id}: missing strict restriction language`)
    }
    if (normalized.includes('personal learning') || normalized.includes('personlig inlärning')) score += 12
    if (normalized.includes('anonymous') || normalized.includes('cohort') || normalized.includes('anonym')) score += 7
    if (normalized.includes('3') && normalized.includes('candidate')) score += 8
    if (normalized.includes('readiness')) score += scenario.readiness === 'low' ? 10 : 5
    if (normalized.includes('equipment')) score += 5
    if (normalized.includes(scenario.workoutType)) score += 4
    if (scenario.experienceLevel === 'BEGINNER' && normalized.includes('beginner')) score += 4
    if (scenario.experienceLevel === 'ELITE' && normalized.includes('elite')) score += 4
    if (normalized.includes('rpe')) score += 4

    safety = clamp(safety, 0, 100)
    safetyTotal += safety
    scenarioScores[scenario.id] = clamp(Math.round(score * 0.7 + safety * 0.3), 0, 100)
  }

  const score = average(Object.values(scenarioScores))
  const safetyScore = Math.round(safetyTotal / WOD_RESEARCH_SCENARIOS.length)

  return {
    score,
    safetyScore,
    scenarioScores,
    warnings,
  }
}

async function ensureActiveWODStrategyVariant() {
  const active = await prisma.aIModelVersion.findFirst({
    where: {
      modelType: MODEL_TYPE,
      status: 'ACTIVE',
    },
    orderBy: { versionNumber: 'desc' },
  })
  if (active) return active

  return createWODStrategyVariant({
    promptTemplate: BASELINE_WOD_STRATEGY_PROMPT,
    status: 'ACTIVE',
    score: evaluateWODStrategyPrompt(BASELINE_WOD_STRATEGY_PROMPT).score,
  })
}

async function createWODStrategyVariant(input: {
  promptTemplate: string
  parentId?: string
  status: 'ACTIVE' | 'DEPRECATED'
  score: number
  evaluation?: WODStrategyEvaluation
}) {
  const lastVersion = await prisma.aIModelVersion.findFirst({
    where: { modelType: MODEL_TYPE },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  })
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1
  return prisma.aIModelVersion.create({
    data: {
      versionName: `wod-strategy-v${versionNumber}`,
      versionNumber,
      modelType: MODEL_TYPE,
      promptTemplate: input.promptTemplate,
      status: input.status,
      overallAccuracy: input.score,
      deployedAt: input.status === 'ACTIVE' ? new Date() : null,
      deprecatedAt: input.status === 'DEPRECATED' ? new Date() : null,
      previousVersionId: input.parentId,
      parameters: {
        source: 'wod_autoresearch',
        evaluation: input.evaluation ?? null,
      } as Prisma.InputJsonValue,
    },
  })
}

function buildCandidateStrategyPrompt(baseline: string, lessons: string[]): string {
  const lessonBlock = lessons.length > 0
    ? lessons.map((lesson) => `- ${lesson}`).join('\n')
    : '- No mature anonymous cohort lessons yet; rely on personal learning and guardrails.'

  return `${baseline}

## SELF-LEARNING STRATEGY UPDATE
- Generate exactly 3 candidate blueprints before expanding the final WOD.
- Personal learning has priority over anonymous cohort patterns.
- Use anonymous cohort patterns only as weak hints and only when they do not conflict with the athlete profile.
- Keep safety, injury restrictions, fatigue guardrails, equipment limits, and readiness limits as hard vetoes.
- Calibrate difficulty with RPE feedback, repeat intent, enjoyment, and next-day recovery signals.
- Beginner athletes need simpler structure and clearer instructions; elite athletes need sharper specificity without excess load.

## CURRENT ANONYMOUS LESSONS
${lessonBlock}`
}

const BASELINE_WOD_STRATEGY_PROMPT = `Dagens pass strategy:
- Safety first. Never override injuries, physio restrictions, fatigue reductions, or equipment constraints.
- Generate 3 candidate blueprints, score locally, and expand only the best candidate.
- Prioritize personal learning from the athlete's own feedback before anonymous cohort learning.
- Use readiness, RPE, enjoyment, repeat intent, and completion behavior to tune future workouts.
- Adapt across beginner, recreational, advanced, and elite athletes.
- Keep workouts clear, useful, and matched to the requested duration.`

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
