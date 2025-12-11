'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
  Lightbulb,
  TrendingUp,
  Sparkles,
  Info,
} from 'lucide-react'
import {
  getExerciseFormCriteria,
  generateFormFeedback,
  type FormFeedback,
  type ExerciseFormCriteria,
} from '@/lib/video-analysis/exercise-form-criteria'

interface JointAngle {
  name: string
  angle: number
  status: 'good' | 'warning' | 'critical'
}

// AI Analysis data from Gemini
interface AIAnalysisData {
  formScore: number | null
  issuesDetected: Array<{
    issue: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    timestamp?: string
    description: string
  }> | null
  recommendations: Array<{
    priority: number
    recommendation: string
    explanation: string
  }> | null
  aiAnalysis: string | null
}

interface FormFeedbackPanelProps {
  angles: JointAngle[]
  videoType: 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'
  exerciseName?: string
  exerciseNameSv?: string
  aiAnalysis?: AIAnalysisData
}

export function FormFeedbackPanel({
  angles,
  videoType,
  exerciseName,
  exerciseNameSv,
  aiAnalysis,
}: FormFeedbackPanelProps) {
  const criteria = useMemo(
    () => getExerciseFormCriteria(exerciseName, exerciseNameSv, videoType),
    [exerciseName, exerciseNameSv, videoType]
  )

  const feedback = useMemo(() => {
    if (!criteria || angles.length === 0) return []
    return generateFormFeedback(angles, criteria)
  }, [angles, criteria])

  const stats = useMemo(() => {
    const good = feedback.filter((f) => f.status === 'good').length
    const warning = feedback.filter((f) => f.status === 'warning').length
    const critical = feedback.filter((f) => f.status === 'critical').length
    const total = feedback.length
    // Use AI score if available, otherwise calculate from MediaPipe feedback
    const mediaPipeScore = total > 0 ? Math.round((good / total) * 100) : 0
    const score = aiAnalysis?.formScore ?? mediaPipeScore

    // Count AI issues by severity
    const aiIssues = aiAnalysis?.issuesDetected || []
    const aiHigh = aiIssues.filter(i => i.severity === 'HIGH').length
    const aiMedium = aiIssues.filter(i => i.severity === 'MEDIUM').length
    const aiLow = aiIssues.filter(i => i.severity === 'LOW').length

    return {
      good,
      warning,
      critical,
      total,
      score,
      hasAiAnalysis: !!aiAnalysis?.formScore,
      aiIssues: { high: aiHigh, medium: aiMedium, low: aiLow }
    }
  }, [feedback, aiAnalysis])

  if (!criteria || angles.length === 0) {
    return null
  }

  const getStatusIcon = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Utmärkt teknik'
    if (score >= 80) return 'Mycket bra'
    if (score >= 70) return 'Bra'
    if (score >= 60) return 'Godkänt'
    if (score >= 40) return 'Behöver förbättras'
    return 'Kräver träning'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" />
          Teknikfeedback: {criteria.exerciseNameSv}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score overview */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Teknisk poäng</span>
            <span className={`text-2xl font-bold ${getScoreColor(stats.score)}`}>
              {stats.score}%
            </span>
          </div>
          <Progress value={stats.score} className="h-2 mb-2" />
          <div className="flex items-center justify-between">
            <span className={`text-sm ${getScoreColor(stats.score)}`}>
              {getScoreLabel(stats.score)}
            </span>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {stats.good}
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.warning}
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                {stats.critical}
              </Badge>
            </div>
          </div>
        </div>

        {/* Joint feedback */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Detaljerad analys
          </h4>
          <Accordion type="single" collapsible className="w-full">
            {feedback.map((fb, index) => (
              <AccordionItem key={index} value={`joint-${index}`}>
                <AccordionTrigger className="py-2">
                  <div className="flex items-center gap-2 text-left">
                    {getStatusIcon(fb.status)}
                    <span className="font-medium">{fb.joint}</span>
                    <Badge variant="outline" className={getStatusColor(fb.status)}>
                      {fb.detectedAngle}°
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      (Ideal: {fb.idealRange})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-6 space-y-2">
                    <p className="text-sm">{fb.feedback}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Detekterad:</span>
                      <Badge variant="secondary">{fb.detectedAngle}°</Badge>
                      <span>→</span>
                      <span>Idealområde:</span>
                      <Badge variant="outline">{fb.idealRange}</Badge>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* AI Analysis - Issues Detected */}
        {aiAnalysis?.issuesDetected && aiAnalysis.issuesDetected.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI-identifierade problem
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                Gemini
              </Badge>
            </h4>
            <div className="space-y-2">
              {aiAnalysis.issuesDetected.map((issue, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    issue.severity === 'HIGH'
                      ? 'bg-red-50 border-red-200'
                      : issue.severity === 'MEDIUM'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {issue.severity === 'HIGH' ? (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : issue.severity === 'MEDIUM' ? (
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{issue.issue}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            issue.severity === 'HIGH'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : issue.severity === 'MEDIUM'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}
                        >
                          {issue.severity === 'HIGH' ? 'Hög' : issue.severity === 'MEDIUM' ? 'Medel' : 'Låg'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                      {issue.timestamp && (
                        <span className="text-xs text-muted-foreground">Tidpunkt: {issue.timestamp}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis - Recommendations */}
        {aiAnalysis?.recommendations && aiAnalysis.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              AI-rekommendationer
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                Gemini
              </Badge>
            </h4>
            <div className="space-y-2">
              {aiAnalysis.recommendations
                .sort((a, b) => a.priority - b.priority)
                .map((rec, index) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 border-blue-300 text-xs flex-shrink-0"
                      >
                        #{rec.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.recommendation}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rec.explanation}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* General coaching cues (MediaPipe) */}
        {criteria.generalCues.length > 0 && !aiAnalysis?.recommendations?.length && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Träningstips
            </h4>
            <div className="space-y-1">
              {criteria.generalCues.map((cue, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-yellow-500">•</span>
                  <span>{cue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement priorities */}
        {(stats.critical > 0 || stats.warning > 0) && (
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="text-sm font-medium text-orange-800 mb-2">
              Prioriterade förbättringar
            </h4>
            <div className="space-y-1">
              {feedback
                .filter((f) => f.status === 'critical')
                .map((fb, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{fb.joint}:</strong> {fb.feedback}
                    </span>
                  </div>
                ))}
              {feedback
                .filter((f) => f.status === 'warning')
                .map((fb, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{fb.joint}:</strong> {fb.feedback}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
