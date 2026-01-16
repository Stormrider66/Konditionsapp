'use client'

/**
 * Photo Input Page
 *
 * Page for capturing/uploading workout photos.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PhotoCapture } from '@/components/athlete/adhoc/PhotoCapture'
import { ProcessingStatus } from '@/components/athlete/adhoc/ProcessingStatus'
import { toast } from 'sonner'

type PageState = 'input' | 'processing' | 'error'

export default function PhotoInputPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>('input')
  const [errorMessage, setErrorMessage] = useState<string>()
  const [inputData, setInputData] = useState<{ imageUrl: string; workoutDate: Date }>()

  const handleSubmit = async (data: { imageUrl: string; workoutDate: Date }) => {
    setInputData(data)
    setState('processing')
    setErrorMessage(undefined)

    try {
      // Step 1: Create ad-hoc workout entry
      const createRes = await fetch('/api/adhoc-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: 'PHOTO',
          workoutDate: data.workoutDate.toISOString(),
          rawInputUrl: data.imageUrl,
        }),
      })

      if (!createRes.ok) {
        const error = await createRes.json()
        throw new Error(error.error || 'Failed to create workout entry')
      }

      const createData = await createRes.json()
      const workoutId = createData.data.id

      // Step 2: Process with AI (image analysis)
      const processRes = await fetch(`/api/adhoc-workouts/${workoutId}/process`, {
        method: 'POST',
      })

      if (!processRes.ok) {
        const error = await processRes.json()
        throw new Error(error.error || 'Failed to process workout')
      }

      // Success - redirect to review page
      router.push(`/athlete/log-workout/${workoutId}/review`)
    } catch (error) {
      console.error('Error submitting photo:', error)
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Ett fel uppstod')
      toast.error('Det gick inte att analysera bilden')
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
          message="AI:n analyserar din bild..."
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
          <Link href="/athlete/log-workout">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ta en bild</h1>
          <p className="text-muted-foreground">
            Fotografera ett whiteboard, träningsprogram eller anteckningar
          </p>
        </div>
      </div>

      <PhotoCapture onSubmit={handleSubmit} isProcessing={false} />
    </div>
  )
}
