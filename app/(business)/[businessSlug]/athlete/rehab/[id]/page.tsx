// app/(business)/[businessSlug]/athlete/rehab/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteRehabProgram } from '@/app/athlete/rehab/[id]/AthleteRehabProgram'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const program = await prisma.rehabProgram.findUnique({
    where: { id },
    select: { name: true },
  })

  return {
    title: program?.name || 'Rehabprogram',
    description: 'Visa och logga ditt rehabiliteringsprogram',
  }
}

export default async function BusinessAthleteRehabProgramPage({ params }: PageProps) {
  const { businessSlug, id: programId } = await params

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
    select: { clientId: true },
  })

  if (!athleteAccount) {
    redirect(`/${businessSlug}/athlete/onboarding`)
  }

  const clientId = athleteAccount.clientId

  // Verify this program belongs to this athlete
  const program = await prisma.rehabProgram.findFirst({
    where: {
      id: programId,
      clientId,
    },
    select: { id: true },
  })

  if (!program) {
    redirect(`/${businessSlug}/athlete/rehab`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <AthleteRehabProgram programId={programId} />
      </div>
    </div>
  )
}
