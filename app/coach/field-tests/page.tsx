// app/coach/field-tests/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import ResultsAnalyzer from '@/components/coach/field-tests/ResultsAnalyzer'

export default async function FieldTestsPage() {
  await requireCoach()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <ResultsAnalyzer />
    </div>
  )
}
