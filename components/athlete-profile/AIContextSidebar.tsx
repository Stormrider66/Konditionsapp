'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, ExternalLink, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useLocale } from '@/i18n/client'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import {
  buildDataSourceStatuses,
  calculateDataQualityScore,
  getDataQualityLabel,
  getFreshnessDotClass,
  type DataSourceStatus,
  type AthleteProfileLocale,
} from '@/lib/athlete-profile/freshness-calculator'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'

interface AIContextSidebarProps {
  data: AthleteProfileData
  clientId: string
  clientName: string
}

const COPY: Record<AthleteProfileLocale, {
  title: string
  description: string
  quality: string
  availableSources: (available: number, total: number) => string
  dataSources: string
  quickActions: string
  openAiStudio: string
  generateProgram: string
  analyzeProgression: string
  generateProgramPrompt: string
  analyzeProgressionPrompt: string
  tipsTitle: string
  lactateTip: string
  raceTip: string
  checkInTip: string
  missing: string
  recordCount: (count: number) => string
}> = {
  en: {
    title: 'AI context',
    description: 'Data foundation for AI analysis',
    quality: 'Data quality',
    availableSources: (available, total) => `${available} of ${total} data sources available`,
    dataSources: 'Data sources',
    quickActions: 'Quick actions',
    openAiStudio: 'Open AI Studio',
    generateProgram: 'Create training program',
    analyzeProgression: 'Analyze progression',
    generateProgramPrompt: 'Create a training program',
    analyzeProgressionPrompt: 'Analyze my progression',
    tipsTitle: 'Tips for better AI analysis',
    lactateTip: 'Add a lactate test for training zones',
    raceTip: 'Register race results for VDOT',
    checkInTip: 'Enable daily check-ins for readiness',
    missing: 'Missing',
    recordCount: (count) => `${count} records`,
  },
  sv: {
    title: 'AI-kontext',
    description: 'Dataunderlag för AI-analys',
    quality: 'Datakvalitet',
    availableSources: (available, total) => `${available} av ${total} datakällor tillgängliga`,
    dataSources: 'Datakällor',
    quickActions: 'Snabbåtgärder',
    openAiStudio: 'Öppna AI Studio',
    generateProgram: 'Skapa träningsprogram',
    analyzeProgression: 'Analysera progression',
    generateProgramPrompt: 'Skapa ett träningsprogram',
    analyzeProgressionPrompt: 'Analysera min progression',
    tipsTitle: 'Tips för bättre AI-analys',
    lactateTip: 'Lägg till ett laktattest för träningszoner',
    raceTip: 'Registrera tävlingsresultat för VDOT',
    checkInTip: 'Aktivera daglig incheckning för beredskap',
    missing: 'Saknas',
    recordCount: (count) => `${count} st`,
  },
}

const SOURCE_LABELS: Record<string, Record<AthleteProfileLocale, string>> = {
  test: { en: 'Lab tests', sv: 'Labbtest' },
  fieldTest: { en: 'Field tests', sv: 'Fälttest' },
  raceResult: { en: 'Race results', sv: 'Tävlingsresultat' },
  bodyComposition: { en: 'Body composition', sv: 'Kroppssammansättning' },
  dailyCheckIn: { en: 'Daily check-ins', sv: 'Daglig incheckning' },
  videoAnalysis: { en: 'Video analysis', sv: 'Videoanalys' },
  injuryAssessment: { en: 'Injury assessments', sv: 'Skadebedömning' },
  trainingLoad: { en: 'Training load', sv: 'Träningsbelastning' },
  strengthProgression: { en: 'Strength PRs', sv: 'Styrke-PRs' },
  menstrualCycle: { en: 'Menstrual cycle', sv: 'Menscykel' },
}

function getAppLocale(locale: string): AthleteProfileLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function getStatusIcon(status: DataSourceStatus['freshnessStatus']) {
  switch (status) {
    case 'fresh':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />
    case 'stale':
      return <Clock className="h-3 w-3 text-yellow-500" />
    case 'expired':
      return <AlertCircle className="h-3 w-3 text-orange-500" />
    case 'missing':
      return <XCircle className="h-3 w-3 text-gray-300" />
  }
}

export function AIContextSidebar({ data, clientId }: AIContextSidebarProps) {
  const pathname = usePathname()
  const locale = getAppLocale(useLocale())
  const copy = COPY[locale]
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''

  // Build data source statuses
  const dataSourceStatuses = buildDataSourceStatuses({
    tests: data.physiology.tests,
    fieldTests: data.physiology.fieldTests,
    raceResults: data.performance.raceResults,
    bodyCompositions: data.bodyComposition.measurements,
    dailyCheckIns: data.health.dailyCheckIns,
    dailyMetrics: data.health.dailyMetrics,
    videoAnalyses: data.technique.videoAnalyses,
    injuryAssessments: data.health.injuryAssessments,
    // WORKOUT rows only — the nightly ACWR_SUMMARY rows would make load data
    // look fresh (and ~2× as plentiful) even when the athlete stopped logging.
    trainingLoads: data.training.trainingLoads.filter((l) => l.source === 'WORKOUT'),
    progressionTracking: data.performance.progressionTracking,
    menstrualCycles: data.menstrual.cycles,
    sportProfile: data.identity.sportProfile,
    athleteProfile: data.identity.athleteProfile,
  }, locale)

  // Calculate overall data quality
  const qualityScore = calculateDataQualityScore(dataSourceStatuses)
  const qualityLabel = getDataQualityLabel(qualityScore, locale)

  // Count available vs missing
  const availableCount = dataSourceStatuses.filter((s) => s.available).length
  const totalCount = dataSourceStatuses.length

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {copy.title}
        </CardTitle>
        <CardDescription>
          {copy.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Data Quality Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{copy.quality}</span>
            <span className={`font-medium ${qualityLabel.colorClass}`}>
              {qualityLabel.label} ({qualityScore}%)
            </span>
          </div>
          <Progress value={qualityScore} className="h-2" />
          <p className="text-xs text-gray-500">
            {copy.availableSources(availableCount, totalCount)}
          </p>
        </div>

        {/* Data Sources List */}
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {copy.dataSources}
          </p>
          {dataSourceStatuses.map((source) => (
            <DataSourceRow key={source.name} source={source} locale={locale} copy={copy} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {copy.quickActions}
          </p>

          <Link href={`${basePath}/coach/ai-studio?athleteId=${clientId}`} className="block">
            <Button variant="default" className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              {copy.openAiStudio}
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </Link>

          <Link
            href={`${basePath}/coach/ai-studio?athleteId=${clientId}&prompt=${encodeURIComponent(copy.generateProgramPrompt)}`}
            className="block"
          >
            <Button variant="outline" size="sm" className="w-full text-sm">
              {copy.generateProgram}
            </Button>
          </Link>

          <Link
            href={`${basePath}/coach/ai-studio?athleteId=${clientId}&prompt=${encodeURIComponent(copy.analyzeProgressionPrompt)}`}
            className="block"
          >
            <Button variant="outline" size="sm" className="w-full text-sm">
              {copy.analyzeProgression}
            </Button>
          </Link>
        </div>

        {/* Tips */}
        {qualityScore < 60 && (
          <div className="pt-4 border-t">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
              <p className="font-medium text-amber-800 mb-1">{copy.tipsTitle}</p>
              <ul className="text-amber-700 space-y-1">
                {!data.physiology.tests.length && (
                  <li>• {copy.lactateTip}</li>
                )}
                {!data.performance.raceResults.length && (
                  <li>• {copy.raceTip}</li>
                )}
                {!data.health.dailyCheckIns.length && (
                  <li>• {copy.checkInTip}</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DataSourceRow({
  source,
  locale,
  copy,
}: {
  source: DataSourceStatus
  locale: AthleteProfileLocale
  copy: typeof COPY[AthleteProfileLocale]
}) {
  const dotClass = getFreshnessDotClass(source.freshnessStatus)
  const label = SOURCE_LABELS[source.name]?.[locale] ?? (locale === 'sv' ? source.nameSv : source.name)

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <div className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className={source.available ? 'text-gray-700' : 'text-gray-400'}>
        {label}
      </span>
      {source.available && (
        <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
          {getStatusIcon(source.freshnessStatus)}
          {source.recordCount > 1 && copy.recordCount(source.recordCount)}
        </span>
      )}
      {!source.available && (
        <span className="text-xs text-gray-400 ml-auto">{copy.missing}</span>
      )}
    </div>
  )
}
