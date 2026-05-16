import { requireCoach } from '@/lib/auth-utils'
import TestSchedule from '@/components/coach/field-tests/TestSchedule'

interface SchedulePageProps {
  searchParams?: Promise<{
    clientId?: string
    source?: string
  }>
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  await requireCoach()
  const params = await searchParams
  const source = params?.source?.trim()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <TestSchedule highlightedClientId={params?.clientId} sourceLabel={source || undefined} />
    </div>
  )
}
