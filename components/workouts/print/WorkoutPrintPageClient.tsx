'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { PrintableWorkoutSheet } from './PrintableWorkoutSheet'
import {
  normalizePrintableWorkout,
  type PrintableWorkout,
  type PrintableWorkoutKind,
} from '@/lib/workout-print/normalize'

const ENDPOINTS: Record<PrintableWorkoutKind, (id: string) => string> = {
  strength: (id) => `/api/strength-sessions/${id}`,
  cardio: (id) => `/api/cardio-sessions/${id}`,
  hybrid: (id) => `/api/hybrid-workouts/${id}`,
  agility: (id) => `/api/agility-workouts/${id}`,
}

function isPrintableKind(value: string | null): value is PrintableWorkoutKind {
  return value === 'strength' || value === 'cardio' || value === 'hybrid' || value === 'agility'
}

function formatDateParam(date: string | null): string | null {
  if (!date) return null
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('sv-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function WorkoutPrintPageClient() {
  const searchParams = useSearchParams()
  const kind = searchParams.get('kind')
  const id = searchParams.get('id')
  const athleteName = searchParams.get('athlete')
  const dateLabel = formatDateParam(searchParams.get('date'))
  const [workout, setWorkout] = useState<PrintableWorkout | null>(null)
  const [error, setError] = useState<string | null>(null)
  const validationError = !isPrintableKind(kind) || !id
    ? 'Saknar pass eller passtyp för utskrift.'
    : null
  const endpoint = useMemo(() => {
    if (!isPrintableKind(kind) || !id) return null
    return ENDPOINTS[kind](id)
  }, [kind, id])

  useEffect(() => {
    if (!endpoint || !isPrintableKind(kind)) return

    let cancelled = false

    fetch(endpoint)
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error || 'Kunde inte hämta passet.')
        }
        return response.json()
      })
      .then((data) => {
        if (cancelled) return
        setWorkout(normalizePrintableWorkout(kind, data, { dateLabel, athleteName }))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Kunde inte hämta passet.')
      })

    return () => {
      cancelled = true
    }
  }, [endpoint, kind, dateLabel, athleteName])

  if (validationError || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h1 className="mt-3 text-lg font-semibold">Kunde inte öppna utskrift</h1>
          <p className="mt-2 text-sm text-slate-600">{validationError || error}</p>
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Förbereder utskrift...
        </div>
      </div>
    )
  }

  return <PrintableWorkoutSheet workout={workout} />
}
