import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound } from 'next/navigation'
import { SocialMediaManager } from '@/components/coach/social/SocialMediaManager'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

interface SocialPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function SocialMediaPage({ params }: SocialPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.social')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  return (
    <RolePageFrame>
      <RolePageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <SocialMediaManager basePath={`/${businessSlug}`} />
    </RolePageFrame>
  )
}
