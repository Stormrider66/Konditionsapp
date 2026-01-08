'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Video,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  ExternalLink,
  Dumbbell,
  PersonStanding,
  Activity,
  Brain,
} from 'lucide-react'
import Link from 'next/link'
import { escapeHtml } from '@/lib/sanitize'

interface VideoAnalysis {
  id: string
  videoUrl: string
  videoType: string
  status: string
  formScore: number | null
  aiAnalysis: string | null
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
  createdAt: string
  exercise: { id: string; name: string; nameSv: string | null } | null
}

interface ClientVideoAnalysesProps {
  clientId: string
  clientName: string
  onLoadToAI?: (analysis: VideoAnalysis) => void
}

const VIDEO_TYPE_INFO = {
  STRENGTH: { label: 'Styrkeövning', icon: Dumbbell, color: 'text-orange-500' },
  RUNNING_GAIT: { label: 'Löpteknik', icon: PersonStanding, color: 'text-blue-500' },
  SPORT_SPECIFIC: { label: 'Sportspecifik', icon: Activity, color: 'text-purple-500' },
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'Utmärkt'
  if (score >= 80) return 'Mycket bra'
  if (score >= 70) return 'Bra'
  if (score >= 60) return 'Godkänt'
  if (score >= 50) return 'Behöver förbättring'
  return 'Behöver betydande förbättring'
}

export function ClientVideoAnalyses({ clientId, clientName, onLoadToAI }: ClientVideoAnalysesProps) {
  const { toast } = useToast()
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<VideoAnalysis | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const fetchAnalyses = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/video-analysis?athleteId=${clientId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta videoanalyser')
      }

      setAnalyses(data.analyses || [])
    } catch (error) {
      console.error('Failed to fetch video analyses:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte hämta videoanalyser',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [clientId, toast])

  useEffect(() => {
    fetchAnalyses()
  }, [fetchAnalyses])

  const handlePrint = (analysis: VideoAnalysis) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast({
        title: 'Kunde inte öppna utskriftsfönster',
        description: 'Kontrollera att popup-blockerare är avstängda',
        variant: 'destructive',
      })
      return
    }

    const typeInfo = VIDEO_TYPE_INFO[analysis.videoType as keyof typeof VIDEO_TYPE_INFO] || VIDEO_TYPE_INFO.SPORT_SPECIFIC
    const issues = analysis.issuesDetected || []
    const recommendations = analysis.recommendations || []

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Videoanalys - ${escapeHtml(clientName)}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .score { font-size: 48px; font-weight: bold; color: ${analysis.formScore && analysis.formScore >= 70 ? '#16a34a' : analysis.formScore && analysis.formScore >= 50 ? '#ca8a04' : '#dc2626'}; }
          .score-label { font-size: 18px; color: #6b7280; }
          .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #f3f4f6; padding: 16px; border-radius: 8px; }
          .meta-item label { font-size: 12px; color: #6b7280; }
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
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Videoanalys Rapport</h1>
            <p style="color: #6b7280;">${escapeHtml(clientName)} - ${format(new Date(analysis.createdAt), 'PPP', { locale: sv })}</p>
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
            <p>${escapeHtml(typeInfo.label)}</p>
          </div>
          <div class="meta-item">
            <label>Övning</label>
            <p>${escapeHtml(analysis.exercise?.nameSv || analysis.exercise?.name || 'Ej angiven')}</p>
          </div>
          <div class="meta-item">
            <label>Datum</label>
            <p>${format(new Date(analysis.createdAt), 'PPP HH:mm', { locale: sv })}</p>
          </div>
          <div class="meta-item">
            <label>Status</label>
            <p>${escapeHtml(analysis.status === 'COMPLETED' ? 'Klar' : analysis.status)}</p>
          </div>
        </div>

        ${issues.length > 0 ? `
        <h2>Identifierade problem (${issues.length})</h2>
        ${issues.map(issue => `
          <div class="issue ${issue.severity === 'HIGH' || issue.severity === 'MEDIUM' || issue.severity === 'LOW' ? issue.severity : 'LOW'}">
            <div class="issue-title">${escapeHtml(issue.issue)}</div>
            <div class="issue-desc">${escapeHtml(issue.description)}</div>
            ${issue.timestamp ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Tidpunkt: ${escapeHtml(issue.timestamp)}</div>` : ''}
          </div>
        `).join('')}
        ` : ''}

        ${recommendations.length > 0 ? `
        <h2>Rekommendationer (${recommendations.length})</h2>
        ${recommendations.sort((a, b) => a.priority - b.priority).map(rec => `
          <div class="recommendation">
            <div class="rec-title">
              <span class="rec-priority">Prioritet ${rec.priority}</span>
              ${escapeHtml(rec.recommendation)}
            </div>
            <div class="rec-desc">${escapeHtml(rec.explanation)}</div>
          </div>
        `).join('')}
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

  const handleLoadToAI = (analysis: VideoAnalysis) => {
    if (onLoadToAI) {
      onLoadToAI(analysis)
      toast({
        title: 'Laddat till AI',
        description: 'Videoanalysen har laddats som kontext i AI Studio',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Videoanalyser</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Videoanalyser</h2>
          <Link href="/coach/video-analysis">
            <Button size="sm">
              <Video className="h-4 w-4 mr-2" />
              Ny analys
            </Button>
          </Link>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Video className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="mb-2">Inga videoanalyser för denna atlet</p>
          <Link
            href="/coach/video-analysis"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Skapa första videoanalysen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Videoanalyser</h2>
          <p className="text-sm text-gray-600 mt-1">
            {analyses.length} {analyses.length === 1 ? 'analys' : 'analyser'}
          </p>
        </div>
        <Link href="/coach/video-analysis">
          <Button size="sm">
            <Video className="h-4 w-4 mr-2" />
            Ny analys
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {analyses.map((analysis) => {
          const typeInfo = VIDEO_TYPE_INFO[analysis.videoType as keyof typeof VIDEO_TYPE_INFO] || VIDEO_TYPE_INFO.SPORT_SPECIFIC
          const TypeIcon = typeInfo.icon
          const issueCount = analysis.issuesDetected?.length || 0

          return (
            <div
              key={analysis.id}
              className="border rounded-lg p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {analysis.exercise?.nameSv || analysis.exercise?.name || typeInfo.label}
                      </span>
                      <Badge
                        variant={analysis.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className={analysis.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : ''}
                      >
                        {analysis.status === 'COMPLETED' ? 'Klar' : analysis.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {format(new Date(analysis.createdAt), 'PPP', { locale: sv })}
                    </p>
                    {issueCount > 0 && (
                      <p className="text-sm text-orange-600 mt-1">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {issueCount} {issueCount === 1 ? 'problem' : 'problem'} identifierade
                      </p>
                    )}
                  </div>
                </div>

                {/* Score */}
                {analysis.formScore !== null && (
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(analysis.formScore)}`}>
                      {analysis.formScore}
                    </div>
                    <div className="text-xs text-gray-500">poäng</div>
                  </div>
                )}
              </div>

              {/* Progress bar for score */}
              {analysis.formScore !== null && (
                <div className="mt-3">
                  <Progress value={analysis.formScore} className="h-2" />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAnalysis(analysis)
                    setShowDetailDialog(true)
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Visa detaljer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(analysis)}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Skriv ut
                </Button>
                {onLoadToAI && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadToAI(analysis)}
                  >
                    <Brain className="h-4 w-4 mr-1" />
                    Till AI
                  </Button>
                )}
                <Link href="/coach/video-analysis" className="ml-auto">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Öppna
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Analysresultat
            </DialogTitle>
          </DialogHeader>

          {selectedAnalysis && (
            <div className="space-y-6">
              {/* Score overview */}
              {selectedAnalysis.formScore !== null && (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <div className={`text-5xl font-bold ${getScoreColor(selectedAnalysis.formScore)}`}>
                    {selectedAnalysis.formScore}
                  </div>
                  <div className="text-lg text-muted-foreground mt-1">
                    {getScoreLabel(selectedAnalysis.formScore)}
                  </div>
                  <Progress value={selectedAnalysis.formScore} className="h-3 mt-4" />
                </div>
              )}

              {/* Issues */}
              {selectedAnalysis.issuesDetected && selectedAnalysis.issuesDetected.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Identifierade problem ({selectedAnalysis.issuesDetected.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedAnalysis.issuesDetected.map((issue, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border-l-4 ${
                          issue.severity === 'HIGH'
                            ? 'border-red-500 bg-red-50'
                            : issue.severity === 'MEDIUM'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="font-medium">{issue.issue}</div>
                        <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedAnalysis.recommendations && selectedAnalysis.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Rekommendationer ({selectedAnalysis.recommendations.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedAnalysis.recommendations
                      .sort((a, b) => a.priority - b.priority)
                      .map((rec, i) => (
                        <div key={i} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-blue-100 text-blue-700">
                              Prioritet {rec.priority}
                            </Badge>
                            <span className="font-medium">{rec.recommendation}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.explanation}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => handlePrint(selectedAnalysis)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Skriv ut rapport
                </Button>
                {onLoadToAI && (
                  <Button variant="outline" onClick={() => handleLoadToAI(selectedAnalysis)}>
                    <Brain className="h-4 w-4 mr-2" />
                    Ladda till AI Studio
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
