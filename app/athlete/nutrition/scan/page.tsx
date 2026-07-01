'use client'

import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Camera } from 'lucide-react'
import { FoodPhotoScanner } from '@/components/nutrition/FoodPhotoScanner'
import { Button } from '@/components/ui/button'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useTranslations } from '@/i18n/client'

export default function NutritionScanPage() {
  const t = useTranslations('components.nutritionScanPage')
  const basePath = useBasePath()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') === 'nutrition' ? 'nutrition' : 'dashboard'
  const backHref = returnTo === 'nutrition'
    ? `${basePath}/athlete/nutrition`
    : `${basePath}/athlete/dashboard`
  const backLabel = returnTo === 'nutrition'
    ? t('backToNutrition')
    : t('backToDashboard')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-cyan-500/30 dark:bg-[#050505] dark:text-slate-200">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto py-8 px-4 max-w-2xl relative z-10">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="gap-2 mb-6 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-full px-4 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Camera className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold italic uppercase tracking-tight text-slate-900 leading-none dark:text-white transition-colors">
              {t('title')}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_0_40px_rgba(15,23,42,0.45)]">
          <FoodPhotoScanner redirectPathOnSave={backHref} />
        </div>
      </div>
    </div>
  )
}
