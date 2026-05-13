// app/(business)/[businessSlug]/coach/tools/page.tsx
import CoachToolsPage from '@/components/coach/tools/CoachToolsPage'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachToolsPage({ params }: PageProps) {
  const { businessSlug } = await params
  return <CoachToolsPage businessSlug={businessSlug} />
}
