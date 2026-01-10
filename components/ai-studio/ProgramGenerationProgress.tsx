'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import type { ProgressEvent, MergedProgram, ProgramOutline } from '@/lib/ai/program-generator'

// ============================================
// Types
// ============================================

interface ProgramGenerationProgressProps {
  sessionId: string
  onComplete: (program: MergedProgram) => void
  onError?: (error: string) => void
  onCancel?: () => void
}

interface ProgressState {
  status: string
  currentPhase: number
  totalPhases: number
  percent: number
  message: string
  outline?: ProgramOutline
  completedPhases: number[]
  error?: string
}

// ============================================
// Component
// ============================================

export function ProgramGenerationProgress({
  sessionId,
  onComplete,
  onError,
  onCancel,
}: ProgramGenerationProgressProps) {
  const [progress, setProgress] = useState<ProgressState>({
    status: 'PENDING',
    currentPhase: 0,
    totalPhases: 1,
    percent: 0,
    message: 'Startar...',
    completedPhases: [],
  })
  const [isConnected, setIsConnected] = useState(false)

  // Use refs to avoid dependency cycle in SSE connection
  const retryCountRef = useRef(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Store callbacks in refs to avoid recreating connect function
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
  }, [onComplete, onError])

  // Connect to SSE - stable function that doesn't depend on retryCount
  const connect = useCallback(() => {
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    const eventSource = new EventSource(
      `/api/ai/generate-program/${sessionId}/progress`
    )
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      retryCountRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressEvent

        setProgress((prev) => {
          const completedPhases = [...prev.completedPhases]
          // When we start generating phase N (currentPhase=N), phase N-1 is complete
          // Store as 1-indexed to match display logic (phaseNum = i + 1)
          if (
            data.type === 'phase' &&
            data.currentPhase > 1 &&
            !completedPhases.includes(data.currentPhase - 1)
          ) {
            completedPhases.push(data.currentPhase - 1)
          }

          return {
            status: data.status,
            currentPhase: data.currentPhase,
            totalPhases: data.totalPhases,
            percent: data.progressPercent,
            message: data.progressMessage,
            outline: data.outline || prev.outline,
            completedPhases,
            error: data.error,
          }
        })

        // Handle completion
        if (data.type === 'complete' && data.program) {
          eventSource.close()
          eventSourceRef.current = null
          onCompleteRef.current(data.program)
        }

        // Handle error
        if (data.type === 'error' && data.error) {
          eventSource.close()
          eventSourceRef.current = null
          onErrorRef.current?.(data.error)
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      eventSource.close()
      eventSourceRef.current = null

      // Retry connection up to 3 times with exponential backoff
      if (retryCountRef.current < 3) {
        const delay = 2000 * (retryCountRef.current + 1)
        retryCountRef.current += 1
        retryTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    }
  }, [sessionId]) // Only depends on sessionId, not on callbacks or retryCount

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [connect])

  // Get status icon
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-6 w-6 text-red-500" />
      case 'GENERATING_OUTLINE':
        return <FileText className="h-6 w-6 text-blue-500 animate-pulse" />
      case 'GENERATING_PHASE':
        return <Layers className="h-6 w-6 text-purple-500 animate-pulse" />
      case 'MERGING':
        return <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
      default:
        return <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
    }
  }

  // Get status label
  const getStatusLabel = () => {
    switch (progress.status) {
      case 'PENDING':
        return 'Väntar...'
      case 'GENERATING_OUTLINE':
        return 'Skapar programstruktur'
      case 'GENERATING_PHASE':
        return `Genererar fas ${progress.currentPhase}/${progress.totalPhases}`
      case 'MERGING':
        return 'Sammanställer programmet'
      case 'COMPLETED':
        return 'Klart!'
      case 'FAILED':
        return 'Misslyckades'
      default:
        return progress.status
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <CardTitle className="text-lg">Genererar program</CardTitle>
          </div>
          {!isConnected && progress.status !== 'COMPLETED' && progress.status !== 'FAILED' && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Återansluter...
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{getStatusLabel()}</span>
            <span className="font-medium">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>

        {/* Progress message */}
        {progress.message && (
          <p className="text-sm text-muted-foreground">{progress.message}</p>
        )}

        {/* Phase indicators */}
        {progress.totalPhases > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Faser</p>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: progress.totalPhases }).map((_, i) => {
                const phaseNum = i + 1
                const isCompleted = progress.completedPhases.includes(phaseNum) ||
                  (progress.status === 'COMPLETED')
                const isCurrent = progress.currentPhase === phaseNum &&
                  progress.status === 'GENERATING_PHASE'

                return (
                  <Badge
                    key={i}
                    variant={isCompleted ? 'default' : isCurrent ? 'secondary' : 'outline'}
                    className={`
                      ${isCompleted ? 'bg-green-500 hover:bg-green-600' : ''}
                      ${isCurrent ? 'animate-pulse' : ''}
                    `}
                  >
                    {isCompleted && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {isCurrent && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Fas {phaseNum}
                    {progress.outline?.phases[i]?.name && (
                      <span className="ml-1 opacity-70">
                        ({progress.outline.phases[i].name})
                      </span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Outline preview */}
        {progress.outline && progress.status !== 'PENDING' && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium">{progress.outline.programName}</p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>{progress.outline.totalWeeks} veckor</span>
              <span>•</span>
              <span>{progress.outline.phases.length} faser</span>
              {progress.outline.methodology && (
                <>
                  <span>•</span>
                  <span>{progress.outline.methodology}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {progress.error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{progress.error}</p>
          </div>
        )}

        {/* Actions */}
        {progress.status === 'FAILED' && onCancel && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Avbryt
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Försök igen
            </Button>
          </div>
        )}

        {/* Cancel button during generation */}
        {!['COMPLETED', 'FAILED'].includes(progress.status) && onCancel && (
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Avbryt
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default ProgramGenerationProgress
