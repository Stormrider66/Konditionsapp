import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { NutritionWrappedPage } from '@/components/nutrition/wrapped/NutritionWrappedPage'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Kostsammanfattning | Kost',
  description: 'Din månads- och årssammanfattning av kost',
}

export default async function LegacyNutritionWrappedPage() {
  await requireAthleteOrCoachInAthleteMode()

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 pb-20 selection:bg-cyan-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto py-8 px-4 max-w-4xl relative z-10">
        <Link href="/athlete/nutrition">
          <Button variant="ghost" size="sm" className="gap-2 mb-6 text-slate-400 hover:text-white hover:bg-white/5 rounded-full px-4">
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till koststatistik
          </Button>
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Sparkles className="h-7 w-7 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tight text-white leading-none">
              Kostsammanfattning
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
              Din wrapped — månads & årsöversikt
            </p>
          </div>
        </div>

        <NutritionWrappedPage />
      </div>
    </div>
  )
}
