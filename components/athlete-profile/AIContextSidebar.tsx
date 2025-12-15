'use client'

import Link from 'next/link'
import { Sparkles, ExternalLink, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import {
  buildDataSourceStatuses,
  calculateDataQualityScore,
  getDataQualityLabel,
  getFreshnessDotClass,
  type DataSourceStatus,
} from '@/lib/athlete-profile/freshness-calculator'

interface AIContextSidebarProps {
  data: AthleteProfileData
  clientId: string
  clientName: string
}

export function AIContextSidebar({ data, clientId, clientName }: AIContextSidebarProps) {
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
    trainingLoads: data.training.trainingLoads,
    progressionTracking: data.performance.progressionTracking,
    menstrualCycles: data.menstrual.cycles,
    sportProfile: data.identity.sportProfile,
    athleteProfile: data.identity.athleteProfile,
  })

  // Calculate overall data quality
  const qualityScore = calculateDataQualityScore(dataSourceStatuses)
  const qualityLabel = getDataQualityLabel(qualityScore)

  // Count available vs missing
  const availableCount = dataSourceStatuses.filter((s) => s.available).length
  const totalCount = dataSourceStatuses.length

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI-kontext
        </CardTitle>
        <CardDescription>
          Dataunderlag för AI-analys
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Data Quality Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Datakvalitet</span>
            <span className={`font-medium ${qualityLabel.colorClass}`}>
              {qualityLabel.label} ({qualityScore}%)
            </span>
          </div>
          <Progress value={qualityScore} className="h-2" />
          <p className="text-xs text-gray-500">
            {availableCount} av {totalCount} datakällor tillgängliga
          </p>
        </div>

        {/* Data Sources List */}
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Datakällor
          </p>
          {dataSourceStatuses.map((source) => (
            <DataSourceRow key={source.name} source={source} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Snabbåtgärder
          </p>

          <Link href={`/coach/ai-studio?athleteId=${clientId}`} className="block">
            <Button variant="default" className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Öppna AI Studio
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </Link>

          <Link
            href={`/coach/ai-studio?athleteId=${clientId}&prompt=Skapa+ett+träningsprogram`}
            className="block"
          >
            <Button variant="outline" size="sm" className="w-full text-sm">
              Skapa träningsprogram
            </Button>
          </Link>

          <Link
            href={`/coach/ai-studio?athleteId=${clientId}&prompt=Analysera+min+progression`}
            className="block"
          >
            <Button variant="outline" size="sm" className="w-full text-sm">
              Analysera progression
            </Button>
          </Link>
        </div>

        {/* Tips */}
        {qualityScore < 60 && (
          <div className="pt-4 border-t">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
              <p className="font-medium text-amber-800 mb-1">Tips för bättre AI-analys</p>
              <ul className="text-amber-700 space-y-1">
                {!data.physiology.tests.length && (
                  <li>• Lägg till ett laktattest för träningszoner</li>
                )}
                {!data.performance.raceResults.length && (
                  <li>• Registrera tävlingsresultat för VDOT</li>
                )}
                {!data.health.dailyCheckIns.length && (
                  <li>• Aktivera daglig incheckning för beredskap</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DataSourceRow({ source }: { source: DataSourceStatus }) {
  const dotClass = getFreshnessDotClass(source.freshnessStatus)

  const StatusIcon = () => {
    switch (source.freshnessStatus) {
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

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <div className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className={source.available ? 'text-gray-700' : 'text-gray-400'}>
        {source.nameSv}
      </span>
      {source.available && (
        <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
          <StatusIcon />
          {source.recordCount > 1 && `${source.recordCount} st`}
        </span>
      )}
      {!source.available && (
        <span className="text-xs text-gray-400 ml-auto">Saknas</span>
      )}
    </div>
  )
}
