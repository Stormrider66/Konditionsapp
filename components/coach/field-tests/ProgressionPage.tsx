// app/coach/field-tests/progression/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import ProgressionChart from '@/components/coach/field-tests/ProgressionChart'

export default async function ProgressionPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ProgressionChart />
    </div>
  )
}
