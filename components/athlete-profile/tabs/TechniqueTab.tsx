'use client'

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import Link from 'next/link'
import { Video, Play, AlertCircle, CheckCircle, Activity, Footprints, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface TechniqueTabProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
}

export function TechniqueTab({ data, viewMode }: TechniqueTabProps) {
  const { videoAnalyses, gaitAnalyses } = data.technique

  const hasData = videoAnalyses.length > 0 || gaitAnalyses.length > 0

  // Get average form score
  const avgFormScore =
    videoAnalyses.length > 0
      ? videoAnalyses.reduce((sum, v) => sum + (v.formScore || 0), 0) / videoAnalyses.length
      : null

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen teknikdata</h3>
          <p className="text-gray-500 mb-4">
            Ladda upp videoanalyser för att se teknikdata här.
          </p>
          {viewMode === 'coach' && (
            <Link href={`/coach/video-analysis`}>
              <Button>Analysera video</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {avgFormScore !== null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Genomsnittlig formpoäng</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-3xl font-bold ${getScoreColor(avgFormScore)}`}>
                      {avgFormScore.toFixed(0)}
                    </span>
                    <span className="text-gray-500">/100</span>
                  </div>
                </div>
                <FormScoreGauge score={avgFormScore} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-gray-500">Antal analyser</p>
                <p className="text-3xl font-bold mt-1">{videoAnalyses.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-gray-500">Senaste analys</p>
                <p className="text-lg font-medium mt-1">
                  {videoAnalyses[0]
                    ? format(new Date(videoAnalyses[0].createdAt), 'd MMM yyyy', { locale: sv })
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Running Gait Analysis */}
      {gaitAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Footprints className="h-5 w-5 text-green-500" />
              Löpteknikanalys
            </CardTitle>
            <CardDescription>
              Senaste gånganalys:{' '}
              {format(new Date(gaitAnalyses[0].createdAt), 'd MMMM yyyy', { locale: sv })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <GaitMetric
                label="Kadans"
                value={gaitAnalyses[0].cadence}
                unit="steg/min"
                optimal="180"
              />
              <GaitMetric
                label="Markkontakttid"
                value={gaitAnalyses[0].groundContactTime}
                unit="ms"
                optimal="<250"
              />
              <GaitMetric
                label="Vertikal oscillation"
                value={gaitAnalyses[0].verticalOscillation}
                unit="cm"
                optimal="<8"
              />
              <GaitMetric
                label="Steglängd"
                value={gaitAnalyses[0].strideLength}
                unit="m"
              />
            </div>

            {/* Asymmetry & Injury Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              {gaitAnalyses[0].asymmetryPercent !== null && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Asymmetri</p>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={100 - Math.min(gaitAnalyses[0].asymmetryPercent * 10, 100)}
                      className="flex-1"
                    />
                    <span className={`font-medium ${gaitAnalyses[0].asymmetryPercent > 5 ? 'text-orange-600' : 'text-green-600'}`}>
                      {gaitAnalyses[0].asymmetryPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Optimal: &lt;5%</p>
                </div>
              )}

              {gaitAnalyses[0].injuryRiskLevel && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Skaderisk</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getInjuryRiskVariant(gaitAnalyses[0].injuryRiskLevel)}>
                      {getInjuryRiskLabel(gaitAnalyses[0].injuryRiskLevel)}
                    </Badge>
                    {gaitAnalyses[0].injuryRiskScore && (
                      <span className="text-sm text-gray-500">
                        ({gaitAnalyses[0].injuryRiskScore}/100)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Coaching Cues */}
            {gaitAnalyses[0].coachingCues && gaitAnalyses[0].coachingCues.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Coachingpunkter</p>
                <ul className="space-y-1">
                  {gaitAnalyses[0].coachingCues.map((cueItem, idx) => {
                    const cueText = typeof cueItem === 'string' ? cueItem : (cueItem as any).cue
                    return (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        {cueText}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Video Analyses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Videoanalyser
              </CardTitle>
              <CardDescription>{videoAnalyses.length} analyser genomförda</CardDescription>
            </div>
            {viewMode === 'coach' && (
              <Link href={`/coach/video-analysis`}>
                <Button size="sm">+ Ny analys</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {videoAnalyses.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Inga videoanalyser ännu</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoAnalyses.slice(0, 6).map((analysis) => (
                <VideoAnalysisCard key={analysis.id} analysis={analysis} />
              ))}
            </div>
          )}

          {videoAnalyses.length > 6 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              +{videoAnalyses.length - 6} fler analyser
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper components
function VideoAnalysisCard({
  analysis,
}: {
  analysis: AthleteProfileData['technique']['videoAnalyses'][0]
}) {
  const issueCount = analysis.issuesDetected?.length || 0

  return (
    <div className="p-4 border rounded-lg hover:border-blue-300 transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Play className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">
              {analysis.exercise?.nameSv || analysis.exercise?.name || getVideoTypeLabel(analysis.videoType)}
            </p>
            <p className="text-sm text-gray-500">
              {format(new Date(analysis.createdAt), 'd MMM yyyy', { locale: sv })}
            </p>
          </div>
        </div>
        {analysis.formScore !== null && (
          <FormScoreBadge score={analysis.formScore} />
        )}
      </div>

      {/* Issues Summary */}
      <div className="flex items-center gap-4 text-sm">
        {issueCount > 0 ? (
          <span className="flex items-center gap-1 text-orange-600">
            <AlertCircle className="h-4 w-4" />
            {issueCount} problem
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Inga problem
          </span>
        )}

        <Badge variant="outline">{getVideoTypeLabel(analysis.videoType)}</Badge>
      </div>

      {/* Top Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1">Rekommendationer</p>
          <p className="text-sm text-gray-700 line-clamp-2">
            {(analysis.recommendations[0] as any)?.recommendation || 'Ingen rekommendation'}
          </p>
        </div>
      )}
    </div>
  )
}

function FormScoreGauge({ score }: { score: number }) {
  const color = getScoreColor(score)

  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <circle
          className="text-gray-200"
          strokeWidth="3"
          stroke="currentColor"
          fill="transparent"
          r="16"
          cx="18"
          cy="18"
        />
        <circle
          className={color.replace('text-', 'text-')}
          strokeWidth="3"
          stroke="currentColor"
          fill="transparent"
          r="16"
          cx="18"
          cy="18"
          strokeDasharray={`${score} 100`}
        />
      </svg>
    </div>
  )
}

function FormScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-green-100 text-green-800'
      : score >= 60
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800'

  return (
    <div className={`px-2 py-1 rounded-lg ${color}`}>
      <span className="font-bold">{score}</span>
      <span className="text-xs">/100</span>
    </div>
  )
}

function GaitMetric({
  label,
  value,
  unit,
  optimal,
}: {
  label: string
  value: number | null
  unit: string
  optimal?: string
}) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold">
        {value !== null ? value.toFixed(value % 1 === 0 ? 0 : 1) : '-'}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </p>
      {optimal && <p className="text-xs text-gray-400 mt-1">Optimal: {optimal}</p>}
    </div>
  )
}

// Helper functions
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getVideoTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    STRENGTH: 'Styrka',
    RUNNING_GAIT: 'Löpteknik',
    SPORT_SPECIFIC: 'Sportspecifik',
  }
  return labels[type] || type
}

function getInjuryRiskLabel(level: string): string {
  const labels: Record<string, string> = {
    LOW: 'Låg',
    MODERATE: 'Måttlig',
    HIGH: 'Hög',
    VERY_HIGH: 'Mycket hög',
  }
  return labels[level] || level
}

function getInjuryRiskVariant(level: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (level) {
    case 'LOW':
      return 'default'
    case 'MODERATE':
      return 'secondary'
    case 'HIGH':
    case 'VERY_HIGH':
      return 'destructive'
    default:
      return 'outline'
  }
}
