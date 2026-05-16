import { Suspense } from 'react'
import { WorkoutPrintPageClient } from '@/components/workouts/print/WorkoutPrintPageClient'
import { getTranslations } from '@/i18n/server'

export default async function WorkoutPrintPage() {
  const t = await getTranslations('coach.pages.workoutPrint')

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{t('preparing')}</div>}>
      <WorkoutPrintPageClient />
    </Suspense>
  )
}
