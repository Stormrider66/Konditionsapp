// app/(business)/[businessSlug]/coach/programs/generate/page.tsx
// Redirect to new multi-sport program wizard (business-scoped)
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function BusinessGenerateProgramPage({ params, searchParams }: PageProps) {
  const { businessSlug } = await params
  const query = await searchParams
  const nextParams = new URLSearchParams()

  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === 'string') {
      nextParams.set(key, value)
    }
  }

  // Redirect to the new multi-sport wizard within business context
  redirect(`/${businessSlug}/coach/programs/new${nextParams.size > 0 ? `?${nextParams.toString()}` : ''}`)
}
