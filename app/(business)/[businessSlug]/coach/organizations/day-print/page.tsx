import { notFound } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import {
  getOrganizationDayPrintItems,
  parseDayPrintSelection,
} from '@/lib/workout-print/day-pack'
import { PrintableWorkoutPackClient } from '@/components/workouts/print/PrintableWorkoutPackClient'

interface PageProps {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    date?: string
    organizationId?: string
    items?: string
  }>
}

function EmptyPrintState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
        <h1 className="mt-3 text-lg font-semibold">Ingen utskrift att visa</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  )
}

export default async function OrganizationDayPrintPage({ params, searchParams }: PageProps) {
  const { businessSlug } = await params
  const query = await searchParams
  const user = await requireCoach()
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    notFound()
  }

  if (!query.date) {
    return <EmptyPrintState message="Välj ett datum från organisationssidan först." />
  }

  const selection = parseDayPrintSelection(query.items)
  if (selection.size === 0) {
    return <EmptyPrintState message="Välj minst ett lagpass och antal kopior innan du öppnar utskriften." />
  }

  const dayItems = await getOrganizationDayPrintItems({
    userId: user.id,
    businessSlug,
    date: query.date,
    organizationId: query.organizationId || null,
    ids: Array.from(selection.keys()),
  })

  const entries = dayItems.flatMap((item) => {
    const copies = selection.get(item.id) || 0
    return Array.from({ length: copies }, (_, index) => ({
      key: `${item.id}-${index}`,
      workout: item.workout,
    }))
  })

  if (entries.length === 0) {
    return <EmptyPrintState message="Passet hittades inte längre, eller så saknar du åtkomst till laget." />
  }

  return <PrintableWorkoutPackClient entries={entries} dateLabel={dayItems[0]?.dateLabel || query.date} />
}
