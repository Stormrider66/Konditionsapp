'use client'

/**
 * Live Voice Transcript View
 *
 * Coach-facing component showing the transcript of a live voice coaching session.
 * Displays role-tagged messages in a timeline format.
 */

import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import { Mic, Radio } from 'lucide-react'

interface TranscriptEntry {
  id: string
  role: string
  content: string
  timestamp: string
}

interface LiveVoiceTranscriptViewProps {
  transcripts: TranscriptEntry[]
  summary?: string | null
  painFlagged?: boolean
}

type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export function LiveVoiceTranscriptView({
  transcripts,
  summary,
  painFlagged,
}: LiveVoiceTranscriptViewProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'

  if (transcripts.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">
        {copy(locale, 'No transcripts available.', 'Inga transkriptioner tillgängliga.')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className={cn(
          'p-3 rounded-lg text-sm',
          painFlagged
            ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
            : 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
        )}>
          <p className="font-semibold text-xs uppercase tracking-wide mb-1 text-slate-500">
            {copy(locale, 'AI summary', 'AI-sammanfattning')}
          </p>
          <p className="text-slate-700 dark:text-slate-300">{summary}</p>
        </div>
      )}

      {/* Transcript timeline */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {transcripts.map((t) => {
          const isAthlete = t.role === 'athlete'
          return (
            <div
              key={t.id}
              className={cn(
                'flex gap-2 items-start',
                isAthlete ? 'flex-row' : 'flex-row-reverse'
              )}
            >
              <div className={cn(
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                isAthlete
                  ? 'bg-slate-200 dark:bg-slate-700'
                  : 'bg-emerald-100 dark:bg-emerald-900/30'
              )}>
                {isAthlete ? (
                  <Mic className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                ) : (
                  <Radio className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div className={cn(
                'rounded-lg px-3 py-1.5 text-sm max-w-[80%]',
                isAthlete
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
              )}>
                {t.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
