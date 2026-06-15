import { CoachQuickErgSessionDetail } from '@/components/coach/quick-erg/CoachQuickErgSessionDetail'

interface CoachQuickErgSessionPageProps {
  params: Promise<{ businessSlug: string; id: string; sessionId: string }>
}

export default async function CoachQuickErgSessionPage({ params }: CoachQuickErgSessionPageProps) {
  const { businessSlug, id, sessionId } = await params

  return (
    <CoachQuickErgSessionDetail
      businessSlug={businessSlug}
      clientId={id}
      sessionId={sessionId}
    />
  )
}
