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
  ChevronDown,
  ChevronUp,
  BarChart3,
  Printer,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { PoseAnalyzer, PoseFrame } from './PoseAnalyzer'
// Context loading removed to prevent infinite render loops

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
function parseAIAnalysis(aiAnalysis: string): { isJson: boolean; data: unknown; text: string; introText?: string } {
  let text = aiAnalysis.trim()
  let introText: string | undefined

  // Check if there's a JSON code block anywhere in the text
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    // Extract intro text (everything before the code block)
    const jsonBlockStart = text.indexOf('```json')
    if (jsonBlockStart > 0) {
      introText = text.slice(0, jsonBlockStart).trim()
    }
    text = jsonBlockMatch[1].trim()
  } else {
    // Try to find JSON starting with { or [
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (jsonMatch) {
      const jsonStart = text.indexOf(jsonMatch[1])
      if (jsonStart > 0) {
        introText = text.slice(0, jsonStart).trim()
      }
      text = jsonMatch[1]
    } else {
      // Remove markdown code blocks if present at start
      if (text.startsWith('```json')) {
        text = text.slice(7)
      } else if (text.startsWith('```')) {
        text = text.slice(3)
      }
      if (text.endsWith('```')) {
        text = text.slice(0, -3)
      }
      text = text.trim()
    }
  }

  // Try to parse as JSON
  try {
    const data = JSON.parse(text)
    return { isJson: true, data, text, introText }
  } catch {
    return { isJson: false, data: null, text: aiAnalysis }
  }
}

// Render parsed AI analysis in a formatted way
function FormattedAIAnalysis({ aiAnalysis }: { aiAnalysis: string }) {
  const { isJson, data, introText } = parseAIAnalysis(aiAnalysis)

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
      {/* Intro text if any */}
      {introText && (
        <p className="text-sm text-muted-foreground italic">{introText}</p>
      )}

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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showVideoDialog, setShowVideoDialog] = useState(false)
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [showPoseDialog, setShowPoseDialog] = useState(false)
  const [isSavingPose, setIsSavingPose] = useState(false)
  const [poseAnalysisData, setPoseAnalysisData] = useState<Record<string, unknown> | null>(null)
  const [showExtendedPoseData, setShowExtendedPoseData] = useState(false)
  const [extendedPoseData, setExtendedPoseData] = useState<{
    frameCount: number
    frames: Array<{ timestamp: number; landmarks: Array<{ x: number; y: number; z: number; visibility: number }> }>
    metadata?: { analyzedAt: string; model: string }
  } | null>(null)
  const [isLoadingPoseData, setIsLoadingPoseData] = useState(false)

  const typeInfo = VIDEO_TYPE_INFO[analysis.videoType as keyof typeof VIDEO_TYPE_INFO] || VIDEO_TYPE_INFO.SPORT_SPECIFIC
  const statusInfo = STATUS_INFO[analysis.status as keyof typeof STATUS_INFO] || STATUS_INFO.PENDING
  const TypeIcon = typeInfo.icon

  // Callback to receive pose analysis data from PoseAnalyzer
  const handlePoseAnalysisUpdate = (data: Record<string, unknown>) => {
    setPoseAnalysisData(data)
  }

  // Fetch extended pose data (landmarks)
  const fetchExtendedPoseData = async () => {
    if (extendedPoseData) {
      setShowExtendedPoseData(!showExtendedPoseData)
      return
    }

    setIsLoadingPoseData(true)
    try {
      const response = await fetch(`/api/video-analysis/${analysis.id}/landmarks`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta posedata')
      }

      setExtendedPoseData({
        frameCount: data.frameCount,
        frames: data.frames,
        metadata: data.metadata,
      })
      setShowExtendedPoseData(true)
    } catch (error) {
      toast({
        title: 'Kunde inte hämta posedata',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingPoseData(false)
    }
  }

  // Calculate angle statistics from pose data
  const calculateAngleStats = (frames: Array<{ landmarks: Array<{ x: number; y: number; z: number; visibility: number }> }>) => {
    if (!frames || frames.length === 0) return null

    const POSE_LANDMARKS = {
      LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
      LEFT_HIP: 23, RIGHT_HIP: 24,
      LEFT_KNEE: 25, RIGHT_KNEE: 26,
      LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
      LEFT_HEEL: 29, RIGHT_HEEL: 30,
      LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
    }

    const calculateAngle = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
      const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
      let angle = Math.abs(radians * 180 / Math.PI)
      if (angle > 180) angle = 360 - angle
      return angle
    }

    const stats: Record<string, { min: number; max: number; name: string }> = {
      leftKnee: { min: Infinity, max: -Infinity, name: 'Vänster knä' },
      rightKnee: { min: Infinity, max: -Infinity, name: 'Höger knä' },
      leftHip: { min: Infinity, max: -Infinity, name: 'Vänster höft' },
      rightHip: { min: Infinity, max: -Infinity, name: 'Höger höft' },
      leftShin: { min: Infinity, max: -Infinity, name: 'Vänster skenben' },
      rightShin: { min: Infinity, max: -Infinity, name: 'Höger skenben' },
      leftFoot: { min: Infinity, max: -Infinity, name: 'Vänster fot' },
      rightFoot: { min: Infinity, max: -Infinity, name: 'Höger fot' },
    }

    frames.forEach(frame => {
      const lm = frame.landmarks
      if (!lm || lm.length < 33) return

      // Knee angles
      const leftKnee = calculateAngle(lm[POSE_LANDMARKS.LEFT_HIP], lm[POSE_LANDMARKS.LEFT_KNEE], lm[POSE_LANDMARKS.LEFT_ANKLE])
      const rightKnee = calculateAngle(lm[POSE_LANDMARKS.RIGHT_HIP], lm[POSE_LANDMARKS.RIGHT_KNEE], lm[POSE_LANDMARKS.RIGHT_ANKLE])

      // Hip angles
      const leftHip = calculateAngle(lm[POSE_LANDMARKS.LEFT_SHOULDER], lm[POSE_LANDMARKS.LEFT_HIP], lm[POSE_LANDMARKS.LEFT_KNEE])
      const rightHip = calculateAngle(lm[POSE_LANDMARKS.RIGHT_SHOULDER], lm[POSE_LANDMARKS.RIGHT_HIP], lm[POSE_LANDMARKS.RIGHT_KNEE])

      // Shin angles (angle at ankle: knee-ankle-heel)
      const leftShin = calculateAngle(lm[POSE_LANDMARKS.LEFT_KNEE], lm[POSE_LANDMARKS.LEFT_ANKLE], lm[POSE_LANDMARKS.LEFT_HEEL])
      const rightShin = calculateAngle(lm[POSE_LANDMARKS.RIGHT_KNEE], lm[POSE_LANDMARKS.RIGHT_ANKLE], lm[POSE_LANDMARKS.RIGHT_HEEL])

      // Foot angles (angle at ankle: heel-ankle-foot_index)
      const leftFoot = calculateAngle(lm[POSE_LANDMARKS.LEFT_HEEL], lm[POSE_LANDMARKS.LEFT_ANKLE], lm[POSE_LANDMARKS.LEFT_FOOT_INDEX])
      const rightFoot = calculateAngle(lm[POSE_LANDMARKS.RIGHT_HEEL], lm[POSE_LANDMARKS.RIGHT_ANKLE], lm[POSE_LANDMARKS.RIGHT_FOOT_INDEX])

      stats.leftKnee.min = Math.min(stats.leftKnee.min, leftKnee)
      stats.leftKnee.max = Math.max(stats.leftKnee.max, leftKnee)
      stats.rightKnee.min = Math.min(stats.rightKnee.min, rightKnee)
      stats.rightKnee.max = Math.max(stats.rightKnee.max, rightKnee)
      stats.leftHip.min = Math.min(stats.leftHip.min, leftHip)
      stats.leftHip.max = Math.max(stats.leftHip.max, leftHip)
      stats.rightHip.min = Math.min(stats.rightHip.min, rightHip)
      stats.rightHip.max = Math.max(stats.rightHip.max, rightHip)
      stats.leftShin.min = Math.min(stats.leftShin.min, leftShin)
      stats.leftShin.max = Math.max(stats.leftShin.max, leftShin)
      stats.rightShin.min = Math.min(stats.rightShin.min, rightShin)
      stats.rightShin.max = Math.max(stats.rightShin.max, rightShin)
      stats.leftFoot.min = Math.min(stats.leftFoot.min, leftFoot)
      stats.leftFoot.max = Math.max(stats.leftFoot.max, leftFoot)
      stats.rightFoot.min = Math.min(stats.rightFoot.min, rightFoot)
      stats.rightFoot.max = Math.max(stats.rightFoot.max, rightFoot)
    })

    return stats
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
        title: 'Poseanalys sparad!',
        description: `${result.frameCount} frames sparade till "${analysis.exercise?.nameSv || analysis.exercise?.name || 'videoanalysen'}". Klicka på "Visa resultat" för att se analysen.`,
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

  // Print handler for the results dialog
  const handlePrintResults = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast({
        title: 'Kunde inte öppna utskriftsfönster',
        description: 'Kontrollera att popup-blockerare är avstängda',
        variant: 'destructive',
      })
      return
    }

    const angleStats = extendedPoseData ? calculateAngleStats(extendedPoseData.frames) : null

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Videoanalys - ${analysis.athlete?.name || 'Rapport'}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 24px; font-size: 18px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .score { font-size: 48px; font-weight: bold; color: ${analysis.formScore && analysis.formScore >= 70 ? '#16a34a' : analysis.formScore && analysis.formScore >= 50 ? '#ca8a04' : '#dc2626'}; }
          .score-label { font-size: 18px; color: #6b7280; }
          .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #f3f4f6; padding: 16px; border-radius: 8px; }
          .meta-item label { font-size: 12px; color: #6b7280; display: block; }
          .meta-item p { font-size: 14px; font-weight: 500; margin: 4px 0 0; }
          .issue { padding: 12px; margin: 8px 0; border-left: 4px solid; border-radius: 4px; }
          .issue.HIGH { border-color: #dc2626; background: #fef2f2; }
          .issue.MEDIUM { border-color: #f59e0b; background: #fffbeb; }
          .issue.LOW { border-color: #3b82f6; background: #eff6ff; }
          .issue-title { font-weight: 600; }
          .issue-desc { font-size: 14px; color: #4b5563; margin-top: 4px; }
          .recommendation { padding: 12px; margin: 8px 0; background: #f0fdf4; border-radius: 4px; border-left: 4px solid #22c55e; }
          .rec-title { font-weight: 600; }
          .rec-desc { font-size: 14px; color: #4b5563; margin-top: 4px; }
          .rec-priority { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 8px; }
          .angles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .angle-card { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px; }
          .angle-name { font-weight: 600; color: #7c3aed; margin-bottom: 8px; }
          .angle-values { display: flex; justify-content: space-between; font-size: 14px; }
          .angle-min { color: #2563eb; }
          .angle-max { color: #ea580c; }
          .angle-range { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Videoanalys Rapport</h1>
            <p style="color: #6b7280;">${analysis.athlete?.name || 'Okänd atlet'} - ${format(new Date(analysis.createdAt), 'PPP', { locale: sv })}</p>
          </div>
          ${analysis.formScore !== null ? `
          <div style="text-align: center;">
            <div class="score">${analysis.formScore}</div>
            <div class="score-label">${getScoreLabel(analysis.formScore)}</div>
          </div>
          ` : ''}
        </div>

        <div class="meta">
          <div class="meta-item">
            <label>Analystyp</label>
            <p>${typeInfo.label}</p>
          </div>
          <div class="meta-item">
            <label>Övning</label>
            <p>${analysis.exercise?.nameSv || analysis.exercise?.name || 'Ej angiven'}</p>
          </div>
          <div class="meta-item">
            <label>Datum</label>
            <p>${format(new Date(analysis.createdAt), 'PPP HH:mm', { locale: sv })}</p>
          </div>
          <div class="meta-item">
            <label>Status</label>
            <p>${analysis.status === 'COMPLETED' ? 'Klar' : analysis.status}</p>
          </div>
        </div>

        ${issues && issues.length > 0 ? `
        <h2>Identifierade problem (${issues.length})</h2>
        ${issues.map(issue => `
          <div class="issue ${issue.severity}">
            <div class="issue-title">${issue.issue}</div>
            <div class="issue-desc">${issue.description}</div>
            ${issue.timestamp ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Tidpunkt: ${issue.timestamp}</div>` : ''}
          </div>
        `).join('')}
        ` : ''}

        ${recommendations && recommendations.length > 0 ? `
        <h2>Rekommendationer (${recommendations.length})</h2>
        ${recommendations.sort((a, b) => a.priority - b.priority).map(rec => `
          <div class="recommendation">
            <div class="rec-title">
              <span class="rec-priority">Prioritet ${rec.priority}</span>
              ${rec.recommendation}
            </div>
            <div class="rec-desc">${rec.explanation}</div>
          </div>
        `).join('')}
        ` : ''}

        ${angleStats ? `
        <h2>Ledvinkelstatistik</h2>
        <div class="angles">
          ${Object.entries(angleStats).filter(([, stat]) => stat.min !== Infinity).map(([, stat]) => `
            <div class="angle-card">
              <div class="angle-name">${stat.name}</div>
              <div class="angle-values">
                <span class="angle-min">Min: ${Math.round(stat.min)}°</span>
                <span class="angle-max">Max: ${Math.round(stat.max)}°</span>
              </div>
              <div class="angle-range">Intervall: ${Math.round(stat.max - stat.min)}°</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="footer">
          <p>Genererad ${format(new Date(), 'PPP HH:mm', { locale: sv })} | Star by Thomson Konditionstest</p>
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

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
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Analysresultat
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintResults}
                className="mr-6"
              >
                <Printer className="h-4 w-4 mr-2" />
                Skriv ut
              </Button>
            </div>
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

            {/* Extended Pose Data Section */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchExtendedPoseData}
                disabled={isLoadingPoseData}
                className="w-full"
              >
                {isLoadingPoseData ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Hämtar posedata...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {showExtendedPoseData ? 'Dölj' : 'Visa'} detaljerad posedata
                    {showExtendedPoseData ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                  </>
                )}
              </Button>

              {showExtendedPoseData && extendedPoseData && (
                <div className="mt-4 space-y-4">
                  {/* Metadata */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Analysmetadata</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-blue-600">Antal frames:</span>
                        <span className="font-mono ml-2">{extendedPoseData.frameCount}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Modell:</span>
                        <span className="font-mono ml-2">{extendedPoseData.metadata?.model || 'MediaPipe BlazePose'}</span>
                      </div>
                      {extendedPoseData.metadata?.analyzedAt && (
                        <div className="col-span-2">
                          <span className="text-blue-600">Analyserad:</span>
                          <span className="font-mono ml-2">
                            {new Date(extendedPoseData.metadata.analyzedAt).toLocaleString('sv-SE')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Angle Statistics */}
                  {(() => {
                    const angleStats = calculateAngleStats(extendedPoseData.frames)
                    if (!angleStats) return null

                    return (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <h4 className="font-medium text-purple-800 mb-2">Ledvinkelstatistik (min/max)</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {Object.entries(angleStats).map(([key, stat]) => (
                            stat.min !== Infinity && (
                              <div key={key} className="p-2 bg-white rounded border">
                                <div className="font-medium text-purple-700">{stat.name}</div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-blue-600">
                                    Min: <span className="font-mono font-bold">{Math.round(stat.min)}°</span>
                                  </span>
                                  <span className="text-orange-600">
                                    Max: <span className="font-mono font-bold">{Math.round(stat.max)}°</span>
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Intervall: {Math.round(stat.max - stat.min)}°
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Frame Timeline Preview */}
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-gray-800 mb-2">Tidslinje</h4>
                    <div className="text-sm text-muted-foreground mb-2">
                      {extendedPoseData.frames.length} frames över{' '}
                      {extendedPoseData.frames.length > 0
                        ? `${(extendedPoseData.frames[extendedPoseData.frames.length - 1].timestamp - extendedPoseData.frames[0].timestamp).toFixed(2)}s`
                        : '0s'}
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{extendedPoseData.frames[0]?.timestamp.toFixed(2)}s</span>
                      <span>{extendedPoseData.frames[extendedPoseData.frames.length - 1]?.timestamp.toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
