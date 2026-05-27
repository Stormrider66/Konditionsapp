export type HockeyBenchmarkBand = 'top' | 'above' | 'team' | 'watch' | 'priority'
type AppLocale = 'en' | 'sv'

export interface HockeyActionMetric {
  key: string
  label: string
  unit: string
  lowerIsBetter?: boolean
}

export interface HockeyActionAthlete {
  id: string
  name: string
  latestTestDate: string | null
  metrics: Record<string, number | null>
  benchmarks: Record<string, {
    zScore: number | null
    percentile: number | null
    positionZScore: number | null
    positionPercentile: number | null
    positionRank: number | null
    positionCoverage: number
    band: HockeyBenchmarkBand
  } | null>
}

export interface HockeyActionHistoryMetric extends HockeyActionMetric {
  athletes: Array<{
    id: string
    name: string
    delta: number | null
  }>
}

export interface HockeyActionPlanData {
  metrics: HockeyActionMetric[]
  athletes: HockeyActionAthlete[]
  history: HockeyActionHistoryMetric[]
}

export interface HockeyActionItem {
  id: string
  title: string
  description: string
  athletes: Array<{ id: string; name: string }>
  severity: 'priority' | 'watch' | 'info'
  href?: string
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function countPhrase(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function metricFocus(metricKey: string, locale: AppLocale): { title: string; description: string } {
  if (['sprint5m', 'sprint10m', 'sprint20m', 'sprint30m', 'sprint20mFly', 'sprint30mFly', 'agilityBest'].includes(metricKey)) {
    return {
      title: t(locale, 'Acceleration and change of direction', 'Acceleration och riktningsförändring'),
      description: t(
        locale,
        'Plan short on-ice accelerations, 5-10-5 technique, and full recovery between quality reps.',
        'Planera korta isaccelerationer, 5-10-5-teknik och full återhämtning mellan kvalitetsreps.',
      ),
    }
  }
  if (['muscleLabWkg', 'wingate30sAveragePower', 'standingLongJump', 'threeJumpBest'].includes(metricKey)) {
    return {
      title: t(locale, 'Explosive lower-body power', 'Explosiv underkroppskraft'),
      description: t(
        locale,
        'Add power blocks with jumps, loaded jump squat, and contrast pairs where velocity guides load.',
        'Lägg in power-block med hopp, loaded jump squat och kontrastpar där hastigheten styr belastningen.',
      ),
    }
  }
  if (['backSquat1RM', 'powerClean1RM', 'benchPress1RM', 'pullUp1RM', 'gripMax'].includes(metricKey)) {
    return {
      title: t(locale, 'Max strength and robustness', 'Maxstyrka och robusthet'),
      description: t(
        locale,
        'Prioritize main lifts, grip/upper body, and progressive strength without disrupting game or ice density.',
        'Prioritera baslyft, grepp/överkropp och progressiv styrka utan att störa match- eller istäthet.',
      ),
    }
  }
  if (['beepScore', 'vo2Max', 'lt1SpeedKmh', 'lt2SpeedKmh', 'maxLactate', 'maxHeartRate', 'rampTimeSeconds', 'endurance7x40Best', 'endurance7x40Average', 'endurance7x40AverageKmh', 'endurance7x40Drop', 'endurance7x40Resistance', 'endurance7x40Score'].includes(metricKey)) {
    return {
      title: t(locale, 'Aerobic profile and repeated shift', 'Aerob profil och repeated shift'),
      description: t(
        locale,
        'Combine LT2/VO2-guided intervals with repeated 30-45 sec work blocks and controlled recovery between sets.',
        'Kombinera LT2/VO2-styrda intervaller med upprepade 30-45 sek arbetsblock och kontrollerad återhämtning mellan serier.',
      ),
    }
  }
  return {
    title: t(locale, 'Physical capacity', 'Fysisk kapacitet'),
    description: t(
      locale,
      'Follow up with targeted training and a new test after the block.',
      'Följ upp med riktad träning och nytt test när blocket är avslutat.',
    ),
  }
}

export function buildHockeyActionItems(data: HockeyActionPlanData, options?: { basePath?: string; locale?: AppLocale }): HockeyActionItem[] {
  const locale = options?.locale ?? 'en'
  const actions: HockeyActionItem[] = []
  const missingAthletes = data.athletes.filter((athlete) => !athlete.latestTestDate)

  if (missingAthletes.length > 0) {
    actions.push({
      id: 'missing-tests',
      title: t(locale, 'Complete test coverage', 'Komplettera testtäckning'),
      description: t(
        locale,
        `${countPhrase(missingAthletes.length, 'player is', 'players are')} missing hockey tests in the matrix. Run the minimum battery: sprint, jump, strength, and one conditioning marker.`,
        `${missingAthletes.length} spelare saknar hockeytest i matrisen. Kör minsta batteriet: sprint, hopp, styrka och en konditionsmarkör.`,
      ),
      athletes: missingAthletes.slice(0, 6).map((athlete) => ({ id: athlete.id, name: athlete.name })),
      severity: 'info',
      href: options?.basePath ? `${options.basePath}/hockey-tests` : undefined,
    })
  }

  const byFocus = new Map<string, {
    title: string
    description: string
    priority: number
    watch: number
    athleteMap: Map<string, { id: string; name: string }>
  }>()

  data.athletes.forEach((athlete) => {
    data.metrics.forEach((metric) => {
      const benchmark = athlete.benchmarks[metric.key]
      if (!benchmark || !['priority', 'watch'].includes(benchmark.band)) return
      const focus = metricFocus(metric.key, locale)
      const current = byFocus.get(focus.title) ?? {
        ...focus,
        priority: 0,
        watch: 0,
        athleteMap: new Map<string, { id: string; name: string }>(),
      }
      if (benchmark.band === 'priority') current.priority += 1
      else current.watch += 1
      current.athleteMap.set(athlete.id, { id: athlete.id, name: athlete.name })
      byFocus.set(focus.title, current)
    })
  })

  Array.from(byFocus.entries())
    .sort(([, a], [, b]) => (b.priority - a.priority) || (b.watch - a.watch))
    .slice(0, 4)
    .forEach(([key, group]) => {
      actions.push({
        id: `focus-${key}`,
        title: group.title,
        description: t(
          locale,
          `${group.priority} priority and ${group.watch} watch flags. ${group.description}`,
          `${group.priority} prioritet och ${group.watch} följ upp-markeringar. ${group.description}`,
        ),
        athletes: Array.from(group.athleteMap.values()).slice(0, 6),
        severity: group.priority > 0 ? 'priority' : 'watch',
      })
    })

  const declining = data.history.flatMap((metric) =>
    metric.athletes
      .filter((athlete) => {
        if (athlete.delta == null) return false
        return metric.lowerIsBetter ? athlete.delta > 0 : athlete.delta < 0
      })
      .map((athlete) => ({ metric, athlete, drop: athlete.delta as number }))
  )
    .sort((a, b) => Math.abs(b.drop) - Math.abs(a.drop))
    .slice(0, 6)

  if (declining.length > 0) {
    const athletes = new Map<string, { id: string; name: string }>()
    declining.forEach((row) => athletes.set(row.athlete.id, { id: row.athlete.id, name: row.athlete.name }))
    actions.push({
      id: 'declining',
      title: t(locale, 'Follow up negative trend', 'Följ upp negativ trend'),
      description: t(
        locale,
        `${countPhrase(declining.length, 'metric has', 'metrics have')} worsened compared with the previous test. Check load, recovery, and test context before the next block.`,
        `${declining.length} mätvärden har försämrats jämfört med föregående test. Kontrollera belastning, återhämtning och testkontext innan nästa block.`,
      ),
      athletes: Array.from(athletes.values()).slice(0, 6),
      severity: 'watch',
    })
  }

  return actions.slice(0, 6)
}
