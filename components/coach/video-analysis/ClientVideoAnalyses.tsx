'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
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
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext'
import { PLATFORM_NAME } from '@/lib/branding/types'
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
import { usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { escapeHtml } from '@/lib/sanitize'
import { useLocale } from '@/i18n/client'
import { getOptionalExerciseDisplayName } from '@/lib/exercises/display-name'

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
  exercise: { id: string; name: string; nameSv: string | null; nameEn?: string | null } | null
}

interface ClientVideoAnalysesProps {
  clientId: string
  clientName: string
  onLoadToAI?: (analysis: VideoAnalysis) => void
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')
const localizedText = (locale: AppLocale, svText: string, enText: string) =>
  locale === 'sv' ? svText : enText

const VIDEO_TYPE_INFO = {
  STRENGTH: {
    label: { sv: 'Styrkeövning', en: 'Strength exercise' },
    icon: Dumbbell,
    color: 'text-zinc-500',
  },
  RUNNING_GAIT: {
    label: { sv: 'Löpteknik', en: 'Running technique' },
    icon: PersonStanding,
    color: 'text-zinc-500',
  },
  SPORT_SPECIFIC: {
    label: { sv: 'Sportspecifik', en: 'Sport-specific' },
    icon: Activity,
    color: 'text-zinc-500',
  },
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreLabel(score: number, locale: AppLocale) {
  if (score >= 90) return localizedText(locale, 'Utmärkt', 'Excellent')
  if (score >= 80) return localizedText(locale, 'Mycket bra', 'Very good')
  if (score >= 70) return localizedText(locale, 'Bra', 'Good')
  if (score >= 60) return localizedText(locale, 'Godkänt', 'Pass')
  if (score >= 50) return localizedText(locale, 'Behöver förbättring', 'Needs improvement')
  return localizedText(locale, 'Behöver betydande förbättring', 'Needs major improvement')
}

export function ClientVideoAnalyses({ clientId, clientName, onLoadToAI }: ClientVideoAnalysesProps) {
  const { toast } = useToast()
  const locale = getAppLocale(useLocale())
  const t = (svText: string, enText: string) => localizedText(locale, svText, enText)
  const dateFnsLocale = locale === 'sv' ? sv : enUS
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
  const branding = useBusinessBrandingOptional()
  const printBrandName =
    branding?.hasWhiteLabel && branding.hidePlatformBranding ? branding.businessName : PLATFORM_NAME
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
        throw new Error(
          data.error ||
            localizedText(locale, 'Kunde inte hämta videoanalyser', 'Could not fetch video analyses')
        )
      }

      setAnalyses(data.analyses || [])
    } catch (error) {
      console.error('Failed to fetch video analyses:', error)
      toast({
        title: localizedText(locale, 'Fel', 'Error'),
        description: localizedText(
          locale,
          'Kunde inte hämta videoanalyser',
          'Could not fetch video analyses'
        ),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [clientId, locale, toast])

  useEffect(() => {
    void fetchAnalyses()
  }, [fetchAnalyses])

  const handlePrint = (analysis: VideoAnalysis) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast({
        title: t('Kunde inte öppna utskriftsfönster', 'Could not open print window'),
        description: t(
          'Kontrollera att popup-blockerare är avstängda',
          'Check that pop-up blockers are disabled'
        ),
        variant: 'destructive',
      })
      return
    }

    const typeInfo = VIDEO_TYPE_INFO[analysis.videoType as keyof typeof VIDEO_TYPE_INFO] || VIDEO_TYPE_INFO.SPORT_SPECIFIC
    const typeLabel = typeInfo.label[locale]
    const exerciseName = getOptionalExerciseDisplayName(analysis.exercise, locale)
    const issues = analysis.issuesDetected || []
    const recommendations = analysis.recommendations || []

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('Videoanalys', 'Video analysis')} - ${escapeHtml(clientName)}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .score { font-size: 48px; font-weight: bold; color: ${analysis.formScore && analysis.formScore >= 70 ? '#059669' : analysis.formScore && analysis.formScore >= 50 ? '#d97706' : '#dc2626'}; }
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
          .recommendation { padding: 12px; margin: 8px 0; background: #ecfdf5; border-radius: 4px; border-left: 4px solid #10b981; }
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
            <h1>${t('Videoanalys Rapport', 'Video Analysis Report')}</h1>
            <p style="color: #6b7280;">${escapeHtml(clientName)} - ${format(new Date(analysis.createdAt), 'PPP', { locale: dateFnsLocale })}</p>
          </div>
          ${analysis.formScore !== null ? `
          <div style="text-align: center;">
            <div class="score">${analysis.formScore}</div>
            <div class="score-label">${getScoreLabel(analysis.formScore, locale)}</div>
          </div>
          ` : ''}
        </div>

        <div class="meta">
          <div class="meta-item">
            <label>${t('Analystyp', 'Analysis type')}</label>
            <p>${escapeHtml(typeLabel)}</p>
          </div>
          <div class="meta-item">
            <label>${t('Övning', 'Exercise')}</label>
            <p>${escapeHtml(exerciseName || t('Ej angiven', 'Not specified'))}</p>
          </div>
          <div class="meta-item">
            <label>${t('Datum', 'Date')}</label>
            <p>${format(new Date(analysis.createdAt), 'PPP HH:mm', { locale: dateFnsLocale })}</p>
          </div>
          <div class="meta-item">
            <label>Status</label>
            <p>${escapeHtml(analysis.status === 'COMPLETED' ? t('Klar', 'Complete') : analysis.status)}</p>
          </div>
        </div>

        ${issues.length > 0 ? `
        <h2>${t('Identifierade problem', 'Identified issues')} (${issues.length})</h2>
        ${issues.map(issue => `
          <div class="issue ${issue.severity === 'HIGH' || issue.severity === 'MEDIUM' || issue.severity === 'LOW' ? issue.severity : 'LOW'}">
            <div class="issue-title">${escapeHtml(issue.issue)}</div>
            <div class="issue-desc">${escapeHtml(issue.description)}</div>
            ${issue.timestamp ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${t('Tidpunkt', 'Timestamp')}: ${escapeHtml(issue.timestamp)}</div>` : ''}
          </div>
        `).join('')}
        ` : ''}

        ${recommendations.length > 0 ? `
        <h2>${t('Rekommendationer', 'Recommendations')} (${recommendations.length})</h2>
        ${recommendations.sort((a, b) => a.priority - b.priority).map(rec => `
          <div class="recommendation">
            <div class="rec-title">
              <span class="rec-priority">${t('Prioritet', 'Priority')} ${rec.priority}</span>
              ${escapeHtml(rec.recommendation)}
            </div>
            <div class="rec-desc">${escapeHtml(rec.explanation)}</div>
          </div>
        `).join('')}
        ` : ''}

        <div class="footer">
          <p>${t('Genererad', 'Generated')} ${format(new Date(), 'PPP HH:mm', { locale: dateFnsLocale })} | ${escapeHtml(printBrandName)}</p>
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
        title: t('Laddat till AI', 'Loaded to AI'),
        description: t(
          'Videoanalysen har laddats som kontext i AI Studio',
          'The video analysis has been loaded as context in AI Studio'
        ),
      })
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('Videoanalyser', 'Video analyses')}</h2>
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
          <h2 className="text-xl font-semibold">{t('Videoanalyser', 'Video analyses')}</h2>
          <Link href={`${basePath}/coach/video-analysis`}>
            <Button size="sm">
              <Video className="h-4 w-4 mr-2" />
              {t('Ny analys', 'New analysis')}
            </Button>
          </Link>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Video className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="mb-2">
            {t('Inga videoanalyser för denna atlet', 'No video analyses for this athlete')}
          </p>
          <Link
            href={`${basePath}/coach/video-analysis`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('Skapa första videoanalysen', 'Create first video analysis')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">{t('Videoanalyser', 'Video analyses')}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {analyses.length}{' '}
            {analyses.length === 1 ? t('analys', 'analysis') : t('analyser', 'analyses')}
          </p>
        </div>
        <Link href={`${basePath}/coach/video-analysis`}>
          <Button size="sm">
            <Video className="h-4 w-4 mr-2" />
            {t('Ny analys', 'New analysis')}
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {analyses.map((analysis) => {
          const typeInfo = VIDEO_TYPE_INFO[analysis.videoType as keyof typeof VIDEO_TYPE_INFO] || VIDEO_TYPE_INFO.SPORT_SPECIFIC
          const typeLabel = typeInfo.label[locale]
          const exerciseName = getOptionalExerciseDisplayName(analysis.exercise, locale)
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
                {exerciseName || typeLabel}
                      </span>
                      <Badge
                        variant={analysis.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className={analysis.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : ''}
                      >
                        {analysis.status === 'COMPLETED' ? t('Klar', 'Complete') : analysis.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {format(new Date(analysis.createdAt), 'PPP', { locale: dateFnsLocale })}
                    </p>
                    {issueCount > 0 && (
                      <p className="text-sm text-amber-600 mt-1">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        {issueCount}{' '}
                        {issueCount === 1 ? t('problem', 'issue') : t('problem', 'issues')}{' '}
                        {t('identifierade', 'identified')}
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
                    <div className="text-xs text-gray-500">{t('poäng', 'points')}</div>
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
                  {t('Visa detaljer', 'View details')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(analysis)}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  {t('Skriv ut', 'Print')}
                </Button>
                {onLoadToAI && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadToAI(analysis)}
                  >
                    <Brain className="h-4 w-4 mr-1" />
                    {t('Till AI', 'To AI')}
                  </Button>
                )}
                <Link href={`${basePath}/coach/video-analysis`} className="ml-auto">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t('Öppna', 'Open')}
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
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {t('Analysresultat', 'Analysis results')}
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
                    {getScoreLabel(selectedAnalysis.formScore, locale)}
                  </div>
                  <Progress value={selectedAnalysis.formScore} className="h-3 mt-4" />
                </div>
              )}

              {/* Issues */}
              {selectedAnalysis.issuesDetected && selectedAnalysis.issuesDetected.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {t(
                      `Identifierade problem (${selectedAnalysis.issuesDetected.length})`,
                      `Identified issues (${selectedAnalysis.issuesDetected.length})`
                    )}
                  </h3>
                  <div className="space-y-2">
                    {selectedAnalysis.issuesDetected.map((issue, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border-l-4 ${
                          issue.severity === 'HIGH'
                            ? 'border-red-500 bg-red-50'
                            : issue.severity === 'MEDIUM'
                            ? 'border-amber-500 bg-amber-50'
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
                    {t(
                      `Rekommendationer (${selectedAnalysis.recommendations.length})`,
                      `Recommendations (${selectedAnalysis.recommendations.length})`
                    )}
                  </h3>
                  <div className="space-y-2">
                    {selectedAnalysis.recommendations
                      .sort((a, b) => a.priority - b.priority)
                      .map((rec, i) => (
                        <div key={i} className="p-3 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-blue-100 text-blue-700">
                              {t('Prioritet', 'Priority')} {rec.priority}
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
                  {t('Skriv ut rapport', 'Print report')}
                </Button>
                {onLoadToAI && (
                  <Button variant="outline" onClick={() => handleLoadToAI(selectedAnalysis)}>
                    <Brain className="h-4 w-4 mr-2" />
                    {t('Ladda till AI Studio', 'Load to AI Studio')}
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
