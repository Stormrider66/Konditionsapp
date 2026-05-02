// app/coach/field-tests/validation/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import ValidationDashboard from '@/components/coach/field-tests/ValidationDashboard'

export default async function ValidationPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ValidationDashboard />
    </div>
  )
}
