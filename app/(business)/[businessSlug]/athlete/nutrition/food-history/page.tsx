import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { FoodHistoryPage } from '@/components/nutrition/FoodHistoryPage'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Apple } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Mathistorik | Kost',
  description: 'Se vad du har ätit och dina trender',
}

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessFoodHistoryPage({ params }: Props) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 pb-20 selection:bg-cyan-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto py-8 px-4 max-w-4xl relative z-10">
        <Link href={`${basePath}/athlete/nutrition`}>
          <Button variant="ghost" size="sm" className="gap-2 mb-6 text-slate-400 hover:text-white hover:bg-white/5 rounded-full px-4">
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till koststatistik
          </Button>
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Apple className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tight text-white leading-none">
              Mathistorik
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
              Dina livsmedel & näringskällor
            </p>
          </div>
        </div>

        <FoodHistoryPage />
      </div>
    </div>
  )
}
