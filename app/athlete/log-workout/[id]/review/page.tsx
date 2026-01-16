'use client'

/**
 * Workout Review Page
 *
 * Shows the parsed workout for review and confirmation.
 */

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { WorkoutReview } from '@/components/athlete/adhoc/WorkoutReview'
import { ProcessingStatus } from '@/components/athlete/adhoc/ProcessingStatus'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { toast } from 'sonner'

interface ReviewPageProps {
  params: Promise<{ id: string }>
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [parsedWorkout, setParsedWorkout] = useState<ParsedWorkout | null>(null)

  const fetchWorkoutData = useCallback(async () => {
    try {
      setLoading(true)
      setError(undefined)

      const res = await fetch(`/api/adhoc-workouts/${id}`)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch workout')
      }

      const data = await res.json()

      if (data.data.status === 'CONFIRMED') {
        // Already confirmed, redirect to athlete dashboard
        toast.info('Detta pass är redan bekräftat')
        router.push('/athlete')
        return
      }

      if (data.data.status !== 'READY_FOR_REVIEW') {
        throw new Error('Passet är inte redo för granskning')
      }

      setParsedWorkout(data.data.parsedStructure as ParsedWorkout)
    } catch (error) {
      console.error('Error fetching workout:', error)
      setError(error instanceof Error ? error.message : 'Ett fel uppstod')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchWorkoutData()
  }, [fetchWorkoutData])

  const handleConfirm = async (data: {
    parsedStructure?: ParsedWorkout
    perceivedEffort?: number
    feeling?: 'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'EXHAUSTED'
    notes?: string
  }) => {
    try {
      setSubmitting(true)

      const res = await fetch(`/api/adhoc-workouts/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to confirm workout')
      }

      toast.success('Passet har sparats!')
      router.push('/athlete')
    } catch (error) {
      console.error('Error confirming workout:', error)
      toast.error(error instanceof Error ? error.message : 'Det gick inte att spara passet')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/athlete/log-workout')
  }

  if (loading) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !parsedWorkout) {
    return (
      <div className="container max-w-2xl py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/athlete/log-workout">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Fel</h1>
          </div>
        </div>

        <ProcessingStatus
          state="error"
          errorMessage={error || 'Kunde inte ladda passet'}
          onRetry={fetchWorkoutData}
        />
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/athlete/log-workout">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Granska pass</h1>
          <p className="text-muted-foreground">
            Kontrollera att uppgifterna stämmer
          </p>
        </div>
      </div>

      <WorkoutReview
        parsedWorkout={parsedWorkout}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isSubmitting={submitting}
      />
    </div>
  )
}
