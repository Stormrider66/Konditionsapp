// app/coach/cross-training/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import SubstitutionSchedule from '@/components/coach/cross-training/SubstitutionSchedule'

export default async function CrossTrainingPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <SubstitutionSchedule />
    </div>
  )
}
