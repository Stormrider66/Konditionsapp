// app/coach/injuries/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import InjuryAlertCenter from '@/components/coach/injury/InjuryAlertCenter'

export default async function InjuriesPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <InjuryAlertCenter />
    </div>
  )
}
