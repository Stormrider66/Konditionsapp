import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound } from 'next/navigation'
import { GymPlatformSettings } from '@/components/coach/settings/GymPlatformSettings'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { getTranslations } from '@/i18n/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface GymPlatformPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function GymPlatformPage({ params }: GymPlatformPageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.gymPlatform')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  return (
    <RolePageFrame contentClassName="max-w-4xl">
      <RolePageHeader
        eyebrow="Settings"
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/${businessSlug}/coach/settings`}>
              <ArrowLeft className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        }
      />
      <GymPlatformSettings />
    </RolePageFrame>
  )
}
