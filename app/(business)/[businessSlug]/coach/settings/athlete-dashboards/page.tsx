// app/(business)/[businessSlug]/coach/settings/athlete-dashboards/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { BasePathProvider } from '@/lib/contexts/BasePathContext'
import AthleteDashboardTemplatesClient from '@/components/coach/settings/athlete-dashboards/AthleteDashboardTemplatesClient'

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCoachAthleteDashboardTemplatesPage({
  params,
}: Props) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return (
    <BasePathProvider basePath={basePath}>
      <AthleteDashboardTemplatesClient businessId={membership.businessId} />
    </BasePathProvider>
  )
}
