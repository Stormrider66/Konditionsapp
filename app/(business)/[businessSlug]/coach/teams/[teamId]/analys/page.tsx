import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import { getTranslations } from '@/i18n/server'

interface TeamAnalysisHubPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamAnalysisHubPage({ params }: TeamAnalysisHubPageProps) {
  const { businessSlug, teamId } = await params
  const t = await getTranslations('coach.pages.teamDetail')
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!team) {
    notFound()
  }

  const teamBase = `/${businessSlug}/coach/teams/${teamId}`

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard glow="blue">
          <GlassCardHeader>
            <GlassCardTitle className="dark:text-white">{t('quickLinks.analysis.title')}</GlassCardTitle>
            <GlassCardDescription>
              {t('quickLinks.analysis.description')}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <Link href={`${teamBase}/analysis`}>
              <Button>{t('quickLinks.analysis.cta')}</Button>
            </Link>
          </GlassCardContent>
        </GlassCard>

        <GlassCard glow="emerald">
          <GlassCardHeader>
            <GlassCardTitle className="dark:text-white">{t('quickLinks.tests.title')}</GlassCardTitle>
            <GlassCardDescription>
              {t('quickLinks.tests.description')}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <Link href={`${teamBase}/tests`}>
              <Button variant="outline">{t('quickLinks.tests.cta')}</Button>
            </Link>
          </GlassCardContent>
        </GlassCard>

        <GlassCard glow="purple">
          <GlassCardHeader>
            <GlassCardTitle className="dark:text-white">{t('quickLinks.multivariate.title')}</GlassCardTitle>
            <GlassCardDescription>
              {t('quickLinks.multivariate.description')}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <Link href={`${teamBase}/multivariate`}>
              <Button variant="outline">{t('quickLinks.multivariate.cta')}</Button>
            </Link>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
