'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import type { IntervalParticipantData } from '@/lib/interval-session/types'

interface LactateEntryPanelProps {
  sessionId: string
  participants: IntervalParticipantData[]
  currentInterval: number
}

export function LactateEntryPanel({
  sessionId,
  participants,
  currentInterval,
}: LactateEntryPanelProps) {
  const [values, setValues] = useState<Record<string, { lactate: string; hr: string }>>({})
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const handleSave = async (clientId: string) => {
    const val = values[clientId]
    if (!val?.lactate) return

    const lactate = parseFloat(val.lactate)
    if (isNaN(lactate) || lactate < 0 || lactate > 30) {
      toast.error('Ogiltigt laktatvarde (0-30)')
      return
    }

    const heartRate = val.hr ? parseInt(val.hr) : undefined

    try {
      const res = await fetch(`/api/coach/interval-sessions/${sessionId}/lactate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          intervalNumber: currentInterval,
          lactate,
          heartRate,
        }),
      })

      if (!res.ok) throw new Error()

      setSaved((prev) => new Set(prev).add(clientId))
      toast.success('Laktat sparat')
    } catch {
      toast.error('Kunde inte spara laktat')
    }
  }

  return (
    <GlassCard glow="emerald" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
      <GlassCardContent className="p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
          Laktat efter intervall {currentInterval}
        </h3>
        <div className="space-y-3">
          {participants.map((p) => {
            const existing = p.lactates.find(
              (l) => l.intervalNumber === currentInterval
            )
            const isSaved = saved.has(p.clientId) || !!existing

            return (
              <div
                key={p.clientId}
                className="flex items-center gap-3"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="w-28 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {p.clientName}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="mmol/L"
                  className="w-24 h-8 text-sm bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  defaultValue={existing?.lactate?.toString() ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [p.clientId]: {
                        ...prev[p.clientId],
                        lactate: e.target.value,
                      },
                    }))
                  }
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Puls"
                  className="w-20 h-8 text-sm bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  defaultValue={existing?.heartRate?.toString() ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [p.clientId]: {
                        ...prev[p.clientId],
                        hr: e.target.value,
                      },
                    }))
                  }
                />
                <Button
                  size="sm"
                  variant={isSaved ? 'ghost' : 'default'}
                  className={isSaved ? 'h-8 px-3' : 'h-8 px-3 bg-emerald-650 hover:bg-emerald-700 text-white'}
                  onClick={() => handleSave(p.clientId)}
                >
                  {isSaved ? (
                    <Check className="h-4 w-4 text-emerald-500 font-bold" />
                  ) : (
                    'Spara'
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
