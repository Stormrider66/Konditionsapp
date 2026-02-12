'use client'

import { User, Dumbbell, Building2, Trophy } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { CTASection } from '@/components/landing/CTASection'
import { SegmentCard } from '@/components/landing/SegmentCard'

export function LandingPage() {
  const t = useTranslations('landing')

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-slate-900 to-slate-900"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                {t('segments.hub.badge')}
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                {t('segments.hub.title')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  {t('segments.hub.titleHighlight')}
                </span>
              </h1>

              <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                {t('segments.hub.description')}
              </p>

              <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center border-t border-slate-800/50 mt-12">
                <div>
                  <p className="text-3xl font-bold text-white">{t('hero.statVo2max')}</p>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">{t('hero.statVo2maxLabel')}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{t('hero.statZones')}</p>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">{t('hero.statZonesLabel')}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{t('hero.statCustom')}</p>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">{t('hero.statCustomLabel')}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">17</p>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">Sports</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Segment Cards */}
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <SegmentCard
                icon={<User className="w-6 h-6" />}
                title={t('segments.athletes.title')}
                description={t('segments.athletes.hubDescription')}
                href="/for-athletes"
                gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                learnMore={t('segments.learnMore')}
              />
              <SegmentCard
                icon={<Dumbbell className="w-6 h-6" />}
                title={t('segments.coaches.title')}
                description={t('segments.coaches.hubDescription')}
                href="/for-coaches"
                gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                learnMore={t('segments.learnMore')}
              />
              <SegmentCard
                icon={<Building2 className="w-6 h-6" />}
                title={t('segments.gyms.title')}
                description={t('segments.gyms.hubDescription')}
                href="/for-gyms"
                gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                learnMore={t('segments.learnMore')}
              />
              <SegmentCard
                icon={<Trophy className="w-6 h-6" />}
                title={t('segments.clubs.title')}
                description={t('segments.clubs.hubDescription')}
                href="/for-clubs"
                gradient="bg-gradient-to-br from-amber-500 to-amber-600"
                learnMore={t('segments.learnMore')}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <CTASection
          title={t('cta.title')}
          description={t('cta.description')}
          buttonText={t('cta.button')}
          buttonHref="/register"
          subText={t('cta.noCreditCard')}
        />
      </main>

      <LandingFooter />
    </div>
  )
}
