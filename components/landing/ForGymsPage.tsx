'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Users,
  Building2,
  Palette,
  Code,
  Database,
  DollarSign,
  X,
  ArrowRight,
} from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { FeatureShowcase } from '@/components/landing/FeatureShowcase'
import { BusinessInterestForm } from '@/components/landing/BusinessInterestForm'

export function ForGymsPage() {
  const t = useTranslations('landing')

  const features = [
    { icon: <Users className="w-6 h-6 text-blue-600" />, title: t('segments.gyms.features.teamManagement.title'), description: t('segments.gyms.features.teamManagement.description') },
    { icon: <Building2 className="w-6 h-6 text-purple-600" />, title: t('segments.gyms.features.multiCoach.title'), description: t('segments.gyms.features.multiCoach.description') },
    { icon: <Palette className="w-6 h-6 text-pink-600" />, title: t('segments.gyms.features.branding.title'), description: t('segments.gyms.features.branding.description') },
    { icon: <Code className="w-6 h-6 text-emerald-600" />, title: t('segments.gyms.features.api.title'), description: t('segments.gyms.features.api.description') },
    { icon: <Database className="w-6 h-6 text-amber-600" />, title: t('segments.gyms.features.dataContinuity.title'), description: t('segments.gyms.features.dataContinuity.description') },
    { icon: <DollarSign className="w-6 h-6 text-green-600" />, title: t('segments.gyms.features.revenue.title'), description: t('segments.gyms.features.revenue.description') },
  ]

  const painPoints = [
    t('segments.gyms.painPoints.item0'),
    t('segments.gyms.painPoints.item1'),
    t('segments.gyms.painPoints.item2'),
    t('segments.gyms.painPoints.item3'),
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500 via-slate-900 to-slate-900"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300">
                <span className="flex h-2 w-2 rounded-full bg-purple-500 mr-2"></span>
                {t('segments.gyms.hero.badge')}
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                {t('segments.gyms.hero.title')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {t('segments.gyms.hero.titleHighlight')}
                </span>
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {t('segments.gyms.hero.description')}
              </p>
              <div className="pt-4">
                <a href="#interest-form">
                  <Button size="lg" className="h-14 text-lg bg-purple-600 hover:bg-purple-500 border-0 shadow-lg shadow-purple-900/20">
                    {t('segments.gyms.cta.button')}
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
              {t('segments.gyms.painPoints.title')}
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
          title={t('segments.gyms.features.title')}
          description={t('segments.gyms.features.description')}
          features={features}
        />

        {/* Interest Form */}
        <section id="interest-form" className="py-20 bg-slate-900 text-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{t('segments.gyms.cta.title')}</h2>
            <p className="text-xl text-slate-300 text-center mb-10 max-w-2xl mx-auto">{t('segments.gyms.cta.description')}</p>
            <BusinessInterestForm type="GYM" />
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
