// app/coach/injuries/modifications/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import AutoModifiedWorkoutsView from '@/components/coach/injury/AutoModifiedWorkoutsView'

export default async function ModificationsPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <AutoModifiedWorkoutsView />
    </div>
  )
}
