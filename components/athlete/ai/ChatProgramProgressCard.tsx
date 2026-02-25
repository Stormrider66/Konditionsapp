'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles, AlertCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MergedProgram } from '@/lib/ai/program-generator'

interface ChatProgramProgressCardProps {
  sessionId: string
  sport: string
  totalWeeks: number
  totalPhases: number
  estimatedMinutes: number
  goal: string
  onComplete: (program: MergedProgram) => void
  onError?: (error: string) => void
}

interface ProgressState {
  currentPhase: number
  totalPhases: number
  progressPercent: number
  progressMessage: string
  status: string
}

export function ChatProgramProgressCard({
  sessionId,
  sport,
  totalWeeks,
  totalPhases,
  estimatedMinutes,
  goal,
  onComplete,
  onError,
}: ChatProgramProgressCardProps) {
  const [progress, setProgress] = useState<ProgressState>({
    currentPhase: 0,
    totalPhases,
    progressPercent: 0,
    progressMessage: 'Startar generering...',
    status: 'PENDING',
  })
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/ai/generate-program/${sessionId}/progress`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        setProgress({
          currentPhase: data.currentPhase || 0,
          totalPhases: data.totalPhases || totalPhases,
          progressPercent: data.progressPercent || 0,
          progressMessage: data.progressMessage || '',
          status: data.status || 'PENDING',
        })

        if (data.type === 'complete' && data.program) {
          es.close()
          onComplete(data.program as MergedProgram)
        }

        if (data.type === 'error') {
          es.close()
          const errorMsg = data.error || 'Programgenereringen misslyckades.'
          setError(errorMsg)
          onError?.(errorMsg)
        }
      } catch {
        // Ignore parse errors from SSE
      }
    }

    es.onerror = () => {
      // EventSource will auto-reconnect for transient errors
      // Only set error if the connection is closed
      if (es.readyState === EventSource.CLOSED) {
        setError('Anslutningen bröts. Programmet genereras fortfarande i bakgrunden.')
      }
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [sessionId, totalPhases, onComplete, onError])

  const statusMessages: Record<string, string> = {
    PENDING: 'Förbereder generering...',
    GENERATING_OUTLINE: 'Skapar programstruktur...',
    GENERATING_PHASE: `Genererar fas ${progress.currentPhase} av ${progress.totalPhases}...`,
    MERGING: 'Slår ihop alla faser...',
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10 p-3 my-2">
        <div className="flex items-start gap-2">
          <div className="rounded-full bg-red-100 dark:bg-red-500/20 p-1.5 shrink-0">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">
              Programgenereringen misslyckades
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 p-3 my-2">
      <div className="flex items-start gap-2 mb-2">
        <div className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 p-1.5 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
            Skapar träningsprogram
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-indigo-600 dark:text-indigo-400">
            <span>{sport}</span>
            <span className="text-indigo-300 dark:text-indigo-600">|</span>
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-3 w-3" /> {totalWeeks} veckor
            </span>
            <span className="text-indigo-300 dark:text-indigo-600">|</span>
            <span>~{estimatedMinutes} min</span>
          </div>
        </div>
      </div>

      {/* Goal */}
      <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-2 line-clamp-2">
        {goal}
      </p>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              'bg-gradient-to-r from-indigo-500 to-blue-500'
            )}
            style={{ width: `${Math.max(progress.progressPercent, 2)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400">
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {progress.progressMessage || statusMessages[progress.status] || 'Genererar...'}
          </span>
          <span>{Math.round(progress.progressPercent)}%</span>
        </div>
      </div>
    </div>
  )
}
