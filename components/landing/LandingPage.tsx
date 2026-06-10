'use client'

import { User, Dumbbell, Building2, Trophy, FlaskConical, LineChart, Zap } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { CTASection } from '@/components/landing/CTASection'
import { SegmentCard } from '@/components/landing/SegmentCard'
import { HeroProductVisual } from '@/components/landing/HeroProductVisual'

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
                  <p className="text-3xl font-bold text-white">{t('hero.statSports')}</p>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">{t('hero.statSportsLabel')}</p>
                </div>
              </div>
            </div>

            <div className="mt-16 lg:mt-20">
              <HeroProductVisual />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('howItWorks.title')}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{t('howItWorks.subtitle')}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { icon: FlaskConical, step: '1', titleKey: 'howItWorks.step1Title', descKey: 'howItWorks.step1Description', gradient: 'from-blue-500 to-cyan-500' },
                { icon: LineChart, step: '2', titleKey: 'howItWorks.step2Title', descKey: 'howItWorks.step2Description', gradient: 'from-emerald-500 to-teal-500' },
                { icon: Zap, step: '3', titleKey: 'howItWorks.step3Title', descKey: 'howItWorks.step3Description', gradient: 'from-amber-500 to-orange-500' },
              ].map(({ icon: Icon, step, titleKey, descKey, gradient }) => (
                <div key={step} className="relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                  <span className="absolute top-6 right-6 text-5xl font-extrabold text-muted-foreground/10 select-none">
                    {step}
                  </span>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg mb-5`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t(titleKey)}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t(descKey)}</p>
                </div>
              ))}
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
          buttonHref="/signup"
          subText={t('cta.noCreditCard')}
        />
      </main>

      <LandingFooter />
    </div>
  )
}
