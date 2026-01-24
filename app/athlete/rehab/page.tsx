import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AthleteRehabOverview } from './AthleteRehabOverview'

export const metadata = {
  title: 'Rehabilitering | Athlete',
  description: 'Se dina aktiva rehabiliteringsprogram och övningar',
}

export default async function AthleteRehabPage() {
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
      athleteAccounts: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!dbUser || !dbUser.athleteAccounts[0]) {
    redirect('/login')
  }

  const clientId = dbUser.athleteAccounts[0].clientId

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <AthleteRehabOverview clientId={clientId} />
      </div>
    </div>
  )
}
