'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Clock, Eye, Target, Lightbulb, TrendingUp, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

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

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function getCameraAngleLabel(angle: string | null): string {
  if (!angle) return ''
  switch (angle.toUpperCase()) {
    case 'SAGITTAL':
    case 'SIDE':
      return 'Sidovy'
    case 'FRONTAL':
    case 'FRONT':
    case 'BACK':
      return 'Fram-/Bakvy'
    default:
      return angle
  }
}

function getVideoTypeLabel(type: string | null): string {
  if (!type) return 'Video'
  switch (type) {
    case 'RUNNING_GAIT':
      return 'Lopanalys'
    case 'STRENGTH':
      return 'Styrkeovning'
    case 'SPORT_SPECIFIC':
      return 'Sportspecifik'
    default:
      return type
  }
}

export function VideoAnalysisDetailCard({ analysis }: VideoAnalysisDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const poseAnalysis = analysis.aiPoseAnalysis
  const hasAnalysis = poseAnalysis || analysis.aiAnalysis
  const isCompleted = analysis.status === 'COMPLETED'
  const isPending = analysis.status === 'PENDING' || analysis.status === 'PROCESSING'

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
              {analysis.exercise?.nameSv || analysis.exercise?.name || getVideoTypeLabel(analysis.videoType)}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{new Date(analysis.createdAt).toLocaleDateString('sv-SE')}</span>
              {analysis.cameraAngle && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {getCameraAngleLabel(analysis.cameraAngle)}
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
              Vantar
            </Badge>
          )}

          {isCompleted && hasAnalysis && (
            <Badge variant="outline" className="bg-green-50 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Analyserad
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
                Din webbläsare stöder inte videouppspelning.
              </video>
            </div>
          )}

          {!analysis.videoUrl && analysis.videoError && (
            <div className="p-3 rounded-lg border bg-yellow-50 text-yellow-900 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-700" />
              <div>
                <p className="font-medium">Videon är inte tillgänglig</p>
                <p className="text-yellow-800">{analysis.videoError}</p>
              </div>
            </div>
          )}

          {/* Score and Overall Assessment */}
          {poseAnalysis?.overallAssessment && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-1.5 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                Sammanfattning <InfoTooltip conceptKey="videoAnalysisScores" />
              </h4>
              <p className="text-sm text-muted-foreground">{poseAnalysis.overallAssessment}</p>
            </div>
          )}

          {/* Interpretation */}
          {poseAnalysis?.interpretation && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                Tolkning
              </h4>
              <p className="text-sm text-muted-foreground">{poseAnalysis.interpretation}</p>
            </div>
          )}

          {/* Technical Feedback */}
          {poseAnalysis?.technicalFeedback && poseAnalysis.technicalFeedback.length > 0 && (
            <div className="p-4 bg-background rounded-lg border">
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                Teknisk feedback
              </h4>
              <div className="space-y-3">
                {poseAnalysis.technicalFeedback.map((fb, i) => (
                  <div key={i} className="pl-4 border-l-2 border-orange-200">
                    <p className="font-medium text-sm">{fb.area}</p>
                    <p className="text-sm text-muted-foreground">{fb.observation}</p>
                    {fb.impact && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Paverkan:</span> {fb.impact}
                      </p>
                    )}
                    {fb.suggestion && (
                      <p className="text-xs text-green-700 mt-1">
                        <span className="font-medium">Forslag:</span> {fb.suggestion}
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
                Identifierade monster
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
                Rekommendationer
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
              <h4 className="font-semibold mb-2">Analysresultat</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.aiAnalysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
