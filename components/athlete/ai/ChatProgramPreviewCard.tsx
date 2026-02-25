'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Save,
  Loader2,
  Check,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import type { MergedProgram } from '@/lib/ai/program-generator'

interface ChatProgramPreviewCardProps {
  sessionId: string
  program: MergedProgram
  clientId: string
  conversationId?: string | null
  basePath: string
  onSaved?: (programId: string) => void
}

/** Get next Monday from today */
function getNextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const methodologyLabels: Record<string, string> = {
  POLARIZED: 'Polariserad (80/20)',
  NORWEGIAN: 'Norsk dubbeltröskel',
  CANOVA: 'Canova',
  PYRAMIDAL: 'Pyramidal',
  GENERAL: 'Generell',
}

export function ChatProgramPreviewCard({
  sessionId,
  program,
  clientId,
  conversationId,
  basePath,
  onSaved,
}: ChatProgramPreviewCardProps) {
  const { toast } = useToast()
  const router = useRouter()

  const [startDate, setStartDate] = useState(getNextMonday())
  const [isSaving, setIsSaving] = useState(false)
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null)
  const [showPhases, setShowPhases] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch('/api/ai/save-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mergedProgram: program,
          clientId,
          conversationId: conversationId || undefined,
          startDate,
          existingProgramAction: 'DEACTIVATE',
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSavedProgramId(data.program?.id)
        onSaved?.(data.program?.id)
        toast({
          title: 'Program sparat!',
          description: `"${program.name}" har sparats och aktiverats.`,
        })
      } else {
        toast({
          title: 'Kunde inte spara programmet',
          description: data.error || 'Försök igen.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Fel vid sparning',
        description: 'Ett oväntat fel uppstod.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Saved state — show success with link
  if (savedProgramId) {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 p-3 my-2">
        <div className="flex items-start gap-2 mb-2">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 p-1.5 shrink-0">
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Program sparat!
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              &quot;{program.name}&quot; — {program.totalWeeks} veckor, startar {startDate}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
          onClick={() => router.push(`${basePath}/athlete/programs/${savedProgramId}`)}
        >
          <ArrowRight className="h-3 w-3 mr-1" />
          Visa program
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10 p-3 my-2">
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 p-1.5 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 truncate">
            {program.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 flex-wrap">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-3 w-3" /> {program.totalWeeks} veckor
            </span>
            {program.methodology && (
              <>
                <span className="text-indigo-300 dark:text-indigo-600">|</span>
                <span>{methodologyLabels[program.methodology] || program.methodology}</span>
              </>
            )}
            {program.phases.length > 0 && (
              <>
                <span className="text-indigo-300 dark:text-indigo-600">|</span>
                <span>{program.phases.length} faser</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {program.description && (
        <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-2 line-clamp-2">
          {program.description}
        </p>
      )}

      {/* Phase list (collapsible) */}
      {program.phases.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setShowPhases(!showPhases)}
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
          >
            {showPhases ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showPhases ? 'Dölj faser' : 'Visa faser'}
          </button>
          {showPhases && (
            <div className="mt-1.5 space-y-1">
              {program.phases.map((phase, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-500/10 rounded px-2 py-1"
                >
                  <span className="font-medium shrink-0">v.{phase.weeks}</span>
                  <span className="truncate">{phase.name}</span>
                  {phase.focus && (
                    <span className="text-indigo-500 dark:text-indigo-400 truncate ml-auto">
                      {phase.focus}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start date picker */}
      <div className="flex items-center gap-2 mb-2">
        <label className="text-[11px] text-indigo-600 dark:text-indigo-400 shrink-0">
          Startdatum:
        </label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-7 text-xs flex-1 border-indigo-200 dark:border-indigo-500/30"
        />
      </div>

      {/* Hint */}
      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mb-2">
        Du kan fråga om programmet innan du sparar.
      </p>

      {/* Save button */}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={isSaving}
        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white w-full"
      >
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Save className="h-3 w-3 mr-1" />
        )}
        Spara program
      </Button>
    </div>
  )
}
