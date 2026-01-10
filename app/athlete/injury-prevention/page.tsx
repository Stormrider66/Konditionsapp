// app/athlete/injury-prevention/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { InjuryPreventionDashboard } from '@/components/athlete/injury-prevention'

export const metadata = {
  title: 'Skadeförebyggande | Atlet',
  description: 'Övervaka din belastning och förebygg skador',
}

export default async function InjuryPreventionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify athlete account exists
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  return (
    <div className="container max-w-4xl py-8">
      <InjuryPreventionDashboard />
    </div>
  )
}
