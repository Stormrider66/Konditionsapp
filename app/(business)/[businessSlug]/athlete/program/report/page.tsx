// app/(business)/[businessSlug]/athlete/program/report/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import ProgramReportPage from '@/app/athlete/program/report/page'

interface BusinessProgramReportPageProps {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{ programId?: string }>
}

export default async function BusinessProgramReportPage({ params, searchParams }: BusinessProgramReportPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <ProgramReportPage searchParams={searchParams} />
}
