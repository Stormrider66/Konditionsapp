// app/coach/cross-training/preferences/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import ModalityPreferences from '@/components/coach/cross-training/ModalityPreferences'

export default async function PreferencesPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ModalityPreferences />
    </div>
  )
}
