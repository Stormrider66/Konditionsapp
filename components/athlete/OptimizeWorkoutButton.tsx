'use client'

/**
 * OptimizeWorkoutButton
 *
 * A smart button that appears on workout cards to help athletes
 * optimize their workout based on current readiness, fatigue,
 * and training load data.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sparkles,
  Loader2,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Zap,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OptimizationSuggestion {
  type: 'reduce_intensity' | 'reduce_volume' | 'increase_intensity' | 'swap_workout' | 'add_recovery' | 'proceed_as_planned'
  urgency: 'immediate' | 'recommended' | 'optional'
  title: string
  description: string
  originalValue?: string
  suggestedValue?: string
  confidence: number
  reason: string
}

interface ReadinessData {
  score: number | null
  trend: 'improving' | 'stable' | 'declining' | null
  fatigue: number
  acwr: number | null
}

interface OptimizationResponse {
  success: boolean
  readiness: ReadinessData
  suggestions: OptimizationSuggestion[]
  summary: string
  canProceed: boolean
}

interface OptimizeWorkoutButtonProps {
  workoutId: string
  clientId: string
  workoutType?: string
  plannedIntensity?: string
  variant?: 'default' | 'compact' | 'icon'
  className?: string
  onOptimize?: (suggestion: OptimizationSuggestion) => void
}

function getReadinessIcon(score: number | null) {
  if (score === null) return <Minus className="h-4 w-4 text-slate-400" />
  if (score >= 80) return <BatteryFull className="h-4 w-4 text-green-500" />
  if (score >= 60) return <BatteryMedium className="h-4 w-4 text-yellow-500" />
  return <BatteryLow className="h-4 w-4 text-orange-500" />
}

function getReadinessLabel(score: number | null) {
  if (score === null) return 'Ej rapporterad'
  if (score >= 80) return 'Utvilad'
  if (score >= 60) return 'Normal'
  return 'Trött'
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case 'immediate': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    case 'recommended': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
    default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
  }
}

function getSuggestionIcon(type: string) {
  switch (type) {
    case 'reduce_intensity':
    case 'reduce_volume':
      return <TrendingDown className="h-4 w-4 text-orange-500" />
    case 'increase_intensity':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'swap_workout':
      return <Zap className="h-4 w-4 text-blue-500" />
    case 'add_recovery':
      return <BatteryLow className="h-4 w-4 text-purple-500" />
    case 'proceed_as_planned':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    default:
      return <Sparkles className="h-4 w-4 text-blue-500" />
  }
}

export function OptimizeWorkoutButton({
  workoutId,
  clientId,
  workoutType,
  plannedIntensity,
  variant = 'default',
  className,
  onOptimize,
}: OptimizeWorkoutButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<OptimizationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<OptimizationSuggestion | null>(null)

  const fetchOptimization = async () => {
    if (data) return // Use cached data

    setIsLoading(true)
    setError(null)

    try {
      // Fetch readiness and optimization suggestions
      const params = new URLSearchParams({
        clientId,
        workoutId,
      })
      if (workoutType) params.set('workoutType', workoutType)
      if (plannedIntensity) params.set('plannedIntensity', plannedIntensity)

      const response = await fetch(`/api/ai/workout-optimization?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result)
      } else {
        // Generate local optimization based on available data
        const fallbackData = await generateLocalOptimization(clientId)
        setData(fallbackData)
      }
    } catch (err) {
      // Fallback to local analysis
      const fallbackData = await generateLocalOptimization(clientId)
      setData(fallbackData)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      fetchOptimization()
    }
  }

  const handleApplySuggestion = (suggestion: OptimizationSuggestion) => {
    if (suggestion.type === 'proceed_as_planned') {
      setIsOpen(false)
      return
    }

    setSelectedSuggestion(suggestion)
    setShowConfirmDialog(true)
  }

  const confirmApply = () => {
    if (selectedSuggestion && onOptimize) {
      onOptimize(selectedSuggestion)
    }
    setShowConfirmDialog(false)
    setIsOpen(false)
  }

  // Generate local optimization based on daily metrics
  async function generateLocalOptimization(clientId: string): Promise<OptimizationResponse> {
    try {
      const metricsResponse = await fetch(`/api/daily-metrics?clientId=${clientId}&limit=1`)
      const metrics = await metricsResponse.json()

      const readinessScore = metrics?.data?.[0]?.readinessScore ?? null
      const fatigue = metrics?.data?.[0]?.fatigue ?? 50

      const suggestions: OptimizationSuggestion[] = []

      if (readinessScore !== null && readinessScore < 50) {
        suggestions.push({
          type: 'reduce_intensity',
          urgency: 'immediate',
          title: 'Sänk intensiteten',
          description: 'Din beredskap är låg. Överväg att köra passet på lägre intensitet.',
          originalValue: plannedIntensity || 'Planerad',
          suggestedValue: 'Lätt/Återhämtning',
          confidence: 0.85,
          reason: `Beredskap ${readinessScore}/100 indikerar behov av återhämtning`,
        })
      } else if (readinessScore !== null && readinessScore < 70) {
        suggestions.push({
          type: 'reduce_volume',
          urgency: 'recommended',
          title: 'Minska volymen',
          description: 'Överväg att korta ner passet eller ta färre intervaller.',
          confidence: 0.7,
          reason: `Beredskap ${readinessScore}/100 - moderat anpassning rekommenderas`,
        })
      }

      if (fatigue > 70) {
        suggestions.push({
          type: 'add_recovery',
          urgency: 'recommended',
          title: 'Lägg till extra återhämtning',
          description: 'Hög muskulär trötthet detekterad. Planera in extra vila.',
          confidence: 0.75,
          reason: 'Muskulär trötthet över normalt, vila behövs',
        })
      }

      if (suggestions.length === 0) {
        suggestions.push({
          type: 'proceed_as_planned',
          urgency: 'optional',
          title: 'Fortsätt som planerat',
          description: 'Inga justeringar behövs. Du verkar redo för passet!',
          confidence: 0.9,
          reason: 'Alla indikatorer ser bra ut',
        })
      }

      return {
        success: true,
        readiness: {
          score: readinessScore,
          trend: null,
          fatigue,
          acwr: null,
        },
        suggestions,
        summary: suggestions[0]?.description || 'Analys slutförd',
        canProceed: readinessScore === null || readinessScore >= 50,
      }
    } catch {
      return {
        success: true,
        readiness: { score: null, trend: null, fatigue: 50, acwr: null },
        suggestions: [{
          type: 'proceed_as_planned',
          urgency: 'optional',
          title: 'Fortsätt som planerat',
          description: 'Ingen beredskapsdata tillgänglig. Lyssna på kroppen.',
          confidence: 0.5,
          reason: 'Otillräcklig data för analys',
        }],
        summary: 'Ingen beredskapsdata tillgänglig',
        canProceed: true,
      }
    }
  }

  if (variant === 'icon') {
    return (
      <>
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', className)}
              title="Optimera pass"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <OptimizationContent
              isLoading={isLoading}
              error={error}
              data={data}
              onApply={handleApplySuggestion}
            />
          </PopoverContent>
        </Popover>

        <ConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          suggestion={selectedSuggestion}
          onConfirm={confirmApply}
        />
      </>
    )
  }

  if (variant === 'compact') {
    return (
      <>
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-7 text-xs gap-1', className)}
            >
              <Sparkles className="h-3 w-3" />
              Optimera
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <OptimizationContent
              isLoading={isLoading}
              error={error}
              data={data}
              onApply={handleApplySuggestion}
            />
          </PopoverContent>
        </Popover>

        <ConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          suggestion={selectedSuggestion}
          onConfirm={confirmApply}
        />
      </>
    )
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', className)}
          >
            <Sparkles className="h-4 w-4" />
            Optimera pass
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <OptimizationContent
            isLoading={isLoading}
            error={error}
            data={data}
            onApply={handleApplySuggestion}
          />
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        suggestion={selectedSuggestion}
        onConfirm={confirmApply}
      />
    </>
  )
}

// Optimization content component
function OptimizationContent({
  isLoading,
  error,
  data,
  onApply,
}: {
  isLoading: boolean
  error: string | null
  data: OptimizationResponse | null
  onApply: (suggestion: OptimizationSuggestion) => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
        <p className="text-sm text-muted-foreground">Analyserar beredskap...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <AlertTriangle className="h-6 w-6 text-orange-500 mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Smart Optimering</h4>
        {data.readiness.score !== null && (
          <Badge variant="secondary" className="gap-1">
            {getReadinessIcon(data.readiness.score)}
            {getReadinessLabel(data.readiness.score)}
          </Badge>
        )}
      </div>

      {/* Readiness Summary */}
      {data.readiness.score !== null && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Beredskap</span>
            <span className="text-sm font-bold">{data.readiness.score}/100</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                data.readiness.score >= 80 ? 'bg-green-500' :
                data.readiness.score >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
              )}
              style={{ width: `${data.readiness.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Rekommendationer</p>
        {data.suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onApply(suggestion)}
            className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {getSuggestionIcon(suggestion.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{suggestion.title}</span>
                  <Badge className={cn('text-[10px] h-4 px-1', getUrgencyColor(suggestion.urgency))}>
                    {suggestion.urgency === 'immediate' ? 'Viktigt' :
                     suggestion.urgency === 'recommended' ? 'Förslag' : 'Valfritt'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {suggestion.description}
                </p>
                {suggestion.originalValue && suggestion.suggestedValue && (
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <span className="text-slate-500">{suggestion.originalValue}</span>
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {suggestion.suggestedValue}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      {!data.canProceed && (
        <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Vila rekommenderas starkt</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Confirmation dialog
function ConfirmDialog({
  open,
  onOpenChange,
  suggestion,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestion: OptimizationSuggestion | null
  onConfirm: () => void
}) {
  if (!suggestion) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tillämpa optimering?</AlertDialogTitle>
          <AlertDialogDescription>
            {suggestion.description}
            <br /><br />
            <span className="text-xs text-muted-foreground">
              Anledning: {suggestion.reason}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Tillämpa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
