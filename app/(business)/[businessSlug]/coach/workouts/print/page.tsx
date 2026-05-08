import { Suspense } from 'react'
import { WorkoutPrintPageClient } from '@/components/workouts/print/WorkoutPrintPageClient'

export default function WorkoutPrintPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Förbereder utskrift...</div>}>
      <WorkoutPrintPageClient />
    </Suspense>
  )
}

