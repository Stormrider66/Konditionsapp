// app/athlete/body-composition/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { BioimpedanceForm } from '@/components/forms/BioimpedanceForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Scale } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from '@/i18n/server'

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'

export default async function AthleteBodyCompositionPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  const t = await getTranslations('athletePages.bodyComposition')

  // Get client name for display
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-orange-500/30 dark:bg-[#050505] dark:text-slate-200">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-orange-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto py-8 px-4 max-w-2xl relative z-10">
        {/* Navigation */}
        <Link href="/athlete/profile?tab=body">
          <Button variant="ghost" size="sm" className="gap-2 mb-6 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-full px-4 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
            {t('backToProfile')}
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Scale className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-950 leading-none dark:text-white">
              {t('title')}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <GlassCard className="border-slate-200 bg-white/80 shadow-sm overflow-hidden ring-1 ring-slate-900/5 dark:border-white/5 dark:bg-black/40 dark:shadow-2xl dark:ring-white/10">
          <GlassCardHeader className="border-b border-slate-200 bg-slate-50 p-6 dark:border-white/5 dark:bg-white/[0.02]">
            <GlassCardTitle className="text-xl font-black italic tracking-tight text-slate-950 dark:text-white">{t('formTitle')}</GlassCardTitle>
            <GlassCardDescription className="text-slate-500 font-medium">
              {t('formDescription')}
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
