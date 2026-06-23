import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getLocale } from '@/i18n/server'
import { getCoachCardioReviewInboxData } from '@/lib/coach/cardio-review-inbox'
import { CardioReviewInboxClient } from '@/components/coach/cardio/CardioReviewInboxClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function CoachReviewInboxPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const locale = (await getLocale()) === 'sv' ? 'sv' : 'en'
  const data = await getCoachCardioReviewInboxData({
    coachUserId: user.id,
    businessId: membership.businessId,
    memberRole: membership.role,
    locale,
  })

  return (
    <CardioReviewInboxClient
      businessSlug={businessSlug}
      data={data}
      locale={locale}
    />
  )
}
