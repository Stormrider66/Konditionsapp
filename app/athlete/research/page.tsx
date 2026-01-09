import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { SharedResearchList } from './SharedResearchList'

export const metadata = {
  title: 'Shared Research | Athlete Portal',
  description: 'View research reports shared by your coach',
}

export default async function AthleteResearchPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Get the athlete's client record
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!athleteAccount?.client) {
    redirect('/athlete/dashboard')
  }

  // Fetch shared research for this athlete
  const sharedResearch = await prisma.sharedResearchAccess.findMany({
    where: {
      clientId: athleteAccount.client.id,
      session: {
        status: 'COMPLETED',
      },
    },
    include: {
      session: {
        select: {
          id: true,
          provider: true,
          query: true,
          status: true,
          completedAt: true,
          coach: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { sharedAt: 'desc' },
  })

  const research = sharedResearch.map((sr) => ({
    shareId: sr.id,
    sessionId: sr.session.id,
    sharedAt: sr.sharedAt.toISOString(),
    notified: sr.notified,
    provider: sr.session.provider,
    query: sr.session.query,
    queryPreview:
      sr.session.query.substring(0, 100) + (sr.session.query.length > 100 ? '...' : ''),
    completedAt: sr.session.completedAt?.toISOString() || null,
    coachName: sr.session.coach.name || 'Your Coach',
  }))

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <SharedResearchList research={research} coachName={athleteAccount.client.user.name || 'Your Coach'} />
    </div>
  )
}
