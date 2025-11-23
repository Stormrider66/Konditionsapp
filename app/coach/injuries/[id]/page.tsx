// app/coach/injuries/[id]/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import InjuryProgressTimeline from '@/components/coach/injury/InjuryProgressTimeline'

export default async function InjuryProgressPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <InjuryProgressTimeline />
    </div>
  )
}
