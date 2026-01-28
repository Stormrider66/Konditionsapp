'use client'

/**
 * Text Input Page
 *
 * Page for entering workout description as text.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TextInput } from '@/components/athlete/adhoc/TextInput'
import { ProcessingStatus } from '@/components/athlete/adhoc/ProcessingStatus'
import { toast } from 'sonner'
import { useBasePath } from '@/lib/contexts/BasePathContext'

type PageState = 'input' | 'processing' | 'error'

export default function TextInputPage() {
  const basePath = useBasePath()
  const router = useRouter()
  const [state, setState] = useState<PageState>('input')
  const [errorMessage, setErrorMessage] = useState<string>()
  const [adHocId, setAdHocId] = useState<string>()
  const [inputData, setInputData] = useState<{ text: string; workoutDate: Date }>()

  const handleSubmit = async (data: { text: string; workoutDate: Date }) => {
    setInputData(data)
    setState('processing')
    setErrorMessage(undefined)

    try {
      // Step 1: Create ad-hoc workout entry
      const createRes = await fetch('/api/adhoc-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: 'TEXT',
          workoutDate: data.workoutDate.toISOString(),
          rawInputText: data.text,
        }),
      })

      if (!createRes.ok) {
        const error = await createRes.json()
        throw new Error(error.error || 'Failed to create workout entry')
      }

      const createData = await createRes.json()
      const workoutId = createData.data.id
      setAdHocId(workoutId)

      // Step 2: Process with AI
      const processRes = await fetch(`/api/adhoc-workouts/${workoutId}/process`, {
        method: 'POST',
      })

      if (!processRes.ok) {
        const error = await processRes.json()
        throw new Error(error.error || 'Failed to process workout')
      }

      // Success - redirect to review page
      router.push(`${basePath}/athlete/log-workout/${workoutId}/review`)
    } catch (error) {
      console.error('Error submitting workout:', error)
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Ett fel uppstod')
      toast.error('Det gick inte att analysera passet')
    }
  }

  const handleRetry = async () => {
    if (inputData) {
      await handleSubmit(inputData)
    } else {
      setState('input')
    }
  }

  if (state === 'processing') {
    return (
      <div className="container max-w-2xl py-8">
        <ProcessingStatus
          state="processing"
          message="AI:n analyserar din beskrivning..."
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
          <h1 className="text-2xl font-bold">Skriv in pass</h1>
          <p className="text-muted-foreground">
            Beskriv ditt träningspass med egna ord
          </p>
        </div>
      </div>

      <TextInput onSubmit={handleSubmit} isProcessing={false} />
    </div>
  )
}
