'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Calendar,
  FileText,
  BarChart3,
  Activity,
  Users,
  X,
  ArrowRight,
} from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { CTASection } from '@/components/landing/CTASection'
import { FeatureShowcase } from '@/components/landing/FeatureShowcase'

export function ForCoachesPage() {
  const t = useTranslations('landing')

  const features = [
    { icon: <Sparkles className="w-6 h-6 text-blue-600" />, title: t('segments.coaches.features.aiStudio.title'), description: t('segments.coaches.features.aiStudio.description') },
    { icon: <Calendar className="w-6 h-6 text-emerald-600" />, title: t('segments.coaches.features.programBuilder.title'), description: t('segments.coaches.features.programBuilder.description') },
    { icon: <FileText className="w-6 h-6 text-amber-600" />, title: t('segments.coaches.features.testReports.title'), description: t('segments.coaches.features.testReports.description') },
    { icon: <BarChart3 className="w-6 h-6 text-purple-600" />, title: t('segments.coaches.features.monitoring.title'), description: t('segments.coaches.features.monitoring.description') },
    { icon: <Activity className="w-6 h-6 text-red-600" />, title: t('segments.coaches.features.multiSport.title'), description: t('segments.coaches.features.multiSport.description') },
    { icon: <Users className="w-6 h-6 text-indigo-600" />, title: t('segments.coaches.features.portal.title'), description: t('segments.coaches.features.portal.description') },
  ]

  const painPoints = [
    t('segments.coaches.painPoints.item0'),
    t('segments.coaches.painPoints.item1'),
    t('segments.coaches.painPoints.item2'),
    t('segments.coaches.painPoints.item3'),
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-slate-900 to-slate-900"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
                {t('segments.coaches.hero.badge')}
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                {t('segments.coaches.hero.title')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
                  {t('segments.coaches.hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {t('segments.coaches.hero.description')}
              </p>
              <div className="pt-4">
                <Link href="/register">
                  <Button size="lg" className="h-14 text-lg bg-emerald-600 hover:bg-emerald-500 border-0 shadow-lg shadow-emerald-900/20">
                    {t('segments.coaches.cta.button')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pain Points */}
        <section className="py-20 bg-white dark:bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">
              {t('segments.coaches.painPoints.title')}
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
          title={t('segments.coaches.features.title')}
          description={t('segments.coaches.features.description')}
          features={features}
        />

        {/* CTA */}
        <CTASection
          title={t('segments.coaches.cta.title')}
          description={t('segments.coaches.cta.description')}
          buttonText={t('segments.coaches.cta.button')}
          buttonHref="/register"
          subText={t('segments.coaches.cta.subText')}
        />
      </main>

      <LandingFooter />
    </div>
  )
}
