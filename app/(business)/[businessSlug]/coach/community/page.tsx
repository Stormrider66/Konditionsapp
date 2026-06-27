import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound } from 'next/navigation'
import { CommunityFeed } from '@/components/coach/community/CommunityFeed'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'
import { getTranslations } from '@/i18n/server'
import { Users } from 'lucide-react'

interface CommunityPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.community')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  return (
    <RolePageFrame contentClassName="max-w-3xl">
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            {t('title')}
          </span>
        }
        description={t('description')}
      />
      <CommunityFeed />
    </RolePageFrame>
  )
}
