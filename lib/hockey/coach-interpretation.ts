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
  focusArea: 'test-quality' | 'readiness' | 'speed' | 'power' | 'aerobic' | 'repeated-sprint' | 'strength' | 'maintenance'
  title: string
  summary: string
  action: string
  trainingBlock: string
  retest: string
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
      focusArea: 'test-quality',
      title: 'Create a baseline',
      summary: 'No hockey test session is available yet, so the cockpit cannot separate strengths, gaps and test-quality issues.',
      action: 'Run the core hockey battery before using readiness or SIMCA decisions.',
      trainingBlock: 'Collect the same core battery for every player before comparing groups.',
      retest: 'Retest once the full battery has at least one valid result.',
      evidence: ['Missing latest hockey test'],
    }]
  }

  const items: HockeyCoachInterpretation[] = []
  const qualityWarnings = latest.qualityFlags?.filter((flag) => flag.severity === 'warning') ?? []
  if (qualityWarnings.length > 0) {
    items.push({
      id: 'quality-check',
      tone: 'quality',
      focusArea: 'test-quality',
      title: 'Check test quality before deciding training',
      summary: qualityWarnings[0].detail,
      action: 'Confirm protocol, timing gates and side-to-side inputs before treating the result as a true performance change.',
      trainingBlock: 'Do not change training direction from this metric until the protocol is confirmed.',
      retest: 'Repeat the affected test within 7-14 days if the value will steer programming.',
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
      focusArea: 'readiness',
      title: primaryGap ? `Main gap to ${nextLevel.level}` : `${nextLevel.level} target profile reached`,
      summary: primaryGap
        ? `${primaryGap.label} is the clearest next-level limiter.`
        : `Available metrics meet the ${nextLevel.level} target profile.`,
      action: gapAction(primaryGap),
      trainingBlock: primaryGap
        ? 'Make this the main physical theme for the next 4-6 week block while maintaining the player’s stronger qualities.'
        : 'Keep the current profile in maintenance and look for the next tactical or role-specific limiter.',
      retest: primaryGap ? 'Retest this limiter at the end of the block.' : 'Retest the full battery at the next planned checkpoint.',
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
      focusArea: negativeTrend.key.includes('sprint') || negativeTrend.key.includes('agility')
        ? 'speed'
        : negativeTrend.key.includes('vo2') || negativeTrend.key.includes('lt')
          ? 'aerobic'
          : negativeTrend.key.includes('endurance')
            ? 'repeated-sprint'
            : negativeTrend.key.includes('squat') || negativeTrend.key.includes('clean') || negativeTrend.key.includes('bench')
              ? 'strength'
              : 'power',
      title: `${metricLabel(negativeTrend.key)} is moving the wrong way`,
      summary: `${metricLabel(negativeTrend.key)} changed by ${signed(negativeTrend.delta, '', negativeTrend.key.includes('sprint') || negativeTrend.key.includes('agility') ? 2 : 1)} since last test.`,
      action: 'Check load, recovery and protocol first, then make this a short retest item after the next block.',
      trainingBlock: 'Reduce noise first: confirm wellness, ice load and test setup before adding extra volume.',
      retest: 'Use a short retest after 2-3 weeks if the metric affects selection or return-to-play decisions.',
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
      focusArea: top.key.includes('vo2') || top.key.includes('lt')
        ? 'aerobic'
        : top.key.includes('endurance')
          ? 'repeated-sprint'
          : top.key.includes('sprint') || top.key.includes('agility')
            ? 'speed'
            : 'power',
      title: `Keep the stimulus that improved ${metricLabel(top.key)}`,
      summary: `${metricLabel(top.key)} is the strongest positive signal since the previous hockey test.`,
      action: 'Keep the dose that produced the change and only progress one main variable at a time.',
      trainingBlock: 'Maintain the successful stimulus while shifting the largest gap into the priority slot.',
      retest: 'Confirm it holds at the next normal hockey test checkpoint.',
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
      focusArea: 'aerobic',
      title: 'Add one aerobic anchor',
      summary: 'This profile has no VO2max, LT2 speed or beep-test anchor, so conditioning decisions lean heavily on repeated-sprint data.',
      action: 'Add either the lab/ramp fields or a beep/YoYo-style field at the next test so aerobic capacity can be tracked across seasons.',
      trainingBlock: 'Use conservative conditioning zones until an aerobic anchor is available.',
      retest: 'Add VO2/ramp or beep data at the next battery.',
      evidence: ['VO2max missing', 'LT2 speed missing'],
    })
  }

  if (lt2Trend?.isImprovement && (!vo2Trend || Math.abs(vo2Trend.percentChange ?? 0) < 1)) {
    items.push({
      id: 'lt2-efficiency-gain',
      tone: 'positive',
      focusArea: 'aerobic',
      title: 'LT2 improved without a clear VO2max jump',
      summary: 'The useful threshold speed is moving while VO2max is stable or unavailable, which usually points to better aerobic efficiency.',
      action: 'Keep the sub-threshold and threshold dose, then check whether repeated-sprint average speed follows in the next hockey test.',
      trainingBlock: 'Keep 1-2 controlled threshold exposures per week and avoid turning every aerobic day into a hard day.',
      retest: 'Retest LT2 and 7x40 average speed together.',
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
      focusArea: 'aerobic',
      title: 'LT1-LT2 speed band is narrow',
      summary: `LT1 and LT2 are only ${(lt2Speed - lt1Speed).toFixed(1)} km/h apart, so easy and threshold intensities may be too close in practice.`,
      action: 'Separate low-intensity aerobic work from threshold work and re-check lactate/HR stability on the next ramp.',
      trainingBlock: 'Protect true low-intensity work and prescribe threshold by HR/lactate, not only speed.',
      retest: 'Repeat the ramp if lactate stages or HR drift looked unstable.',
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
      focusArea: 'repeated-sprint',
      title: 'High lactate ceiling supports repeated high-power shifts',
      summary: `Max lactate is ${maxLactate.toFixed(1)} mmol/L, which suggests strong anaerobic contribution when the test was maximal.`,
      action: 'Pair this with 7x40 drop and shift-recovery data so the player can use the ceiling without losing repeat quality.',
      trainingBlock: 'Blend high-power repeats with enough recovery to keep quality high.',
      retest: 'Track 7x40 resistance and max lactate together next time.',
      evidence: [
        lt2HeartRate == null ? 'LT2 HR unavailable' : `LT2 HR ${lt2HeartRate.toFixed(0)} bpm`,
      ],
    })
  } else if (maxLactate != null && maxLactate < 8) {
    items.push({
      id: 'low-lactate-profile',
      tone: 'watch',
      focusArea: 'aerobic',
      title: 'Low max lactate needs context',
      summary: `Max lactate is ${maxLactate.toFixed(1)} mmol/L, which can mean an aerobic-leaning profile or that the ramp was not truly maximal.`,
      action: 'Check max HR, RPE and test termination reason before using this as a fiber-profile signal.',
      trainingBlock: 'Avoid assuming poor anaerobic capacity until effort quality is confirmed.',
      retest: 'Repeat max lactate capture if max HR/RPE did not support a maximal test.',
      evidence: [
        latest.metrics.maxHeartRate == null ? 'Max HR unavailable' : `Max HR ${latest.metrics.maxHeartRate.toFixed(0)} bpm`,
      ],
    })
  }

  if (fatigueDrop != null && fatigueDrop >= 8) {
    items.push({
      id: 'repeated-sprint-fatigue',
      tone: 'priority',
      focusArea: 'repeated-sprint',
      title: 'Repeated-sprint drop is the conditioning priority',
      summary: `The 7x40 profile drops ${fatigueDrop.toFixed(1)}%, which suggests speed is not being held across the set.`,
      action: 'Use repeated shift intervals and track whether average speed rises without a larger first-to-last drop.',
      trainingBlock: 'Build with 2-3 sets of repeated 30-45 s work, controlled rest, and strict quality cutoffs.',
      retest: 'Retest 7x40 after 3-5 weeks and compare both mean speed and resistance.',
      evidence: [
        resistance == null ? 'Fatigue resistance unavailable' : `Fatigue resistance ${resistance.toFixed(0)}%`,
      ],
    })
  }

  if (items.length === 0) {
    items.push({
      id: 'maintain-profile',
      tone: 'maintain',
      focusArea: 'maintenance',
      title: 'Maintain current profile',
      summary: 'No major quality issue, regression or next-level gap stands out from the available data.',
      action: 'Keep the current block and retest the key hockey battery after the next training phase.',
      trainingBlock: 'Use maintenance dosing and let tactical/ice priorities drive the week.',
      retest: 'Retest at the next normal team checkpoint.',
      evidence: ['No major flags from latest test'],
    })
  }

  return items.slice(0, 5)
}
