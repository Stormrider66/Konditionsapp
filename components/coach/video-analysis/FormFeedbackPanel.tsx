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

interface FormFeedbackPanelProps {
  angles: JointAngle[]
  videoType: 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'
  exerciseName?: string
  exerciseNameSv?: string
}

export function FormFeedbackPanel({
  angles,
  videoType,
  exerciseName,
  exerciseNameSv,
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
    const score = total > 0 ? Math.round((good / total) * 100) : 0
    return { good, warning, critical, total, score }
  }, [feedback])

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

        {/* General coaching cues */}
        {criteria.generalCues.length > 0 && (
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
