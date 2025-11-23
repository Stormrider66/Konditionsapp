// app/coach/injuries/acwr/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import { ACWRRiskMonitor } from '@/components/coach/injury/ACWRRiskMonitor'

export default async function ACWRPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ACWRRiskMonitor />
    </div>
  )
}
