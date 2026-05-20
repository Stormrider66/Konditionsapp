'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Timer,
  Target,
  TrendingUp,
  AlertTriangle,
  Zap,
  Users,
  Calendar,
  Activity,
  ArrowDown,
  ArrowUp,
  Medal,
  Download,
  Loader2,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes'
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'
import { SportTestHistory } from '@/components/tests/shared'
import { toast } from 'sonner'
import { buildTeamSportPlanningSummary } from '@/lib/program-generator/team-sports/explainability'
import { TeamSportPlanningSummaryCard } from './TeamSportPlanningSummaryCard'

interface HockeyAthleteViewProps {
  clientId: string
  clientName: string
  settings?: HockeySettings | Record<string, unknown>
  basePath?: string
}

interface HockeyTestSummary {
  id: string
  testDate: string
  sourceType: string
  notes: string | null
  season: string
  ageAtTest: number | null
  developmentLevel: string
  teamName: string | null
  aerobicAutoLinked?: boolean
  aerobicAutoLinkSource?: string | null
  aerobicAutoLinkDate?: string | null
  metrics: Record<string, number | null>
  qualityFlags: Array<{
    key: string
    severity: 'info' | 'warning'
    label: string
    detail: string
  }>
}

interface HockeyTrend {
  key: string
  delta: number
  percentChange: number | null
  direction: 'up' | 'down'
  isImprovement: boolean
}

interface HockeyBest {
  key: string
  value: number
  testDate: string
  testId: string
}

interface HockeyFlag {
  key: string
  severity: 'info' | 'warning'
  label: string
}

interface HockeySummaryResponse {
  latest: HockeyTestSummary | null
  previous: HockeyTestSummary | null
  bests: Record<string, HockeyBest | null>
  trends: HockeyTrend[]
  flags: HockeyFlag[]
  history: HockeyTestSummary[]
  pathway: {
    seasons: Array<{
      season: string
      level: string
      testCount: number
      firstDate: string
      lastDate: string
      ageRange: string | null
      teamNames: string[]
      startMetrics: Record<string, number | null>
      endMetrics: Record<string, number | null>
      changes: Record<string, number | null>
    }>
    milestones: Array<{
      id: string
      date: string
      label: string
      detail: string
      tone: 'info' | 'positive'
    }>
    readiness: Array<{
      level: string
      score: number | null
      targetHits: number
      targetCount: number
      eliteHits: number
      gaps: Array<{
        metricKey: string
        label: string
        value: number | null
        target: number
        elite: number
        gapToTarget: number
        gapToElite: number
        unit: string
        lowerIsBetter: boolean
        status: 'missing' | 'below-target' | 'target' | 'elite'
      }>
      primaryGap: {
        metricKey: string
        label: string
        value: number | null
        target: number
        elite: number
        gapToTarget: number
        gapToElite: number
        unit: string
        lowerIsBetter: boolean
        status: 'missing' | 'below-target' | 'target' | 'elite'
      } | null
    }>
    nextLevel: {
      level: string
      score: number | null
      targetHits: number
      targetCount: number
      eliteHits: number
      primaryGap: {
        metricKey: string
        label: string
        value: number | null
        target: number
        elite: number
        gapToTarget: number
        gapToElite: number
        unit: string
        lowerIsBetter: boolean
        status: 'missing' | 'below-target' | 'target' | 'elite'
      } | null
    } | null
  }
  interpretations: Array<{
    id: string
    tone: 'priority' | 'watch' | 'maintain' | 'quality' | 'positive'
    focusArea: 'test-quality' | 'readiness' | 'speed' | 'power' | 'aerobic' | 'repeated-sprint' | 'strength' | 'maintenance'
    title: string
    summary: string
    action: string
    trainingBlock: string
    retest: string
    evidence: string[]
  }>
  count: number
}

interface HockeyCoachPlanItem {
  title: string
  description: string
  tone: 'priority' | 'watch' | 'positive' | 'info'
}

interface HockeyPlayerHighlight {
  title: string
  status: string
  bullets: string[]
  tone: 'priority' | 'positive' | 'info'
}

type LocalizedText = { sv: string; en: string }

function tr(locale: string, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

function localized(locale: string, text: LocalizedText): string {
  return locale === 'sv' ? text.sv : text.en
}

const POSITION_LABELS: Record<string, LocalizedText> = {
  center: { sv: 'Center', en: 'Center' },
  wing: { sv: 'Forward (Wing)', en: 'Forward (Wing)' },
  defense: { sv: 'Back', en: 'Defense' },
  goalie: { sv: 'Målvakt', en: 'Goalie' },
}

const LEAGUE_LABELS: Record<string, LocalizedText> = {
  recreational: { sv: 'Motionshockey', en: 'Recreational hockey' },
  junior: { sv: 'Junior', en: 'Junior' },
  division_3: { sv: 'Division 3', en: 'Division 3' },
  division_2: { sv: 'Division 2', en: 'Division 2' },
  division_1: { sv: 'Division 1', en: 'Division 1' },
  hockeyettan: { sv: 'Hockeyettan', en: 'Hockeyettan' },
  hockeyallsvenskan: { sv: 'Hockeyallsvenskan', en: 'Hockeyallsvenskan' },
  shl: { sv: 'SHL', en: 'SHL' },
}

const PHASE_LABELS: Record<string, LocalizedText> = {
  off_season: { sv: 'Off-season', en: 'Off-season' },
  pre_season: { sv: 'Försäsong', en: 'Pre-season' },
  in_season: { sv: 'Säsong', en: 'In-season' },
  playoffs: { sv: 'Slutspel', en: 'Playoffs' },
}

const PLAYSTYLE_LABELS: Record<string, LocalizedText> = {
  offensive: { sv: 'Offensiv', en: 'Offensive' },
  defensive: { sv: 'Defensiv', en: 'Defensive' },
  two_way: { sv: 'Tvåvägsspelare', en: 'Two-way player' },
  physical: { sv: 'Fysisk', en: 'Physical' },
  skill: { sv: 'Teknisk', en: 'Skill player' },
}

const STRENGTH_LABELS: Record<string, LocalizedText> = {
  skating_speed: { sv: 'Skridskohastighet', en: 'Skating speed' },
  acceleration: { sv: 'Acceleration', en: 'Acceleration' },
  shot_power: { sv: 'Skottstyrka', en: 'Shot power' },
  physical_battles: { sv: 'Fysiska dueller', en: 'Physical battles' },
  endurance: { sv: 'Uthållighet', en: 'Endurance' },
  agility: { sv: 'Kvickhet', en: 'Agility' },
  core_stability: { sv: 'Core-stabilitet', en: 'Core stability' },
  upper_body: { sv: 'Överkroppsstyrka', en: 'Upper-body strength' },
}

const WEAKNESS_LABELS: Record<string, LocalizedText> = {
  skating_technique: { sv: 'Skridskoteknik', en: 'Skating technique' },
  backwards_skating: { sv: 'Baklängesåkning', en: 'Backward skating' },
  shot_accuracy: { sv: 'Skottaccuracy', en: 'Shot accuracy' },
  faceoffs: { sv: 'Tekningar', en: 'Faceoffs' },
  positioning: { sv: 'Positionering', en: 'Positioning' },
  puck_handling: { sv: 'Puckhantering', en: 'Puck handling' },
  passing: { sv: 'Passningar', en: 'Passing' },
  defensive_play: { sv: 'Defensivt spel', en: 'Defensive play' },
}

const INJURY_LABELS: Record<string, LocalizedText> = {
  groin: { sv: 'Ljumske', en: 'Groin' },
  hip: { sv: 'Höft', en: 'Hip' },
  knee: { sv: 'Knä', en: 'Knee' },
  shoulder: { sv: 'Axel', en: 'Shoulder' },
  ankle: { sv: 'Fotled', en: 'Ankle' },
  back: { sv: 'Rygg', en: 'Back' },
  concussion: { sv: 'Hjärnskakning', en: 'Concussion' },
  wrist_hand: { sv: 'Handled/hand', en: 'Wrist/hand' },
}

// Training recommendations by season phase
const PHASE_RECOMMENDATIONS: Record<string, { focus: LocalizedText[]; avoid: LocalizedText[] }> = {
  off_season: {
    focus: [
      { sv: 'Aerob basträning', en: 'Aerobic base training' },
      { sv: 'Maxstyrka (4-6 rep)', en: 'Max strength (4-6 reps)' },
      { sv: 'Rörlighet', en: 'Mobility' },
      { sv: 'Skaderehab', en: 'Injury rehab' },
    ],
    avoid: [
      { sv: 'Hög-intensiv sprintträning', en: 'High-intensity sprint training' },
      { sv: 'Maximal is-träning', en: 'Maximal on-ice training' },
    ],
  },
  pre_season: {
    focus: [
      { sv: 'Intervaller (30-60 sek)', en: 'Intervals (30-60 sec)' },
      { sv: 'Explosiv styrka', en: 'Explosive strength' },
      { sv: 'Plyometrics', en: 'Plyometrics' },
      { sv: 'Is-kondition', en: 'On-ice conditioning' },
    ],
    avoid: [
      { sv: 'Långdistans steady-state', en: 'Long steady-state distance work' },
      { sv: 'Hög volym styrketräning', en: 'High-volume strength training' },
    ],
  },
  in_season: {
    focus: [
      { sv: 'Underhållsstyrka (2x/v)', en: 'Maintenance strength (2x/week)' },
      { sv: 'Aktiv återhämtning', en: 'Active recovery' },
      { sv: 'Mobilitet', en: 'Mobility' },
      { sv: 'Skadeförebyggande', en: 'Injury prevention' },
    ],
    avoid: [
      { sv: 'Hög volym off-ice', en: 'High off-ice volume' },
      { sv: 'Nya övningar', en: 'New exercises' },
      { sv: 'Tung styrketräning nära match', en: 'Heavy strength training close to games' },
    ],
  },
  playoffs: {
    focus: [
      { sv: 'Lätt aktivering', en: 'Light activation' },
      { sv: 'Pool-återhämtning', en: 'Pool recovery' },
      { sv: 'Mental förberedelse', en: 'Mental preparation' },
      { sv: 'Sömn', en: 'Sleep' },
    ],
    avoid: [
      { sv: 'Styrketräning', en: 'Strength training' },
      { sv: 'Off-ice kondition', en: 'Off-ice conditioning' },
      { sv: 'Allt som kan orsaka trötthet', en: 'Anything that can create fatigue' },
    ],
  },
}

const PHYSICAL_METRICS = [
  { key: 'muscleLabWkg', label: 'MuscleLab', unit: 'W/kg', decimals: 1 },
  { key: 'backSquat1RM', label: { sv: 'Knäböj', en: 'Back squat' }, unit: 'kg', decimals: 0 },
  { key: 'powerClean1RM', label: 'Power clean', unit: 'kg', decimals: 0 },
  { key: 'benchPress1RM', label: { sv: 'Bänkpress', en: 'Bench press' }, unit: 'kg', decimals: 0 },
  { key: 'pullUp1RM', label: 'Pull-up 1RM', unit: 'kg', decimals: 0 },
  { key: 'gripMax', label: 'Grepp max', unit: 'kg', decimals: 0 },
  { key: 'standingLongJump', label: { sv: 'Längdhopp', en: 'Standing long jump' }, unit: 'cm', decimals: 0 },
  { key: 'threeJumpBest', label: '3-steg', unit: 'cm', decimals: 0 },
  { key: 'sprint5m', label: '5m is', unit: 's', decimals: 2 },
  { key: 'sprint10m', label: '10m is', unit: 's', decimals: 2 },
  { key: 'sprint20m', label: '20m is', unit: 's', decimals: 2 },
  { key: 'sprint30m', label: '30m is', unit: 's', decimals: 2 },
  { key: 'sprint0to10Kmh', label: '0-10 fart', unit: 'km/h', decimals: 1 },
  { key: 'sprint10to20Kmh', label: '10-20 fart', unit: 'km/h', decimals: 1 },
  { key: 'sprint20to30Kmh', label: '20-30 fart', unit: 'km/h', decimals: 1 },
  { key: 'sprint0to30Kmh', label: '0-30 fart', unit: 'km/h', decimals: 1 },
  { key: 'agilityBest', label: '5-10-5', unit: 's', decimals: 2 },
  { key: 'beepScore', label: 'Beep', unit: '', decimals: 1 },
  { key: 'wingate30sAveragePower', label: 'Wingate 30 s', unit: 'W', decimals: 0 },
  { key: 'vo2Max', label: 'VO2max', unit: 'ml/kg/min', decimals: 1 },
  { key: 'lt1SpeedKmh', label: { sv: 'LT1 fart', en: 'LT1 speed' }, unit: 'km/h', decimals: 1 },
  { key: 'lt1HeartRate', label: { sv: 'LT1 puls', en: 'LT1 heart rate' }, unit: 'bpm', decimals: 0 },
  { key: 'lt1Lactate', label: { sv: 'LT1 laktat', en: 'LT1 lactate' }, unit: 'mmol/L', decimals: 1 },
  { key: 'lt2SpeedKmh', label: { sv: 'LT2 fart', en: 'LT2 speed' }, unit: 'km/h', decimals: 1 },
  { key: 'lt2HeartRate', label: { sv: 'LT2 puls', en: 'LT2 heart rate' }, unit: 'bpm', decimals: 0 },
  { key: 'lt2Lactate', label: { sv: 'LT2 laktat', en: 'LT2 lactate' }, unit: 'mmol/L', decimals: 1 },
  { key: 'maxLactate', label: { sv: 'Max laktat', en: 'Max lactate' }, unit: 'mmol/L', decimals: 1 },
  { key: 'maxHeartRate', label: { sv: 'Maxpuls', en: 'Max HR' }, unit: 'bpm', decimals: 0 },
  { key: 'rampTimeSeconds', label: { sv: 'Ramptid', en: 'Ramp time' }, unit: 's', decimals: 0 },
  { key: 'endurance7x40Best', label: { sv: '7x40 bäst', en: '7x40 best' }, unit: 's', decimals: 2 },
  { key: 'endurance7x40BestKmh', label: { sv: '7x40 fart', en: '7x40 speed' }, unit: 'km/h', decimals: 1 },
  { key: 'endurance7x40Average', label: { sv: '7x40 snitt', en: '7x40 average' }, unit: 's', decimals: 2 },
  { key: 'endurance7x40AverageKmh', label: { sv: '7x40 snittfart', en: '7x40 average speed' }, unit: 'km/h', decimals: 1 },
  { key: 'endurance7x40Resistance', label: '7x40 resistance', unit: '%', decimals: 0 },
  { key: 'endurance7x40DecrementPct', label: '7x40 decrement', unit: '%', decimals: 1 },
  { key: 'enduranceFatigueDrop', label: '7x40 drop', unit: '%', decimals: 1 },
] as const

const ICE_SPEED_METRICS = [
  'sprint0to10Kmh',
  'sprint10to20Kmh',
  'sprint20to30Kmh',
  'sprint0to30Kmh',
  'endurance7x40BestKmh',
  'endurance7x40AverageKmh',
  'endurance7x40Resistance',
] as const

const SNAPSHOT_METRICS = [
  'muscleLabWkg',
  'backSquat1RM',
  'powerClean1RM',
  'sprint10m',
  'sprint30m',
  'agilityBest',
  'standingLongJump',
  'vo2Max',
  'lt2SpeedKmh',
  'endurance7x40AverageKmh',
  'endurance7x40Resistance',
  'enduranceFatigueDrop',
] as const

const BEST_METRICS = [
  'muscleLabWkg',
  'backSquat1RM',
  'powerClean1RM',
  'benchPress1RM',
  'pullUp1RM',
  'gripMax',
  'standingLongJump',
  'threeJumpBest',
  'sprint5m',
  'sprint10m',
  'sprint30m',
  'sprint0to10Kmh',
  'sprint10to20Kmh',
  'sprint20to30Kmh',
  'sprint0to30Kmh',
  'agilityBest',
  'vo2Max',
  'lt1SpeedKmh',
  'lt2SpeedKmh',
  'maxLactate',
  'maxHeartRate',
  'endurance7x40Best',
  'endurance7x40BestKmh',
  'endurance7x40Average',
  'endurance7x40AverageKmh',
  'endurance7x40Resistance',
] as const

const PATHWAY_METRICS = [
  { key: 'muscleLabWkg', label: 'Power', unit: 'W/kg', decimals: 1, color: '#0891b2' },
  { key: 'sprint10m', label: '10m ice', unit: 's', decimals: 2, color: '#dc2626' },
  { key: 'endurance7x40AverageKmh', label: '7x40 avg speed', unit: 'km/h', decimals: 1, color: '#16a34a' },
  { key: 'vo2Max', label: 'VO2max', unit: 'ml/kg/min', decimals: 1, color: '#ea580c' },
  { key: 'backSquat1RM', label: 'Back squat', unit: 'kg', decimals: 0, color: '#7c3aed' },
] as const

const METRIC_BY_KEY: ReadonlyMap<string, (typeof PHYSICAL_METRICS)[number]> = new Map(
  PHYSICAL_METRICS.map((metric) => [metric.key, metric])
)

function labelFor(labels: Record<string, LocalizedText>, key: string, locale: string): string {
  return labels[key] ? localized(locale, labels[key]) : key
}

function metricLabel(metric: (typeof PHYSICAL_METRICS)[number], locale: string): string {
  return typeof metric.label === 'string' ? metric.label : localized(locale, metric.label)
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function aerobicSourceLabel(source: string | null | undefined, locale: string): string {
  switch (source) {
    case 'lab-test':
      return tr(locale, 'labbtest', 'lab test')
    case 'athlete-profile':
      return tr(locale, 'profil', 'profile')
    case 'manual-profile':
      return tr(locale, 'manuell profil', 'manual profile')
    default:
      return tr(locale, 'profil/labb', 'profile/lab')
  }
}

function formatMetric(value: number | null | undefined, unit: string, decimals: number): string {
  if (value == null) return '-'
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function formatDelta(delta: number, unit: string, decimals: number): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function metricFocus(metricKey: string, locale: string): { title: string; description: string } {
  if (['sprint5m', 'sprint10m', 'sprint20m', 'sprint30m', 'agilityBest'].includes(metricKey)) {
    return {
      title: tr(locale, 'Acceleration och riktningsförändring', 'Acceleration and change of direction'),
      description: tr(locale, 'Prioritera korta isaccelerationer, broms/omstart och 5-10-5-kvalitet med full återhämtning.', 'Prioritize short on-ice accelerations, braking/restarts and 5-10-5 quality with full recovery.'),
    }
  }
  if (['muscleLabWkg', 'wingate30sAveragePower', 'standingLongJump', 'threeJumpBest'].includes(metricKey)) {
    return {
      title: tr(locale, 'Explosiv underkroppskraft', 'Explosive lower-body power'),
      description: tr(locale, 'Kör ett power-block med hopp, loaded squat jump och hastighetsstyrda kontrastpar.', 'Run a power block with jumps, loaded squat jumps and velocity-guided contrast pairs.'),
    }
  }
  if (['backSquat1RM', 'powerClean1RM', 'benchPress1RM', 'pullUp1RM', 'gripMax'].includes(metricKey)) {
    return {
      title: tr(locale, 'Maxstyrka och robusthet', 'Max strength and robustness'),
      description: tr(locale, 'Bygg vidare med baslyft, drag/press och grepp utan att störa is- eller matchkvalitet.', 'Build with base lifts, pull/press and grip work without disrupting on-ice or game quality.'),
    }
  }
  if (['beepScore', 'vo2Max', 'lt1SpeedKmh', 'lt2SpeedKmh', 'endurance7x40Average', 'endurance7x40AverageKmh', 'endurance7x40Resistance', 'endurance7x40DecrementPct', 'enduranceFatigueDrop'].includes(metricKey)) {
    return {
      title: 'Repeated shift conditioning',
      description: tr(locale, 'Använd upprepade 30-45 sek arbetsblock och kontrollera falloff mellan repetitioner.', 'Use repeated 30-45 second work blocks and monitor falloff between reps.'),
    }
  }
  return {
    title: tr(locale, 'Fysisk kapacitet', 'Physical capacity'),
    description: tr(locale, 'Följ upp med riktad träning och nytt test efter nästa block.', 'Follow up with targeted training and a new test after the next block.'),
  }
}

function buildAthleteCoachPlan(
  summary: HockeySummaryResponse | null,
  hockeySettings: HockeySettings,
  locale: string,
): HockeyCoachPlanItem[] {
  const items: HockeyCoachPlanItem[] = []
  if (!summary?.latest) {
    return [{
      title: tr(locale, 'Skapa baseline', 'Create a baseline'),
      description: tr(locale, 'Logga första hockeybatteriet med sprint, hopp, styrka, kondition och MuscleLab om tillgängligt.', 'Log the first hockey battery with sprint, jumps, strength, conditioning and MuscleLab if available.'),
      tone: 'info',
    }]
  }

  const warnings = summary.flags.filter((flag) => flag.severity === 'warning')
  if (warnings.length > 0) {
    items.push({
      title: tr(locale, 'Kontrollera coachflaggor', 'Review coach flags'),
      description: warnings.map((flag) => flag.label).join(' · '),
      tone: 'priority',
    })
  }

  const negativeTrends = summary.trends
    .filter((trend) => !trend.isImprovement)
    .sort((a, b) => Math.abs(b.percentChange ?? b.delta) - Math.abs(a.percentChange ?? a.delta))
  const primaryNegative = negativeTrends[0]
  if (primaryNegative) {
    const metric = METRIC_BY_KEY.get(primaryNegative.key)
    const focus = metricFocus(primaryNegative.key, locale)
    items.push({
      title: focus.title,
      description: tr(
        locale,
        `${metric ? metricLabel(metric, locale) : 'Nyckelvärde'} har försämrats ${formatDelta(primaryNegative.delta, metric?.unit ?? '', metric?.decimals ?? 1)} sedan förra testet. ${focus.description}`,
        `${metric ? metricLabel(metric, locale) : 'Key metric'} has dropped ${formatDelta(primaryNegative.delta, metric?.unit ?? '', metric?.decimals ?? 1)} since the previous test. ${focus.description}`
      ),
      tone: 'priority',
    })
  }

  const bestNow = BEST_METRICS
    .map((key) => {
      const best = summary.bests[key]
      const metric = METRIC_BY_KEY.get(key)
      return best && metric && best.testId === summary.latest?.id
        ? { best, metric }
        : null
    })
    .filter((item): item is { best: HockeyBest; metric: NonNullable<ReturnType<typeof METRIC_BY_KEY.get>> } => item != null)
  if (bestNow.length > 0) {
    items.push({
      title: tr(locale, 'Behåll styrkan i profilen', 'Maintain the profile strengths'),
      description: tr(
        locale,
        `${bestNow.slice(0, 3).map((item) => metricLabel(item.metric, locale)).join(', ')} är ny bestnotering. Behåll dosen som gav resultat och öka bara en variabel i taget.`,
        `${bestNow.slice(0, 3).map((item) => metricLabel(item.metric, locale)).join(', ')} is a new personal best. Keep the dose that worked and increase only one variable at a time.`
      ),
      tone: 'positive',
    })
  }

  const phase = hockeySettings.seasonPhase in PHASE_LABELS ? labelFor(PHASE_LABELS, hockeySettings.seasonPhase, locale) : tr(locale, 'aktuell fas', 'current phase')
  const retestWeeks = hockeySettings.seasonPhase === 'in_season' || hockeySettings.seasonPhase === 'playoffs' ? '4-6' : '3-4'
  items.push({
    title: tr(locale, `Nästa ${phase}-block`, `Next ${phase} block`),
    description: tr(locale, `Kör 2-4 veckor med huvudfokus ovan och gör kort retest om ${retestWeeks} veckor, eller tidigare om matchschema/återhämtning förändras tydligt.`, `Run 2-4 weeks with the main focus above and do a short retest in ${retestWeeks} weeks, or earlier if the game schedule or recovery changes clearly.`),
    tone: 'info',
  })

  return items.slice(0, 4)
}

function buildPlayerHighlight(summary: HockeySummaryResponse | null, clientName: string, locale: string): HockeyPlayerHighlight {
  if (!summary?.latest) {
    return {
      title: tr(locale, `${clientName}: testprofil saknas`, `${clientName}: test profile missing`),
      status: tr(locale, 'Logga första hockeybatteriet för att visa nuläge, bästa värden och utveckling.', 'Log the first hockey battery to show current status, best values and development.'),
      tone: 'info',
      bullets: [
        tr(locale, 'Första vyn bör innehålla sprint, 7x40, hopp, styrka och aerob ankare.', 'The first view should include sprint, 7x40, jumps, strength and an aerobic anchor.'),
        tr(locale, 'När två tester finns visar profilen förändring och vad nästa block bör fokusera på.', 'Once two tests exist, the profile shows change and what the next block should focus on.'),
      ],
    }
  }

  const latest = summary.latest
  const positiveBestCount = BEST_METRICS.filter((key) => summary.bests[key]?.testId === latest.id).length
  const priority = summary.interpretations.find((item) => item.tone === 'priority' || item.tone === 'quality')
  const positive = summary.interpretations.find((item) => item.tone === 'positive')
  const nextLevel = summary.pathway.nextLevel
  const nextLevelText = nextLevel?.score == null
    ? nextLevel?.level ? tr(locale, `${nextLevel.level}: behöver fler testvärden`, `${nextLevel.level}: needs more test values`) : tr(locale, 'Nästa nivå behöver fler testvärden', 'Next level needs more test values')
    : tr(locale, `${nextLevel.level}: ${nextLevel.score}% av tillgängliga targets`, `${nextLevel.level}: ${nextLevel.score}% of available targets`)

  if (priority) {
    return {
      title: tr(locale, `${clientName}: tydlig utvecklingsprioritet`, `${clientName}: clear development priority`),
      status: priority.title,
      tone: 'priority',
      bullets: [
        priority.action,
        priority.trainingBlock,
        tr(locale, `Nästa nivå: ${nextLevelText}.`, `Next level: ${nextLevelText}.`),
      ],
    }
  }

  if (positiveBestCount > 0 || positive) {
    return {
      title: tr(locale, `${clientName}: positiv testtrend`, `${clientName}: positive test trend`),
      status: positive?.title ?? tr(locale, `${positiveBestCount} nya bestnoteringar i senaste testet`, `${positiveBestCount} new personal bests in the latest test`),
      tone: 'positive',
      bullets: [
        positive?.action ?? tr(locale, 'Behåll dosen som skapade förbättringen och flytta fokus till största kvarvarande gap.', 'Keep the dose that created the improvement and shift focus to the biggest remaining gap.'),
        positive?.retest ?? tr(locale, 'Bekräfta utvecklingen vid nästa planerade test.', 'Confirm the development at the next planned test.'),
        tr(locale, `Nästa nivå: ${nextLevelText}.`, `Next level: ${nextLevelText}.`),
      ],
    }
  }

  return {
    title: tr(locale, `${clientName}: stabil hockeyprofil`, `${clientName}: stable hockey profile`),
    status: tr(locale, 'Ingen stor varningssignal sticker ut från senaste testet.', 'No major warning signal stands out from the latest test.'),
    tone: 'info',
    bullets: [
      summary.interpretations[0]?.action ?? tr(locale, 'Fortsätt aktuell plan och retesta efter nästa block.', 'Continue the current plan and retest after the next block.'),
      tr(locale, `Nästa nivå: ${nextLevelText}.`, `Next level: ${nextLevelText}.`),
      latest.aerobicAutoLinked
        ? tr(locale, 'Aeroba värden är länkade från labb/profil så spelaren slipper dubbelregistrering.', 'Aerobic values are linked from lab/profile so the player avoids duplicate registration.')
        : tr(locale, 'Lägg till labb/ramp-data när den finns för bättre aerob trend.', 'Add lab/ramp data when available for a better aerobic trend.'),
    ],
  }
}

function planToneClasses(tone: HockeyCoachPlanItem['tone']): string {
  if (tone === 'priority') return 'border-red-500/40 bg-red-500/10'
  if (tone === 'watch') return 'border-amber-500/40 bg-amber-500/10'
  if (tone === 'positive') return 'border-emerald-500/40 bg-emerald-500/10'
  return 'border-blue-500/30 bg-blue-500/10'
}

function interpretationToneClasses(tone: HockeySummaryResponse['interpretations'][number]['tone']): string {
  if (tone === 'priority') return 'border-red-500/40 bg-red-500/10'
  if (tone === 'quality') return 'border-amber-500/40 bg-amber-500/10'
  if (tone === 'watch') return 'border-orange-500/40 bg-orange-500/10'
  if (tone === 'positive') return 'border-emerald-500/40 bg-emerald-500/10'
  return 'border-blue-500/30 bg-blue-500/10'
}

function interpretationBadge(tone: HockeySummaryResponse['interpretations'][number]['tone'], locale: string): string {
  if (tone === 'priority') return tr(locale, 'Prioritet', 'Priority')
  if (tone === 'quality') return tr(locale, 'Kvalitet', 'Quality')
  if (tone === 'watch') return tr(locale, 'Följ upp', 'Follow up')
  if (tone === 'positive') return tr(locale, 'Styrka', 'Strength')
  return tr(locale, 'Behåll', 'Maintain')
}

function playerHighlightClasses(tone: HockeyPlayerHighlight['tone']): string {
  if (tone === 'priority') return 'border-red-500/40 bg-red-500/10'
  if (tone === 'positive') return 'border-emerald-500/40 bg-emerald-500/10'
  return 'border-sky-500/30 bg-sky-500/10'
}

function pathwayChangeText(value: number | null | undefined, unit: string, decimals: number): string {
  if (value == null) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function readinessStatusClasses(status: 'missing' | 'below-target' | 'target' | 'elite'): string {
  if (status === 'elite') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
  if (status === 'target') return 'bg-blue-500/10 text-blue-700 border-blue-500/30'
  if (status === 'below-target') return 'bg-amber-500/10 text-amber-700 border-amber-500/30'
  return 'bg-slate-500/10 text-slate-600 border-slate-500/30'
}

function readinessGapText(gap: NonNullable<HockeySummaryResponse['pathway']['nextLevel']>['primaryGap'], locale: string): string {
  if (!gap) return tr(locale, 'Alla tillgängliga targets uppnådda', 'All available targets reached')
  if (gap.value == null) return tr(locale, `${gap.label}: data saknas`, `${gap.label}: missing data`)
  const amount = Math.abs(gap.gapToTarget)
  const action = gap.lowerIsBetter ? tr(locale, 'sänk med', 'reduce by') : tr(locale, 'höj med', 'increase by')
  return tr(
    locale,
    `${gap.label}: ${action} ${amount.toFixed(gap.unit === 's' ? 2 : 1)} ${gap.unit} till target`,
    `${gap.label}: ${action} ${amount.toFixed(gap.unit === 's' ? 2 : 1)} ${gap.unit} to target`
  )
}

export function HockeyAthleteView({ clientId, clientName, settings, basePath = '' }: HockeyAthleteViewProps) {
  const locale = useLocale()
  const themeContext = useWorkoutThemeOptional()
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME
  const [summary, setSummary] = useState<HockeySummaryResponse | null>(null)
  const [isExportingAthleteReport, setIsExportingAthleteReport] = useState(false)

  const hockeySettings = settings as HockeySettings | undefined

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      const res = await fetch(`/api/clients/${clientId}/hockey-tests/summary`)
      if (!res.ok) return
      const body = await res.json()
      if (!cancelled && body.success) {
        setSummary(body.data)
      }
    }

    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (!hockeySettings) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Shield className="h-5 w-5" /> Ishockey
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>{tr(locale, 'Ingen data tillgänglig', 'No data available')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: theme.colors.textMuted }}>
            {tr(locale, 'Atleten har inte angett hockey-inställningar ännu.', 'The athlete has not entered hockey settings yet.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const phaseRecommendations = PHASE_RECOMMENDATIONS[hockeySettings.seasonPhase] || PHASE_RECOMMENDATIONS.off_season
  const planningSummary = buildTeamSportPlanningSummary({
    sport: 'TEAM_ICE_HOCKEY',
    goal: hockeySettings.seasonPhase === 'off_season'
      ? 'off-season-build'
      : hockeySettings.seasonPhase === 'pre_season'
        ? 'pre-season-readiness'
        : 'in-season-maintenance',
    sessionsPerWeek: hockeySettings.weeklyOffIceSessions,
    locale: locale === 'sv' ? 'sv' : 'en',
    hockeySettings: settings as Record<string, unknown>,
  })

  // Calculate average shift length
  const avgShiftLength = hockeySettings.averageIceTimeMinutes && hockeySettings.shiftsPerGame
    ? Math.round((hockeySettings.averageIceTimeMinutes * 60) / hockeySettings.shiftsPerGame)
    : null
  const trendByKey = new Map(summary?.trends.map((trend) => [trend.key, trend]) ?? [])
  const snapshotMetrics = SNAPSHOT_METRICS
    .map((key) => METRIC_BY_KEY.get(key))
    .filter((metric): metric is (typeof PHYSICAL_METRICS)[number] => metric != null)
  const iceSpeedMetrics = ICE_SPEED_METRICS
    .map((key) => METRIC_BY_KEY.get(key))
    .filter((metric): metric is (typeof PHYSICAL_METRICS)[number] => metric != null)
  const bestMetrics = BEST_METRICS
    .map((key) => METRIC_BY_KEY.get(key))
    .filter((metric): metric is (typeof PHYSICAL_METRICS)[number] => metric != null)
  const coachPlan = buildAthleteCoachPlan(summary, hockeySettings, locale)
  const playerHighlight = buildPlayerHighlight(summary, clientName, locale)
  const pathway = summary?.pathway
  const newHockeyTestHref = basePath
    ? `${basePath}/coach/test?clientId=${clientId}&category=hockey`
    : ''
  const pathwayChartData: Array<Record<string, string | number | null>> = (pathway?.seasons ?? []).map((season) => ({
    season: season.season,
    level: season.level,
    ...PATHWAY_METRICS.reduce<Record<string, number | null>>((acc, metric) => {
      acc[metric.key] = season.endMetrics[metric.key] ?? null
      return acc
    }, {}),
  }))

  const handleExportAthleteReport = async () => {
    setIsExportingAthleteReport(true)
    try {
      const { downloadHockeyAthleteReportPDF } = await import('@/lib/exports/hockey-athlete-report-export')
      downloadHockeyAthleteReportPDF({
        clientId,
        clientName,
        settings: hockeySettings,
        latest: summary?.latest ?? null,
        previous: summary?.previous ?? null,
        bests: summary?.bests ?? {},
        trends: summary?.trends ?? [],
        flags: summary?.flags ?? [],
        history: summary?.history ?? [],
        metrics: PHYSICAL_METRICS.map((metric) => ({ ...metric, label: metricLabel(metric, locale) })),
        snapshotMetricKeys: SNAPSHOT_METRICS,
        bestMetricKeys: BEST_METRICS,
        coachPlan,
        pathway: summary?.pathway,
        interpretations: summary?.interpretations ?? [],
      })
      toast.success(tr(locale, 'Spelarrapport exporterad', 'Player report exported'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tr(locale, 'Kunde inte exportera spelarrapport', 'Could not export player report'))
    } finally {
      setIsExportingAthleteReport(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Profile Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Shield className="h-5 w-5 text-blue-500" />
                {hockeySettings.teamName || 'Ishockey'}
              </CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-2" style={{ color: theme.colors.textMuted }}>
                <Badge variant="outline">{labelFor(POSITION_LABELS, hockeySettings.position, locale)}</Badge>
                <Badge variant="secondary">{labelFor(LEAGUE_LABELS, hockeySettings.leagueLevel, locale)}</Badge>
                <Badge className="bg-blue-500">{labelFor(PHASE_LABELS, hockeySettings.seasonPhase, locale)}</Badge>
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              {newHockeyTestHref && (
                <Link href={newHockeyTestHref}>
                  <Button size="sm" variant="outline">
                    {tr(locale, 'Registrera hockeytest', 'Register hockey test')}
                  </Button>
                </Link>
              )}
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>
                  {hockeySettings.yearsPlaying}
                </div>
                <div className="text-xs" style={{ color: theme.colors.textMuted }}>{tr(locale, 'års erfarenhet', 'years experience')}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playing stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Timer className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.averageIceTimeMinutes ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{tr(locale, 'min/match', 'min/game')}</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.shiftsPerGame ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{tr(locale, 'byten', 'shifts')}</div>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {avgShiftLength ?? '-'}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{tr(locale, 'sek/byte', 'sec/shift')}</div>
            </div>
          </div>

          {/* Play style */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.colors.textMuted }}>{tr(locale, 'Spelstil:', 'Play style:')}</span>
            <Badge className={
              hockeySettings.playStyle === 'offensive' ? 'bg-red-500' :
              hockeySettings.playStyle === 'defensive' ? 'bg-blue-500' :
              hockeySettings.playStyle === 'physical' ? 'bg-orange-500' :
              hockeySettings.playStyle === 'skill' ? 'bg-purple-500' :
              'bg-green-500'
            }>
              {labelFor(PLAYSTYLE_LABELS, hockeySettings.playStyle, locale)}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={isExportingAthleteReport}
            onClick={handleExportAthleteReport}
            className="w-full sm:w-auto"
          >
            {isExportingAthleteReport ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            {tr(locale, 'Exportera spelarrapport PDF', 'Export player report PDF')}
          </Button>
        </CardContent>
      </Card>

      {planningSummary && (
        <TeamSportPlanningSummaryCard
          summary={planningSummary}
          locale={locale}
          theme={theme}
        />
      )}

      <Card className={playerHighlightClasses(playerHighlight.tone)} style={{ borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
                <Target className="h-4 w-4 text-sky-500" />
                {tr(locale, 'Spelarvy', 'Player view')}
              </CardTitle>
              <CardDescription style={{ color: theme.colors.textMuted }}>
                {tr(locale, 'Kort version att använda i samtal med spelaren.', 'Short version to use in conversations with the player.')}
              </CardDescription>
            </div>
            <Badge
              variant={playerHighlight.tone === 'priority' ? 'destructive' : playerHighlight.tone === 'positive' ? 'secondary' : 'outline'}
              className="w-fit"
            >
              {playerHighlight.tone === 'priority' ? tr(locale, 'Prioritet', 'Priority') : playerHighlight.tone === 'positive' ? tr(locale, 'Positiv trend', 'Positive trend') : tr(locale, 'Nuläge', 'Current status')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>{playerHighlight.title}</h4>
            <p className="mt-1 text-sm" style={{ color: theme.colors.textMuted }}>{playerHighlight.status}</p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {playerHighlight.bullets.map((bullet, index) => (
              <div
                key={`${index}-${bullet}`}
                className="rounded-md border px-3 py-2 text-xs"
                style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.textMuted }}
              >
                {bullet}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pathway && pathway.seasons.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Development pathway
            </CardTitle>
            <CardDescription style={{ color: theme.colors.textMuted }}>
              Multi-year progression from junior levels toward A-team readiness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {pathway.seasons.map((season) => (
                <div
                  key={season.season}
                  className="rounded-lg border px-3 py-2"
                  style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>{season.season}</p>
                      <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                        {season.teamNames[0] ?? season.level}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{season.level}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                    <span style={{ color: theme.colors.textMuted }}>Tests</span>
                    <span className="text-right font-mono" style={{ color: theme.colors.textPrimary }}>{season.testCount}</span>
                    <span style={{ color: theme.colors.textMuted }}>Age</span>
                    <span className="text-right font-mono" style={{ color: theme.colors.textPrimary }}>{season.ageRange ?? '-'}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {PATHWAY_METRICS.slice(0, 3).map((metric) => (
                      <div key={metric.key} className="flex items-center justify-between gap-2 text-[11px]">
                        <span style={{ color: theme.colors.textMuted }}>{metric.label}</span>
                        <span className="font-mono" style={{ color: theme.colors.textPrimary }}>
                          {pathwayChangeText(season.changes[metric.key], metric.unit, metric.decimals)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {pathway.readiness.length > 0 && (
              <div className="rounded-lg border p-3" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}>
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>Next-level readiness</h4>
                    <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                      Targets use body-mass W/kg and xBW strength for J18, J20 and A-team checkpoints.
                    </p>
                  </div>
                  {pathway.nextLevel && (
                    <Badge variant="outline" className="w-fit text-[10px]">
                      Next: {pathway.nextLevel.level}
                    </Badge>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {pathway.readiness.map((level) => (
                    <div key={level.level} className="rounded-md border px-3 py-2" style={{ borderColor: theme.colors.border }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>{level.level}</p>
                        <Badge variant={level.score != null && level.score >= 100 ? 'secondary' : 'outline'} className="text-[10px]">
                          {level.score == null ? '-' : `${level.score}%`}
                        </Badge>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.min(level.score ?? 0, 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: theme.colors.textMuted }}>
                        <span>{level.targetHits}/{level.targetCount} targets</span>
                        <span>{level.eliteHits} elite</span>
                      </div>
                      <p className="mt-2 text-[11px]" style={{ color: theme.colors.textMuted }}>
                        {readinessGapText(level.primaryGap, locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {level.gaps.map((gap) => (
                          <span
                            key={`${level.level}-${gap.metricKey}`}
                            className={`rounded border px-1.5 py-0.5 text-[10px] ${readinessStatusClasses(gap.status)}`}
                          >
                            {gap.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {PATHWAY_METRICS.map((metric) => {
                const hasData = pathwayChartData.some((point) => typeof point[metric.key] === 'number')
                if (!hasData) return null

                return (
                  <div
                    key={metric.key}
                    className="rounded-lg border p-3"
                    style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>{metric.label}</p>
                      <Badge variant="outline" className="text-[10px]">{metric.unit}</Badge>
                    </div>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pathwayChartData} margin={{ top: 6, right: 10, left: -12, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
                          <XAxis dataKey="season" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} width={42} />
                          <Tooltip
                            formatter={(value) => [
                              typeof value === 'number'
                                ? formatMetric(value, metric.unit, metric.decimals)
                                : '-',
                              metric.label,
                            ]}
                            labelFormatter={(label, payload) => {
                              const level = payload?.[0]?.payload?.level
                              return level ? `${label} · ${level}` : String(label)
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey={metric.key}
                            stroke={metric.color}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })}
            </div>

            {pathway.milestones.length > 0 && (
              <div className="rounded-lg border p-3" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: theme.colors.textPrimary }}>Milestones</h4>
                <div className="space-y-2">
                  {pathway.milestones.slice(0, 6).map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-medium" style={{ color: theme.colors.textPrimary }}>{milestone.label}</p>
                        <p style={{ color: theme.colors.textMuted }}>{milestone.detail}</p>
                      </div>
                      <Badge variant={milestone.tone === 'positive' ? 'secondary' : 'outline'} className="shrink-0 text-[10px]">
                        {formatDate(milestone.date, locale)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Activity className="h-4 w-4 text-cyan-500" />
            {tr(locale, 'Fysprofil', 'Physical profile')}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {tr(locale, 'Senaste hockeytest för', 'Latest hockey test for')} {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary?.latest ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{formatDate(summary.latest.testDate, locale)}</Badge>
                  {summary.latest.aerobicAutoLinked && (
                    <Badge variant="secondary">
                      {tr(locale, 'Aerob länkad från', 'Aerobic linked from')} {aerobicSourceLabel(summary.latest.aerobicAutoLinkSource, locale)}
                      {summary.latest.aerobicAutoLinkDate ? ` ${summary.latest.aerobicAutoLinkDate}` : ''}
                    </Badge>
                  )}
                </div>
                <Badge variant="outline">
                  {summary.latest.sourceType === 'MUSCLE_LAB_IMPORT' ? 'MuscleLab' : tr(locale, 'Manuell', 'Manual')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {snapshotMetrics.map((metric) => {
                  const trend = trendByKey.get(metric.key)
                  const TrendIcon = trend?.direction === 'up' ? ArrowUp : ArrowDown
                  const best = summary.bests[metric.key]
                  const isBest = best?.testId === summary.latest?.id

                  return (
                    <div
                      key={metric.key}
                      className="rounded-lg border p-3"
                      style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                    >
                      <div className="text-[10px] uppercase tracking-wide" style={{ color: theme.colors.textMuted }}>
                        {metricLabel(metric, locale)}
                      </div>
                      <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                        {formatMetric(summary.latest?.metrics[metric.key], metric.unit, metric.decimals)}
                      </div>
                      {isBest && (
                        <Badge variant="secondary" className="mt-1 h-4 px-1.5 text-[9px]">
                          {tr(locale, 'Bästa', 'Best')}
                        </Badge>
                      )}
                      {trend && (
                        <div className={trend.isImprovement ? 'mt-1 flex items-center gap-1 text-[11px] text-emerald-600' : 'mt-1 flex items-center gap-1 text-[11px] text-amber-600'}>
                          <TrendIcon className="h-3 w-3" />
                          <span>{formatDelta(trend.delta, metric.unit, metric.decimals)}</span>
                          {trend.percentChange != null && <span>({formatDelta(trend.percentChange, '%', 1)})</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {iceSpeedMetrics.some((metric) => summary.latest?.metrics[metric.key] != null) && (
                <div className="rounded-lg border p-3" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.colors.textPrimary }}>
                      <Timer className="h-4 w-4 text-sky-500" />
                      {tr(locale, 'Isfart', 'Ice speed')}
                    </h4>
                    <Badge variant="outline" className="text-[10px]">km/h</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {iceSpeedMetrics.map((metric) => {
                      const value = summary.latest?.metrics[metric.key]
                      if (value == null) return null

                      return (
                        <div key={metric.key} className="rounded-md border px-2 py-1.5" style={{ borderColor: theme.colors.border }}>
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: theme.colors.textMuted }}>
                            {metricLabel(metric, locale)}
                          </div>
                          <div className="font-mono text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                            {formatMetric(value, metric.unit, metric.decimals)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {Object.values(summary.bests).some(Boolean) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.colors.textPrimary }}>
                    <Medal className="h-4 w-4 text-amber-500" />
                    {tr(locale, 'Bestnoteringar', 'Personal bests')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {bestMetrics.map((metric) => {
                      const best = summary.bests[metric.key]
                      if (!best) return null

                      return (
                        <div
                          key={metric.key}
                          className="rounded-lg border px-3 py-2"
                          style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                        >
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: theme.colors.textMuted }}>
                            {metricLabel(metric, locale)}
                          </div>
                          <div className="font-mono text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                            {formatMetric(best.value, metric.unit, metric.decimals)}
                          </div>
                          <div className="text-[10px]" style={{ color: theme.colors.textMuted }}>
                            {formatDate(best.testDate, locale)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {summary.flags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>{tr(locale, 'Coachflaggor', 'Coach flags')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.flags.map((flag) => (
                      <Badge
                        key={`${flag.key}-${flag.label}`}
                        variant={flag.severity === 'warning' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {flag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {summary.latest.qualityFlags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme.colors.textPrimary }}>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {tr(locale, 'Testkvalitet', 'Test quality')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {summary.latest.qualityFlags.map((flag) => (
                      <div
                        key={`${flag.key}-${flag.label}`}
                        className="rounded-lg border px-3 py-2"
                        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold" style={{ color: theme.colors.textPrimary }}>
                              {flag.label}
                            </p>
                            <p className="mt-1 text-[11px]" style={{ color: theme.colors.textMuted }}>
                              {flag.detail}
                            </p>
                          </div>
                          <Badge variant={flag.severity === 'warning' ? 'destructive' : 'secondary'} className="shrink-0 text-[10px]">
                            {flag.severity === 'warning' ? tr(locale, 'Kontroll', 'Check') : 'Info'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {summary.history.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>{tr(locale, 'Senaste historik', 'Latest history')}</h4>
                  <div className="divide-y rounded-lg border" style={{ borderColor: theme.colors.border }}>
                    {summary.history.slice(0, 5).map((test) => (
                      <div key={test.id} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs">
                        <span style={{ color: theme.colors.textMuted }}>{formatDate(test.testDate, locale)}</span>
                        <span style={{ color: theme.colors.textPrimary }}>
                          {formatMetric(test.metrics.muscleLabWkg, 'W/kg', 1)}
                        </span>
                        <span style={{ color: theme.colors.textPrimary }}>
                          10m {formatMetric(test.metrics.sprint10m, 's', 2)}
                        </span>
                        <span style={{ color: theme.colors.textPrimary }}>
                          30m {formatMetric(test.metrics.sprint30m, 's', 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm" style={{ color: theme.colors.textMuted }}>
              {tr(locale, 'Inga hockeytester registrerade ännu. När tester loggas visas senaste värden, historik och nyckelflaggor här.', 'No hockey tests registered yet. When tests are logged, the latest values, history and key flags will appear here.')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-4 w-4 text-amber-500" />
            Coach decisions
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Plain-language interpretation of readiness, trends and test quality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(summary?.interpretations ?? []).map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border px-3 py-2 ${interpretationToneClasses(item.tone)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: theme.colors.textMuted }}>
                      {item.summary}
                    </p>
                    <p className="mt-1 text-xs font-medium" style={{ color: theme.colors.textPrimary }}>
                      {item.action}
                    </p>
                    <div className="mt-2 grid gap-1 text-[11px]" style={{ color: theme.colors.textMuted }}>
                      <p><span className="font-medium" style={{ color: theme.colors.textPrimary }}>Block:</span> {item.trainingBlock}</p>
                      <p><span className="font-medium" style={{ color: theme.colors.textPrimary }}>Retest:</span> {item.retest}</p>
                    </div>
                    {item.evidence.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {item.focusArea}
                        </Badge>
                        {item.evidence.map((evidence) => (
                          <Badge key={evidence} variant="outline" className="text-[10px]">
                            {evidence}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={item.tone === 'priority' || item.tone === 'quality' ? 'destructive' : item.tone === 'positive' ? 'secondary' : 'outline'}
                    className="shrink-0 text-[10px]"
                  >
                    {interpretationBadge(item.tone, locale)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-4 w-4 text-amber-500" />
            Coach plan
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {tr(locale, 'Nästa steg för', 'Next steps for')} {clientName} {tr(locale, 'baserat på hockeyprofil och testtrend.', 'based on hockey profile and test trend.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {coachPlan.map((item) => (
              <div
                key={`${item.tone}-${item.title}`}
                className={`rounded-lg border px-3 py-2 ${planToneClasses(item.tone)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: theme.colors.textPrimary }}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: theme.colors.textMuted }}>
                      {item.description}
                    </p>
                  </div>
                  <Badge
                    variant={item.tone === 'priority' ? 'destructive' : item.tone === 'positive' ? 'secondary' : 'outline'}
                    className="shrink-0 text-[10px]"
                  >
                    {item.tone === 'priority' ? tr(locale, 'Prioritet', 'Priority') : item.tone === 'positive' ? tr(locale, 'Styrka', 'Strength') : item.tone === 'watch' ? tr(locale, 'Följ upp', 'Follow up') : 'Plan'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {summary?.latest && (
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: theme.colors.textMuted }}>
              <Calendar className="h-3.5 w-3.5" />
              <span>{tr(locale, 'Senaste test', 'Latest test')} {formatDate(summary.latest.testDate, locale)}</span>
              {summary.previous && <span>· {tr(locale, 'jämförs mot', 'compared with')} {formatDate(summary.previous.testDate, locale)}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Recommendations for Current Phase */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Target className="h-4 w-4" />
            {tr(locale, 'Träningsrekommendationer', 'Training recommendations')} ({labelFor(PHASE_LABELS, hockeySettings.seasonPhase, locale)})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>{tr(locale, 'Fokusera på:', 'Focus on:')}</h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.focus.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-green-500/10 border-green-500">
                  {localized(locale, item)}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>{tr(locale, 'Undvik:', 'Avoid:')}</h4>
            <div className="flex flex-wrap gap-1">
              {phaseRecommendations.avoid.map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-red-500/10 border-red-500">
                  {localized(locale, item)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      {(hockeySettings.strengthFocus.length > 0 || hockeySettings.weaknesses.length > 0) && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
              <TrendingUp className="h-4 w-4" />
              {tr(locale, 'Styrkor & Utvecklingsområden', 'Strengths & Development Areas')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hockeySettings.strengthFocus.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>{tr(locale, 'Styrkor:', 'Strengths:')}</h4>
                <div className="flex flex-wrap gap-1">
                  {hockeySettings.strengthFocus.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {STRENGTH_LABELS[s] ? localized(locale, STRENGTH_LABELS[s]) : s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {hockeySettings.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1" style={{ color: theme.colors.textPrimary }}>{tr(locale, 'Att utveckla:', 'To develop:')}</h4>
                <div className="flex flex-wrap gap-1">
                  {hockeySettings.weaknesses.map((w) => (
                    <Badge key={w} variant="outline" className="text-xs bg-orange-500/10 border-orange-500">
                      {WEAKNESS_LABELS[w] ? localized(locale, WEAKNESS_LABELS[w]) : w}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Injury History */}
      {hockeySettings.injuryHistory.length > 0 && (
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600" style={{ color: theme.colors.textPrimary }}>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {tr(locale, 'Skadehistorik', 'Injury history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {hockeySettings.injuryHistory.map((injury) => (
                <Badge key={injury} variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500">
                  {INJURY_LABELS[injury] ? localized(locale, INJURY_LABELS[injury]) : injury}
                </Badge>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: theme.colors.textMuted }}>
              {tr(locale, 'Inkludera förebyggande övningar för dessa områden i träningsprogrammet.', 'Include preventive exercises for these areas in the training program.')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Position-Specific Training Notes */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Users className="h-4 w-4" />
            {tr(locale, 'Positionsspecifik träning:', 'Position-specific training:')} {labelFor(POSITION_LABELS, hockeySettings.position, locale)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hockeySettings.position === 'goalie' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>{tr(locale, 'Prioritet:', 'Priority:')}</strong> {tr(locale, 'Höftrörlighet, lateral power', 'Hip mobility, lateral power')}</li>
              <li>• <strong>{tr(locale, 'Styrka:', 'Strength:')}</strong> {tr(locale, 'Core-stabilitet, quadriceps', 'Core stability, quadriceps')}</li>
              <li>• <strong>{tr(locale, 'Kondition:', 'Conditioning:')}</strong> {tr(locale, 'Korta explosiva intervaller', 'Short explosive intervals')}</li>
              <li>• <strong>{tr(locale, 'Förebyggande:', 'Prevention:')}</strong> {tr(locale, 'Höft, ljumske, knä', 'Hip, groin, knee')}</li>
            </ul>
          ) : hockeySettings.position === 'defense' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>{tr(locale, 'Prioritet:', 'Priority:')}</strong> {tr(locale, 'Aerob bas (längre byten), baklängesåkning', 'Aerobic base (longer shifts), backward skating')}</li>
              <li>• <strong>{tr(locale, 'Styrka:', 'Strength:')}</strong> {tr(locale, 'Överkropp för dueller, höft/gluteal', 'Upper body for battles, hip/gluteal')}</li>
              <li>• <strong>{tr(locale, 'Kondition:', 'Conditioning:')}</strong> {tr(locale, 'Uthållighet + återhämtning', 'Endurance + recovery')}</li>
              <li>• <strong>{tr(locale, 'Förebyggande:', 'Prevention:')}</strong> {tr(locale, 'Höft, ljumske, axlar', 'Hip, groin, shoulders')}</li>
            </ul>
          ) : hockeySettings.position === 'center' ? (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>{tr(locale, 'Prioritet:', 'Priority:')}</strong> {tr(locale, 'Core för tekningar, tvåvägskondition', 'Core for faceoffs, two-way conditioning')}</li>
              <li>• <strong>{tr(locale, 'Styrka:', 'Strength:')}</strong> {tr(locale, 'Rotation, överkropp, explosivitet', 'Rotation, upper body, explosiveness')}</li>
              <li>• <strong>{tr(locale, 'Kondition:', 'Conditioning:')}</strong> {tr(locale, 'Sprint-återhämtning', 'Sprint recovery')}</li>
              <li>• <strong>{tr(locale, 'Förebyggande:', 'Prevention:')}</strong> {tr(locale, 'Ljumske, handled', 'Groin, wrist')}</li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1" style={{ color: theme.colors.textMuted }}>
              <li>• <strong>{tr(locale, 'Prioritet:', 'Priority:')}</strong> {tr(locale, 'Maximal sprint, skottstyrka', 'Max sprint, shot power')}</li>
              <li>• <strong>{tr(locale, 'Styrka:', 'Strength:')}</strong> {tr(locale, 'Explosiv power, rotation', 'Explosive power, rotation')}</li>
              <li>• <strong>{tr(locale, 'Kondition:', 'Conditioning:')}</strong> {tr(locale, 'Anaerob kapacitet', 'Anaerobic capacity')}</li>
              <li>• <strong>{tr(locale, 'Förebyggande:', 'Prevention:')}</strong> {tr(locale, 'Hamstrings, ljumske', 'Hamstrings, groin')}</li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Training Access Summary */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: theme.colors.textPrimary }}>
            <Calendar className="h-4 w-4" />
            {tr(locale, 'Träningsförutsättningar', 'Training access')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {hockeySettings.hasAccessToIce && (
                <Badge variant="outline">❄️ {tr(locale, 'Istid', 'Ice time')}</Badge>
              )}
              {hockeySettings.hasAccessToGym && (
                <Badge variant="outline">🏋️ Gym</Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: theme.colors.textPrimary }}>
                {hockeySettings.weeklyOffIceSessions}
              </div>
              <div className="text-xs" style={{ color: theme.colors.textMuted }}>{tr(locale, 'off-ice pass/v', 'off-ice sessions/wk')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test History */}
      <SportTestHistory
        clientId={clientId}
        sport="TEAM_ICE_HOCKEY"
        title="Testhistorik - Ishockey"
        protocolLabels={{
          YOYO_IR1: 'Yo-Yo IR1',
          SPRINT_30M: '30m Sprint',
          PRO_AGILITY_5_10_5: '5-10-5 Agility',
          VERTICAL_JUMP_CMJ: 'CMJ',
        }}
      />
    </div>
  )
}

export default HockeyAthleteView
