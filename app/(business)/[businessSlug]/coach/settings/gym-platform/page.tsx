import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { notFound } from 'next/navigation'
import { GymPlatformSettings } from '@/components/coach/settings/GymPlatformSettings'
import { getTranslations } from '@/i18n/server'

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('description')}
          </p>
        </div>
        <GymPlatformSettings />
      </div>
    </div>
  )
}
