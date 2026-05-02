// app/coach/field-tests/schedule/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import TestSchedule from '@/components/coach/field-tests/TestSchedule'

export default async function SchedulePage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <TestSchedule />
    </div>
  )
}
