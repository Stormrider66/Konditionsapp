// app/(business)/[businessSlug]/coach/tests/new/page.tsx
import NewFieldTestPage from '@/components/coach/tests/NewFieldTestPage'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessNewFieldTestPage({ params }: PageProps) {
  const { businessSlug } = await params
  return <NewFieldTestPage businessSlug={businessSlug} />
}
