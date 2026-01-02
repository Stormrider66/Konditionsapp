// app/athlete/body-composition/page.tsx
import { redirect } from 'next/navigation'
import { requireAthlete, getAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { BioimpedanceForm } from '@/components/forms/BioimpedanceForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Scale } from 'lucide-react'
import Link from 'next/link'

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

export default async function AthleteBodyCompositionPage() {
  const user = await requireAthlete()

  const clientId = await getAthleteClientId(user.id)

  if (!clientId) {
    redirect('/login')
  }

  // Get client name for display
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  })

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 pb-20 selection:bg-orange-500/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-orange-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto py-8 px-4 max-w-2xl relative z-10">
        {/* Navigation */}
        <Link href="/athlete/profile?tab=body">
          <Button variant="ghost" size="sm" className="gap-2 mb-6 text-slate-400 hover:text-white hover:bg-white/5 rounded-full px-4">
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till profil
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Scale className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tight text-white leading-none">
              Ny Mätning
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
              Kroppssammansättning & Bioimpedans
            </p>
          </div>
        </div>

        {/* Form Container */}
        <GlassCard className="border-white/5 bg-black/40 shadow-2xl overflow-hidden ring-1 ring-white/10">
          <GlassCardHeader className="border-b border-white/5 bg-white/[0.02] p-6">
            <GlassCardTitle className="text-xl font-black italic tracking-tight text-white">Mätningsdata</GlassCardTitle>
            <GlassCardDescription className="text-slate-500 font-medium">
              Fyll i värden från din bioimpedansvåg. Du behöver inte fylla i alla fält.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="p-6">
            <BioimpedanceForm
              clientId={clientId}
              clientName={client?.name}
              isGlass={true}
            />
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
