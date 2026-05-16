import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { ClubOnboardingWizard } from '@/components/coach/onboarding/ClubOnboardingWizard'
import { Building2 } from 'lucide-react'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function OnboardingWizardPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.onboardingWizard')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center mb-8">
        <Building2 className="h-10 w-10 mx-auto mb-3 text-blue-600" />
        <h1 className="text-2xl font-bold dark:text-white">
          {t('title', { businessName: membership.business.name })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('description')}
        </p>
      </div>

      <ClubOnboardingWizard
        businessSlug={businessSlug}
        businessName={membership.business.name}
      />
    </div>
  )
}
