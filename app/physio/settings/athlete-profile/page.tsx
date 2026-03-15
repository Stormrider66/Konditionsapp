import { getCurrentUser } from '@/lib/auth-utils'
import { canAccessPhysioPlatform } from '@/lib/user-capabilities'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AthleteProfileSetupForm } from '@/components/coach/AthleteProfileSetupForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function PhysioAthleteProfileSettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!(await canAccessPhysioPlatform(user.id))) {
    redirect('/physio/dashboard')
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      selfAthleteClientId: true,
      selfAthleteClient: {
        select: {
          id: true,
          name: true,
          gender: true,
          height: true,
          weight: true,
        },
      },
    },
  })

  const hasAthleteProfile = Boolean(fullUser?.selfAthleteClientId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Athlete Mode Settings</h1>
          <p className="text-slate-600">Manage your personal athlete profile for self-coaching and rehab follow-up</p>
        </div>

        {hasAthleteProfile && fullUser?.selfAthleteClient ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Athlete Profile Active</CardTitle>
                  <CardDescription>Your personal athlete profile is set up</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
                  <p className="font-medium">{fullUser.selfAthleteClient.name}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Gender</p>
                  <p className="font-medium capitalize">
                    {fullUser.selfAthleteClient.gender?.toLowerCase() || 'Not set'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Height</p>
                  <p className="font-medium">{fullUser.selfAthleteClient.height} cm</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Weight</p>
                  <p className="font-medium">{fullUser.selfAthleteClient.weight} kg</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-slate-600 mb-4">
                  Switch to athlete mode to see your athlete dashboard and use the platform from the athlete perspective.
                </p>
                <div className="flex gap-3">
                  <Link href="/athlete/dashboard">
                    <Button className="gap-2">
                      <User className="h-4 w-4" />
                      Go to Athlete Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/physio/dashboard">
                    <Button variant="outline">Back to Physio Dashboard</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AthleteProfileSetupForm userName={user.name} />
        )}
      </div>
    </div>
  )
}
