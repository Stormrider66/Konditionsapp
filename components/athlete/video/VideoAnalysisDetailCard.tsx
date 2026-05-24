'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock, Eye, Target, Lightbulb, TrendingUp, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { SquatJumpPowerEstimate } from '@/lib/video-analysis/squat-jump-power'

export interface AIPoseAnalysis {
  interpretation?: string
  technicalFeedback?: Array<{
    area: string
    observation: string
    impact: string
    suggestion: string
  }>
  patterns?: Array<{
    pattern: string
    significance: string
  }>
  recommendations?: Array<{
    priority: number
    title: string
    description: string
    exercises: string[]
  }>
  overallAssessment?: string
  score?: number
  powerEstimate?: SquatJumpPowerEstimate | null
}

interface VideoAnalysisDetailCardProps {
  analysis: {
    id: string
    createdAt: Date
    videoUrl: string | null
    videoError?: string | null
    videoType: string | null
    cameraAngle: string | null
    formScore: number | null
    aiAnalysis: string | null
    aiPoseAnalysis: AIPoseAnalysis | null
    status: string
    exercise: {
      name: string
      nameSv: string | null
    } | null
  }
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function getCameraAngleLabel(angle: string | null, locale: AppLocale): string {
  if (!angle) return ''
  switch (angle.toUpperCase()) {
    case 'SAGITTAL':
    case 'SIDE':
      return t(locale, 'Sidovy', 'Side view')
    case 'FRONTAL':
    case 'FRONT':
    case 'BACK':
      return t(locale, 'Fram-/Bakvy', 'Front/back view')
    default:
      return angle
  }
}

function getVideoTypeLabel(type: string | null, locale: AppLocale): string {
  if (!type) return 'Video'
  switch (type) {
    case 'RUNNING_GAIT':
      return t(locale, 'Lopanalys', 'Running analysis')
    case 'STRENGTH':
      return t(locale, 'Styrkeovning', 'Strength exercise')
    case 'SPORT_SPECIFIC':
      return t(locale, 'Sportspecifik', 'Sport-specific')
    default:
      return type
  }
}

export function VideoAnalysisDetailCard({ analysis }: VideoAnalysisDetailCardProps) {
  const locale = getAppLocale(useLocale())
  const [isExpanded, setIsExpanded] = useState(false)

  const poseAnalysis = analysis.aiPoseAnalysis
  const hasAnalysis = poseAnalysis || analysis.aiAnalysis
  const isCompleted = analysis.status === 'COMPLETED'
  const isPending = analysis.status === 'PENDING' || analysis.status === 'PROCESSING'
  const exerciseName = locale === 'sv'
    ? analysis.exercise?.nameSv || analysis.exercise?.name
    : analysis.exercise?.name || analysis.exercise?.nameSv

  return (
    <div className="border rounded-lg overflow-hidden transition-all">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        disabled={!hasAnalysis}
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="font-medium">
              {exerciseName || getVideoTypeLabel(analysis.videoType, locale)}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{new Date(analysis.createdAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}</span>
              {analysis.cameraAngle && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {getCameraAngleLabel(analysis.cameraAngle, locale)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {analysis.formScore !== null && (
            <Badge variant="outline" className={cn('font-semibold', getScoreColor(analysis.formScore))}>
              {analysis.formScore}/100
            </Badge>
          )}

          {isPending && (
            <Badge variant="outline" className="bg-gray-50 text-gray-600">
              <Clock className="h-3 w-3 mr-1" />
              {t(locale, 'Väntar', 'Pending')}
            </Badge>
          )}

          {isCompleted && hasAnalysis && (
            <Badge variant="outline" className="bg-green-50 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t(locale, 'Analyserad', 'Analyzed')}
            </Badge>
          )}

          {hasAnalysis && (
            isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && hasAnalysis && (
        <div className="border-t p-4 space-y-4 bg-muted/20">
          {/* Video Player */}
          {analysis.videoUrl && (
            <div className="rounded-lg overflow-hidden border bg-black">
              <video
                src={analysis.videoUrl}
                controls
                className="w-full max-h-[400px] object-contain"
                preload="metadata"
              >
                {t(locale, 'Din webbläsare stöder inte videouppspelning.', 'Your browser does not support video playback.')}
              </video>
            </div>
          )}

          {!analysis.videoUrl && analysis.videoError && (
            <div className="p-3 rounded-lg border bg-yellow-50 text-yellow-900 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-700" />
              <div>
                <p className="font-medium">{t(locale, 'Videon är inte tillgänglig', 'Video is unavailable')}</p>
                <p className="text-yellow-800">{analysis.videoError}</p>
              </div>
            </div>
          )}

          {/* Score and Overall Assessment */}
          {poseAnalysis?.overallAssessment && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-1.5 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                {t(locale, 'Sammanfattning', 'Summary')} <InfoTooltip conceptKey="videoAnalysisScores" />
              </h4>
              <p className="text-sm text-muted-foreground">{poseAnalysis.overallAssessment}</p>
            </div>
          )}

          {/* Interpretation */}
          {poseAnalysis?.interpretation && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                {t(locale, 'Tolkning', 'Interpretation')}
              </h4>
              <p className="text-sm text-muted-foreground">{poseAnalysis.interpretation}</p>
            </div>
          )}

          {poseAnalysis?.powerEstimate?.status === 'ready' && poseAnalysis.powerEstimate.metrics && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-orange-600" />
                {t(locale, 'Squat jump-effekt', 'Squat jump power')}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">{t(locale, 'Hopphöjd', 'Jump height')}</p>
                  <p className="font-mono font-semibold">{poseAnalysis.powerEstimate.metrics.jumpHeightCm} cm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t(locale, 'Flygtid', 'Flight time')}</p>
                  <p className="font-mono font-semibold">{poseAnalysis.powerEstimate.metrics.flightTimeMs} ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t(locale, 'Takeoff', 'Takeoff')}</p>
                  <p className="font-mono font-semibold">{poseAnalysis.powerEstimate.metrics.takeoffVelocityMps} m/s</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t(locale, 'Medeleffekt', 'Mean power')}</p>
                  <p className="font-mono font-semibold">
                    {poseAnalysis.powerEstimate.metrics.estimatedMeanPowerW
                      ? `${poseAnalysis.powerEstimate.metrics.estimatedMeanPowerW} W`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Technical Feedback */}
          {poseAnalysis?.technicalFeedback && poseAnalysis.technicalFeedback.length > 0 && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                {t(locale, 'Teknisk feedback', 'Technical feedback')}
              </h4>
              <div className="space-y-3">
                {poseAnalysis.technicalFeedback.map((fb, i) => (
                  <div key={i} className="pl-4 border-l-2 border-orange-200">
                    <p className="font-medium text-sm">{fb.area}</p>
                    <p className="text-sm text-muted-foreground">{fb.observation}</p>
                    {fb.impact && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">{t(locale, 'Påverkan:', 'Impact:')}</span> {fb.impact}
                      </p>
                    )}
                    {fb.suggestion && (
                      <p className="text-xs text-green-700 mt-1">
                        <span className="font-medium">{t(locale, 'Förslag:', 'Suggestion:')}</span> {fb.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {poseAnalysis?.patterns && poseAnalysis.patterns.length > 0 && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                {t(locale, 'Identifierade mönster', 'Identified patterns')}
              </h4>
              <div className="space-y-2">
                {poseAnalysis.patterns.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Badge variant="secondary" className="shrink-0">{p.pattern}</Badge>
                    <span className="text-sm text-muted-foreground">{p.significance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {poseAnalysis?.recommendations && poseAnalysis.recommendations.length > 0 && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {t(locale, 'Rekommendationer', 'Recommendations')}
              </h4>
              <div className="space-y-3">
                {[...poseAnalysis.recommendations]
                  .sort((a, b) => a.priority - b.priority)
                  .map((rec, i) => (
                    <div key={i} className="pl-4 border-l-2 border-green-200">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                          {rec.priority}
                        </span>
                        <p className="font-medium text-sm">{rec.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                      {rec.exercises && rec.exercises.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {rec.exercises.map((ex, j) => (
                            <Badge key={j} variant="outline" className="text-xs">
                              {ex}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Fallback to aiAnalysis text if no structured analysis */}
          {!poseAnalysis && analysis.aiAnalysis && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold mb-2">{t(locale, 'Analysresultat', 'Analysis result')}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.aiAnalysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
