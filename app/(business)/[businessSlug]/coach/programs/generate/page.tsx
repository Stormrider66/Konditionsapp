// app/(business)/[businessSlug]/coach/programs/generate/page.tsx
// Redirect to new multi-sport program wizard (business-scoped)
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessGenerateProgramPage({ params }: PageProps) {
  const { businessSlug } = await params
  // Redirect to the new multi-sport wizard within business context
  redirect(`/${businessSlug}/coach/programs/new`)
}
