// app/(business)/[businessSlug]/athlete/rehab/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteRehabOverview } from '@/app/athlete/rehab/AthleteRehabOverview'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export async function generateMetadata() {
  const t = await getTranslations('athletePages.rehab')
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  }
}

export default async function BusinessAthleteRehabPage({ params }: PageProps) {
  const { businessSlug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Validate business membership
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
  })

  if (!dbUser) {
    redirect('/login')
  }

  const membership = await validateBusinessMembership(dbUser.id, businessSlug)
  if (!membership) {
    notFound()
  }

  // Get user's athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: dbUser.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    redirect(`/${businessSlug}/athlete/onboarding`)
  }

  const clientId = athleteAccount.clientId

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <AthleteRehabOverview clientId={clientId} />
      </div>
    </div>
  )
}
