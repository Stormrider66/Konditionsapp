// app/coach/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'

export default async function CoachDashboardPage() {
  // Ensure user is a coach
  await requireCoach()

  // For now, redirect to existing clients page
  // Later this will be a proper dashboard with stats, recent activity, etc.
  redirect('/clients')
}
