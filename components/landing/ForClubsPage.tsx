'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  Trophy,
  ShieldAlert,
  Stethoscope,
  Calendar,
  Activity,
  X,
  ArrowRight,
} from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { FeatureShowcase } from '@/components/landing/FeatureShowcase'
import { BusinessInterestForm } from '@/components/landing/BusinessInterestForm'

export function ForClubsPage() {
  const t = useTranslations('landing')

  const features = [
    { icon: <ClipboardList className="w-6 h-6 text-blue-600" />, title: t('segments.clubs.features.batchTesting.title'), description: t('segments.clubs.features.batchTesting.description') },
    { icon: <Trophy className="w-6 h-6 text-amber-600" />, title: t('segments.clubs.features.leaderboards.title'), description: t('segments.clubs.features.leaderboards.description') },
    { icon: <ShieldAlert className="w-6 h-6 text-red-600" />, title: t('segments.clubs.features.acwr.title'), description: t('segments.clubs.features.acwr.description') },
    { icon: <Stethoscope className="w-6 h-6 text-emerald-600" />, title: t('segments.clubs.features.physio.title'), description: t('segments.clubs.features.physio.description') },
    { icon: <Calendar className="w-6 h-6 text-purple-600" />, title: t('segments.clubs.features.periodization.title'), description: t('segments.clubs.features.periodization.description') },
    { icon: <Activity className="w-6 h-6 text-indigo-600" />, title: t('segments.clubs.features.sports.title'), description: t('segments.clubs.features.sports.description') },
  ]

  const painPoints = [
    t('segments.clubs.painPoints.item0'),
    t('segments.clubs.painPoints.item1'),
    t('segments.clubs.painPoints.item2'),
    t('segments.clubs.painPoints.item3'),
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-slate-900 to-slate-900"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-300">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 mr-2"></span>
                {t('segments.clubs.hero.badge')}
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                {t('segments.clubs.hero.title')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  {t('segments.clubs.hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {t('segments.clubs.hero.description')}
              </p>
              <div className="pt-4">
                <a href="#interest-form">
                  <Button size="lg" className="h-14 text-lg bg-amber-600 hover:bg-amber-500 border-0 shadow-lg shadow-amber-900/20">
                    {t('segments.clubs.cta.button')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Pain Points */}
        <section className="py-20 bg-white dark:bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">
              {t('segments.clubs.painPoints.title')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {painPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700 dark:text-slate-300">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <FeatureShowcase
          title={t('segments.clubs.features.title')}
          description={t('segments.clubs.features.description')}
          features={features}
        />

        {/* Interest Form */}
        <section id="interest-form" className="py-20 bg-slate-900 text-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{t('segments.clubs.cta.title')}</h2>
            <p className="text-xl text-slate-300 text-center mb-10 max-w-2xl mx-auto">{t('segments.clubs.cta.description')}</p>
            <BusinessInterestForm type="CLUB" />
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
