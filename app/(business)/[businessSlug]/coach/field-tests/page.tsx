// app/(business)/[businessSlug]/coach/field-tests/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import ResultsAnalyzer from '@/components/coach/field-tests/ResultsAnalyzer'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessFieldTestsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ResultsAnalyzer />
    </div>
  )
}
