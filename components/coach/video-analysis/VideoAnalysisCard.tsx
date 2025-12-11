'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import {
  Video,
  Play,
  Loader2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  Calendar,
  User,
  Dumbbell,
  PersonStanding,
  Activity,
  ThumbsUp,
  Target,
  Scan,
} from 'lucide-react'
import { PoseAnalyzer, PoseFrame } from './PoseAnalyzer'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'

interface Issue {
  issue: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp?: string
  description: string
}

interface Recommendation {
  priority: number
  recommendation: string
  explanation: string
}

interface VideoAnalysis {
  id: string
  videoUrl: string
  videoType: string
  status: string
  formScore: number | null
  aiAnalysis: string | null
  issuesDetected: Issue[] | null
  recommendations: Recommendation[] | null
  createdAt: string
  athlete: { id: string; name: string } | null
  exercise: { id: string; name: string; nameSv: string | null } | null
}

interface VideoAnalysisCardProps {
  analysis: VideoAnalysis
  onDelete: () => void
  onAnalysisComplete: () => void
}

const VIDEO_TYPE_INFO = {
  STRENGTH: { label: 'Styrkeövning', icon: Dumbbell, color: 'text-orange-500' },
  RUNNING_GAIT: { label: 'Löpteknik', icon: PersonStanding, color: 'text-blue-500' },
  SPORT_SPECIFIC: { label: 'Sportspecifik', icon: Activity, color: 'text-purple-500' },
}

const STATUS_INFO = {
  PENDING: { label: 'Väntar', color: 'bg-gray-100 text-gray-700' },
  PROCESSING: { label: 'Analyserar...', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Klar', color: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Misslyckades', color: 'bg-red-100 text-red-700' },
}

const SEVERITY_INFO = {
  LOW: { label: 'Låg', color: 'bg-yellow-100 text-yellow-800', icon: Info },
  MEDIUM: { label: 'Medel', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  HIGH: { label: 'Hög', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Utmärkt'
  if (score >= 80) return 'Mycket bra'
  if (score >= 70) return 'Bra'
  if (score >= 60) return 'Godkänt'
  if (score >= 50) return 'Behöver förbättras'
  return 'Behöver betydande förbättring'
}

// Helper to parse AI analysis that might be JSON or plain text
function parseAIAnalysis(aiAnalysis: string): { isJson: boolean; data: unknown; text: string } {
  let text = aiAnalysis.trim()

  // Remove markdown code blocks if present
  if (text.startsWith('```json')) {
    text = text.slice(7)
  } else if (text.startsWith('```')) {
    text = text.slice(3)
  }
  if (text.endsWith('```')) {
    text = text.slice(0, -3)
  }
  text = text.trim()

  // Try to parse as JSON
  try {
    const data = JSON.parse(text)
    return { isJson: true, data, text }
  } catch {
    return { isJson: false, data: null, text: aiAnalysis }
  }
}

// Render parsed AI analysis in a formatted way
function FormattedAIAnalysis({ aiAnalysis }: { aiAnalysis: string }) {
  const { isJson, data } = parseAIAnalysis(aiAnalysis)

  if (!isJson || !data || typeof data !== 'object') {
    // Plain text - just display as-is
    return <div className="whitespace-pre-wrap">{aiAnalysis}</div>
  }

  const analysis = data as {
    formScore?: number
    summary?: string
    interpretation?: string
    issues?: Array<{ issue: string; severity: string; timestamp?: string; description: string }>
    recommendations?: Array<{ priority?: number; recommendation?: string; title?: string; description?: string; explanation?: string }>
    overallAssessment?: string
    patterns?: Array<{ pattern: string; significance: string }>
  }

  return (
    <div className="space-y-4">
      {/* Score */}
      {analysis.formScore && (
        <div className="flex items-center gap-2">
          <span className="font-medium">Poäng:</span>
          <span className={`text-lg font-bold ${getScoreColor(analysis.formScore)}`}>
            {analysis.formScore}/100
          </span>
        </div>
      )}

      {/* Summary/Interpretation */}
      {(analysis.summary || analysis.interpretation) && (
        <div>
          <h4 className="font-medium mb-1">Sammanfattning</h4>
          <p className="text-sm text-muted-foreground">{analysis.summary || analysis.interpretation}</p>
        </div>
      )}

      {/* Issues */}
      {analysis.issues && analysis.issues.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Identifierade problem</h4>
          <div className="space-y-2">
            {analysis.issues.map((issue, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={issue.severity === 'HIGH' ? 'destructive' : issue.severity === 'MEDIUM' ? 'default' : 'secondary'}>
                    {issue.severity}
                  </Badge>
                  <span className="font-medium text-sm">{issue.issue}</span>
                  {issue.timestamp && <span className="text-xs text-muted-foreground">@ {issue.timestamp}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Rekommendationer</h4>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-2 mb-1">
                  {rec.priority && <Badge variant="outline">Prioritet {rec.priority}</Badge>}
                  <span className="font-medium text-sm">{rec.recommendation || rec.title}</span>
                </div>
                {(rec.explanation || rec.description) && (
                  <p className="text-sm text-muted-foreground">{rec.explanation || rec.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {analysis.patterns && analysis.patterns.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Observerade mönster</h4>
          <div className="space-y-2">
            {analysis.patterns.map((pattern, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-background border">
                <span className="font-medium text-sm">{pattern.pattern}</span>
                <p className="text-sm text-muted-foreground mt-1">{pattern.significance}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Assessment */}
      {analysis.overallAssessment && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
          <h4 className="font-medium mb-1 text-green-800">Övergripande bedömning</h4>
          <p className="text-sm text-green-700">{analysis.overallAssessment}</p>
        </div>
      )}
    </div>
  )
}

export function VideoAnalysisCard({
  analysis,
  onDelete,
  onAnalysisComplete,
}: VideoAnalysisCardProps) {
  const { toast } = useToast()
  const pageContextValue = usePageContextOptional()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showVideoDialog, setShowVideoDialog] = useState(false)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [showPoseDialog, setShowPoseDialog] = useState(false)
  const [isSavingPose, setIsSavingPose] = useState(false)
  const [poseAnalysisData, setPoseAnalysisData] = useState<Record<string, unknown> | null>(null)

  const typeInfo = VIDEO_TYPE_INFO[analysis.videoType as keyof typeof VIDEO_TYPE_INFO] || VIDEO_TYPE_INFO.SPORT_SPECIFIC
  const statusInfo = STATUS_INFO[analysis.status as keyof typeof STATUS_INFO] || STATUS_INFO.PENDING
  const TypeIcon = typeInfo.icon

  // Update page context when viewing results or pose analysis
  useEffect(() => {
    if ((showResultsDialog || showPoseDialog) && analysis.status === 'COMPLETED' && pageContextValue) {
      const exerciseName = analysis.exercise?.nameSv || analysis.exercise?.name || 'Okänd övning'

      pageContextValue.setPageContext({
        type: 'video-analysis',
        title: `Videoanalys: ${exerciseName}`,
        summary: `Analys av ${typeInfo.label} för ${analysis.athlete?.name || 'okänd atlet'}`,
        data: {
          videoType: typeInfo.label,
          exerciseName,
          formScore: analysis.formScore,
          issues: analysis.issuesDetected,
          recommendations: analysis.recommendations,
          aiAnalysis: analysis.aiAnalysis,
          poseAnalysis: poseAnalysisData,
        },
      })
    } else if (!showResultsDialog && !showPoseDialog && pageContextValue) {
      // Clear context when dialogs are closed
      pageContextValue.clearPageContext()
    }
  }, [showResultsDialog, showPoseDialog, analysis, typeInfo.label, pageContextValue, poseAnalysisData])

  // Callback to receive pose analysis data from PoseAnalyzer
  const handlePoseAnalysisUpdate = (data: Record<string, unknown>) => {
    setPoseAnalysisData(data)
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch(`/api/video-analysis/${analysis.id}/analyze`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analys misslyckades')
      }

      toast({
        title: 'Analys klar',
        description: `Teknisk bedömning: ${data.result?.formScore || 'N/A'}/100`,
      })

      onAnalysisComplete()
    } catch (error) {
      toast({
        title: 'Analys misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Är du säker på att du vill ta bort denna analys?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/video-analysis/${analysis.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kunde inte ta bort')
      }

      toast({
        title: 'Analys borttagen',
        description: 'Videoanalysen har tagits bort.',
      })

      onDelete()
    } catch (error) {
      toast({
        title: 'Kunde inte ta bort',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePoseAnalysisComplete = async (data: {
    frames: PoseFrame[]
    angles: { name: string; angle: number; status: string }[]
    summary: string
  }) => {
    setIsSavingPose(true)
    try {
      const response = await fetch(`/api/video-analysis/${analysis.id}/landmarks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: data.frames,
          summary: data.summary,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte spara posedata')
      }

      toast({
        title: 'Poseanalys sparad',
        description: `${result.frameCount} frames analyserade`,
      })

      onAnalysisComplete()
    } catch (error) {
      toast({
        title: 'Kunde inte spara posedata',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setIsSavingPose(false)
    }
  }

  const issues = analysis.issuesDetected as Issue[] | null
  const recommendations = analysis.recommendations as Recommendation[] | null

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
          {/* Video thumbnail/preview */}
          <div
            className="aspect-video bg-gray-900 relative cursor-pointer group"
            onClick={() => setShowVideoDialog(true)}
          >
            <video
              src={analysis.videoUrl}
              className="w-full h-full object-contain"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-3 rounded-full bg-white/90">
                <Play className="h-6 w-6 text-gray-900" />
              </div>
            </div>
            {/* Status badge */}
            <div className="absolute top-2 right-2">
              <Badge className={statusInfo.color}>
                {analysis.status === 'PROCESSING' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {statusInfo.label}
              </Badge>
            </div>
            {/* Score badge if completed */}
            {analysis.status === 'COMPLETED' && analysis.formScore !== null && (
              <div className="absolute bottom-2 left-2">
                <div className={`px-2 py-1 rounded-lg bg-white/90 font-bold ${getScoreColor(analysis.formScore)}`}>
                  {analysis.formScore}/100
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Type and date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
              <span className="text-sm font-medium">{typeInfo.label}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(analysis.createdAt).toLocaleDateString('sv-SE')}
            </div>
          </div>

          {/* Athlete and exercise */}
          {(analysis.athlete || analysis.exercise) && (
            <div className="flex flex-wrap gap-2 text-sm">
              {analysis.athlete && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {analysis.athlete.name}
                </div>
              )}
              {analysis.exercise && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Dumbbell className="h-3 w-3" />
                  {analysis.exercise.nameSv || analysis.exercise.name}
                </div>
              )}
            </div>
          )}

          {/* Score display if completed */}
          {analysis.status === 'COMPLETED' && analysis.formScore !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Teknisk bedömning</span>
                <span className={`font-semibold ${getScoreColor(analysis.formScore)}`}>
                  {getScoreLabel(analysis.formScore)}
                </span>
              </div>
              <Progress value={analysis.formScore} className="h-2" />
            </div>
          )}

          {/* Quick summary of issues */}
          {analysis.status === 'COMPLETED' && issues && issues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {issues.slice(0, 3).map((issue, i) => {
                const severity = SEVERITY_INFO[issue.severity] || SEVERITY_INFO.LOW
                return (
                  <Badge key={i} variant="outline" className={severity.color}>
                    {issue.issue}
                  </Badge>
                )
              })}
              {issues.length > 3 && (
                <Badge variant="outline">+{issues.length - 3} till</Badge>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {analysis.status === 'PENDING' && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyserar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analysera
                  </>
                )}
              </Button>
            )}
            {analysis.status === 'COMPLETED' && (
              <Button
                variant="outline"
                onClick={() => setShowResultsDialog(true)}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Visa resultat
              </Button>
            )}
            {analysis.status === 'FAILED' && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                variant="outline"
                className="flex-1"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Försöker igen...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Försök igen
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowPoseDialog(true)}
              title="Poseanalys (skelettspårning)"
            >
              <Scan className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {typeInfo.label}
              {analysis.athlete && ` - ${analysis.athlete.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={analysis.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Analysresultat
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Score overview */}
            {analysis.formScore !== null && (
              <div className="text-center p-6 bg-muted rounded-lg">
                <div className={`text-5xl font-bold ${getScoreColor(analysis.formScore)}`}>
                  {analysis.formScore}
                </div>
                <div className="text-lg text-muted-foreground mt-1">
                  {getScoreLabel(analysis.formScore)}
                </div>
                <Progress value={analysis.formScore} className="h-3 mt-4" />
              </div>
            )}

            {/* Issues */}
            {issues && issues.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Identifierade problem ({issues.length})
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {issues.map((issue, i) => {
                    const severity = SEVERITY_INFO[issue.severity] || SEVERITY_INFO.LOW
                    const SeverityIcon = severity.icon
                    return (
                      <AccordionItem key={i} value={`issue-${i}`}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-2">
                            <Badge className={severity.color}>
                              <SeverityIcon className="h-3 w-3 mr-1" />
                              {severity.label}
                            </Badge>
                            <span>{issue.issue}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground">{issue.description}</p>
                          {issue.timestamp && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Tidpunkt i video: {issue.timestamp}
                            </p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </div>
            )}

            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Rekommendationer ({recommendations.length})
                </h3>
                <div className="space-y-3">
                  {recommendations
                    .sort((a, b) => a.priority - b.priority)
                    .map((rec, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {rec.priority}
                          </div>
                          <div>
                            <p className="font-medium">{rec.recommendation}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rec.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Full AI analysis text */}
            {analysis.aiAnalysis && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  Fullständig analys
                </h3>
                <div className="p-4 bg-muted rounded-lg text-sm">
                  <FormattedAIAnalysis aiAnalysis={analysis.aiAnalysis} />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pose Analysis Dialog */}
      <Dialog open={showPoseDialog} onOpenChange={setShowPoseDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Poseanalys - Skelettspårning
              {analysis.athlete && ` - ${analysis.athlete.name}`}
            </DialogTitle>
          </DialogHeader>
          <PoseAnalyzer
            videoUrl={analysis.videoUrl}
            videoType={analysis.videoType as 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'}
            exerciseName={analysis.exercise?.name}
            exerciseNameSv={analysis.exercise?.nameSv || undefined}
            aiAnalysis={{
              formScore: analysis.formScore,
              issuesDetected: analysis.issuesDetected,
              recommendations: analysis.recommendations,
              aiAnalysis: analysis.aiAnalysis,
            }}
            onAnalysisComplete={handlePoseAnalysisComplete}
            onAIPoseAnalysis={handlePoseAnalysisUpdate}
            isSaving={isSavingPose}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
