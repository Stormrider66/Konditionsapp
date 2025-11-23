// app/coach/cross-training/projection/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import FitnessProjection from '@/components/coach/cross-training/FitnessProjection'

export default async function ProjectionPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <FitnessProjection />
    </div>
  )
}
