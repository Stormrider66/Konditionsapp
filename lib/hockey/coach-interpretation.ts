import type { HockeyQualityFlag } from '@/lib/hockey/test-quality'

export type HockeyCoachInterpretationTone = 'priority' | 'watch' | 'maintain' | 'quality' | 'positive'

export interface HockeyCoachInterpretationInput {
  latest: {
    metrics: Record<string, number | null>
    qualityFlags?: HockeyQualityFlag[]
  } | null
  trends: Array<{
    key: string
    delta: number
    percentChange: number | null
    isImprovement: boolean
  }>
  readiness?: {
    nextLevel?: {
      level: string
      score: number | null
      primaryGap: {
        label: string
        gapToTarget: number
        unit: string
        lowerIsBetter: boolean
      } | null
    } | null
  } | null
}

export interface HockeyCoachInterpretation {
  id: string
  tone: HockeyCoachInterpretationTone
  title: string
  summary: string
  action: string
  evidence: string[]
}

const METRIC_LABELS: Record<string, string> = {
  muscleLabWkg: 'MuscleLab power',
  sprint10m: '10m ice sprint',
  sprint30m: '30m ice sprint',
  agilityBest: '5-10-5',
  endurance7x40AverageKmh: '7x40 mean speed',
  endurance7x40Resistance: '7x40 fatigue resistance',
  enduranceFatigueDrop: '7x40 fatigue drop',
  backSquat1RM: 'back squat',
  powerClean1RM: 'power clean',
  standingLongJump: 'standing long jump',
  threeJumpBest: '3-step jump',
  vo2Max: 'VO2max',
  lt1SpeedKmh: 'LT1 speed',
  lt2SpeedKmh: 'LT2 speed',
  maxLactate: 'max lactate',
}

function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key
}

function signed(value: number, unit = '', decimals = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function gapAction(gap: NonNullable<NonNullable<HockeyCoachInterpretationInput['readiness']>['nextLevel']>['primaryGap']): string {
  if (!gap) return 'Keep this level in the maintain bucket and look for the next limiting quality.'
  const amount = Math.abs(gap.gapToTarget)
  const decimals = gap.unit === 's' ? 2 : 1
  const direction = gap.lowerIsBetter ? 'reduce' : 'increase'
  return `${direction} ${gap.label.toLowerCase()} by about ${amount.toFixed(decimals)} ${gap.unit} to reach the next target.`
}

export function buildHockeyCoachInterpretations(input: HockeyCoachInterpretationInput): HockeyCoachInterpretation[] {
  const latest = input.latest
  if (!latest) {
    return [{
      id: 'baseline',
      tone: 'watch',
      title: 'Create a baseline',
      summary: 'No hockey test session is available yet, so the cockpit cannot separate strengths, gaps and test-quality issues.',
      action: 'Run the core hockey battery before using readiness or SIMCA decisions.',
      evidence: ['Missing latest hockey test'],
    }]
  }

  const items: HockeyCoachInterpretation[] = []
  const qualityWarnings = latest.qualityFlags?.filter((flag) => flag.severity === 'warning') ?? []
  if (qualityWarnings.length > 0) {
    items.push({
      id: 'quality-check',
      tone: 'quality',
      title: 'Check test quality before deciding training',
      summary: qualityWarnings[0].detail,
      action: 'Confirm protocol, timing gates and side-to-side inputs before treating the result as a true performance change.',
      evidence: qualityWarnings.slice(0, 3).map((flag) => flag.label),
    })
  }

  const nextLevel = input.readiness?.nextLevel ?? null
  if (nextLevel) {
    const primaryGap = nextLevel.primaryGap
    const readyText = nextLevel.score == null ? 'not enough data' : `${nextLevel.score}% ready`
    items.push({
      id: 'next-level-gap',
      tone: primaryGap ? 'priority' : 'maintain',
      title: primaryGap ? `Main gap to ${nextLevel.level}` : `${nextLevel.level} target profile reached`,
      summary: primaryGap
        ? `${primaryGap.label} is the clearest next-level limiter.`
        : `Available metrics meet the ${nextLevel.level} target profile.`,
      action: gapAction(primaryGap),
      evidence: [`${nextLevel.level}: ${readyText}`],
    })
  }

  const negativeTrend = input.trends
    .filter((trend) => !trend.isImprovement)
    .sort((a, b) => Math.abs(b.percentChange ?? b.delta) - Math.abs(a.percentChange ?? a.delta))[0]
  if (negativeTrend) {
    items.push({
      id: `trend-${negativeTrend.key}`,
      tone: 'watch',
      title: `${metricLabel(negativeTrend.key)} is moving the wrong way`,
      summary: `${metricLabel(negativeTrend.key)} changed by ${signed(negativeTrend.delta, '', negativeTrend.key.includes('sprint') || negativeTrend.key.includes('agility') ? 2 : 1)} since last test.`,
      action: 'Check load, recovery and protocol first, then make this a short retest item after the next block.',
      evidence: [
        negativeTrend.percentChange == null
          ? 'No percent change available'
          : `${Math.abs(negativeTrend.percentChange).toFixed(1)}% change`,
      ],
    })
  }

  const positiveTrends = input.trends.filter((trend) => trend.isImprovement)
  if (positiveTrends.length > 0) {
    const top = positiveTrends
      .sort((a, b) => Math.abs(b.percentChange ?? b.delta) - Math.abs(a.percentChange ?? a.delta))[0]
    items.push({
      id: `positive-${top.key}`,
      tone: 'positive',
      title: `Keep the stimulus that improved ${metricLabel(top.key)}`,
      summary: `${metricLabel(top.key)} is the strongest positive signal since the previous hockey test.`,
      action: 'Keep the dose that produced the change and only progress one main variable at a time.',
      evidence: [
        top.percentChange == null
          ? signed(top.delta)
          : `${signed(top.percentChange, '%', 1)}`,
      ],
    })
  }

  const fatigueDrop = latest.metrics.enduranceFatigueDrop
  const resistance = latest.metrics.endurance7x40Resistance
  const vo2 = latest.metrics.vo2Max
  const lt1Speed = latest.metrics.lt1SpeedKmh
  const lt2Speed = latest.metrics.lt2SpeedKmh
  const lt2HeartRate = latest.metrics.lt2HeartRate
  const maxLactate = latest.metrics.maxLactate
  const vo2Trend = input.trends.find((trend) => trend.key === 'vo2Max')
  const lt2Trend = input.trends.find((trend) => trend.key === 'lt2SpeedKmh')

  if (vo2 == null && lt2Speed == null && latest.metrics.beepScore == null) {
    items.push({
      id: 'aerobic-baseline-missing',
      tone: 'watch',
      title: 'Add one aerobic anchor',
      summary: 'This profile has no VO2max, LT2 speed or beep-test anchor, so conditioning decisions lean heavily on repeated-sprint data.',
      action: 'Add either the lab/ramp fields or a beep/YoYo-style field at the next test so aerobic capacity can be tracked across seasons.',
      evidence: ['VO2max missing', 'LT2 speed missing'],
    })
  }

  if (lt2Trend?.isImprovement && (!vo2Trend || Math.abs(vo2Trend.percentChange ?? 0) < 1)) {
    items.push({
      id: 'lt2-efficiency-gain',
      tone: 'positive',
      title: 'LT2 improved without a clear VO2max jump',
      summary: 'The useful threshold speed is moving while VO2max is stable or unavailable, which usually points to better aerobic efficiency.',
      action: 'Keep the sub-threshold and threshold dose, then check whether repeated-sprint average speed follows in the next hockey test.',
      evidence: [
        `LT2 ${signed(lt2Trend.delta, 'km/h', 1)}`,
        vo2Trend ? `VO2max ${signed(vo2Trend.delta, 'ml/kg/min', 1)}` : 'VO2max trend unavailable',
      ],
    })
  }

  if (lt1Speed != null && lt2Speed != null && lt2Speed - lt1Speed < 1) {
    items.push({
      id: 'threshold-band-narrow',
      tone: 'watch',
      title: 'LT1-LT2 speed band is narrow',
      summary: `LT1 and LT2 are only ${(lt2Speed - lt1Speed).toFixed(1)} km/h apart, so easy and threshold intensities may be too close in practice.`,
      action: 'Separate low-intensity aerobic work from threshold work and re-check lactate/HR stability on the next ramp.',
      evidence: [
        `LT1 ${lt1Speed.toFixed(1)} km/h`,
        `LT2 ${lt2Speed.toFixed(1)} km/h`,
      ],
    })
  }

  if (maxLactate != null && maxLactate >= 13) {
    items.push({
      id: 'high-lactate-profile',
      tone: 'maintain',
      title: 'High lactate ceiling supports repeated high-power shifts',
      summary: `Max lactate is ${maxLactate.toFixed(1)} mmol/L, which suggests strong anaerobic contribution when the test was maximal.`,
      action: 'Pair this with 7x40 drop and shift-recovery data so the player can use the ceiling without losing repeat quality.',
      evidence: [
        lt2HeartRate == null ? 'LT2 HR unavailable' : `LT2 HR ${lt2HeartRate.toFixed(0)} bpm`,
      ],
    })
  } else if (maxLactate != null && maxLactate < 8) {
    items.push({
      id: 'low-lactate-profile',
      tone: 'watch',
      title: 'Low max lactate needs context',
      summary: `Max lactate is ${maxLactate.toFixed(1)} mmol/L, which can mean an aerobic-leaning profile or that the ramp was not truly maximal.`,
      action: 'Check max HR, RPE and test termination reason before using this as a fiber-profile signal.',
      evidence: [
        latest.metrics.maxHeartRate == null ? 'Max HR unavailable' : `Max HR ${latest.metrics.maxHeartRate.toFixed(0)} bpm`,
      ],
    })
  }

  if (fatigueDrop != null && fatigueDrop >= 8) {
    items.push({
      id: 'repeated-sprint-fatigue',
      tone: 'priority',
      title: 'Repeated-sprint drop is the conditioning priority',
      summary: `The 7x40 profile drops ${fatigueDrop.toFixed(1)}%, which suggests speed is not being held across the set.`,
      action: 'Use repeated shift intervals and track whether average speed rises without a larger first-to-last drop.',
      evidence: [
        resistance == null ? 'Fatigue resistance unavailable' : `Fatigue resistance ${resistance.toFixed(0)}%`,
      ],
    })
  }

  if (items.length === 0) {
    items.push({
      id: 'maintain-profile',
      tone: 'maintain',
      title: 'Maintain current profile',
      summary: 'No major quality issue, regression or next-level gap stands out from the available data.',
      action: 'Keep the current block and retest the key hockey battery after the next training phase.',
      evidence: ['No major flags from latest test'],
    })
  }

  return items.slice(0, 5)
}
