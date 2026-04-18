'use client'

import { useRouter } from 'next/navigation'
import { StrengthWorkoutPreview } from './StrengthWorkoutPreview'

interface StrengthWorkoutPageClientProps {
  assignmentId: string
  /** Where to send the athlete when the preview is closed. */
  fallbackRoute: string
}

export function StrengthWorkoutPageClient({
  assignmentId,
  fallbackRoute,
}: StrengthWorkoutPageClientProps) {
  const router = useRouter()
  return (
    <StrengthWorkoutPreview
      assignmentId={assignmentId}
      onClose={() => {
        if (window.history.length > 1) router.back()
        else router.push(fallbackRoute)
      }}
      onCompleted={() => router.push(fallbackRoute)}
    />
  )
}
