'use client'

/**
 * Manual Form Page
 *
 * Page for structured manual workout entry.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { QuickForm } from '@/components/athlete/adhoc/QuickForm'
import { ProcessingStatus } from '@/components/athlete/adhoc/ProcessingStatus'
import { toast } from 'sonner'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { useBasePath } from '@/lib/contexts/BasePathContext'

type PageState = 'input' | 'processing' | 'error'

export default function ManualFormPage() {
  const basePath = useBasePath()
  const router = useRouter()
  const [state, setState] = useState<PageState>('input')
  const [errorMessage, setErrorMessage] = useState<string>()

  const handleSubmit = async (data: { parsedWorkout: ParsedWorkout; workoutDate: Date }) => {
    setState('processing')
    setErrorMessage(undefined)

    try {
      // Step 1: Create ad-hoc workout entry with parsed structure directly
      const createRes = await fetch('/api/adhoc-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: 'MANUAL_FORM',
          workoutDate: data.workoutDate.toISOString(),
          rawInputText: JSON.stringify(data.parsedWorkout),
        }),
      })

      if (!createRes.ok) {
        const error = await createRes.json()
        throw new Error(error.error || 'Failed to create workout entry')
      }

      const createData = await createRes.json()
      const workoutId = createData.data.id

      // Step 2: For manual form, we can set status to READY_FOR_REVIEW directly
      // by calling process with the pre-built structure
      const processRes = await fetch(`/api/adhoc-workouts/${workoutId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skipAI: true,
          parsedStructure: data.parsedWorkout,
        }),
      })

      if (!processRes.ok) {
        const error = await processRes.json()
        throw new Error(error.error || 'Failed to process workout')
      }

      // Success - redirect to review page
      router.push(`${basePath}/athlete/log-workout/${workoutId}/review`)
    } catch (error) {
      console.error('Error submitting form:', error)
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Ett fel uppstod')
      toast.error('Det gick inte att spara passet')
    }
  }

  const handleRetry = () => {
    setState('input')
  }

  if (state === 'processing') {
    return (
      <div className="container max-w-2xl py-8">
        <ProcessingStatus
          state="processing"
          message="Sparar ditt pass..."
        />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="container max-w-2xl py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setState('input')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Något gick fel</h1>
          </div>
        </div>

        <ProcessingStatus
          state="error"
          errorMessage={errorMessage}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${basePath}/athlete/log-workout`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Fyll i formulär</h1>
          <p className="text-muted-foreground">
            Ange detaljer om ditt träningspass manuellt
          </p>
        </div>
      </div>

      <QuickForm onSubmit={handleSubmit} isProcessing={false} />
    </div>
  )
}
