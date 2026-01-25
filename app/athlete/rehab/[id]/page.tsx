import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AthleteRehabProgram } from './AthleteRehabProgram'

interface PageProps {
  params: Promise<{ id: string }>
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

export default async function AthleteRehabProgramPage({ params }: PageProps) {
  const { id: programId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: {
      athleteAccount: {
        select: { clientId: true },
      },
    },
  })

  if (!dbUser || !dbUser.athleteAccount) {
    redirect('/login')
  }

  const clientId = dbUser.athleteAccount.clientId

  // Verify this program belongs to this athlete
  const program = await prisma.rehabProgram.findFirst({
    where: {
      id: programId,
      clientId,
    },
    select: { id: true },
  })

  if (!program) {
    redirect('/athlete/rehab')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <AthleteRehabProgram programId={programId} />
      </div>
    </div>
  )
}
