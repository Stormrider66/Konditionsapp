'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Activity,
  Check,
  ChevronRight,
  HelpCircle,
  Shield,
  Zap,
  Users,
  Building2,
  Crown,
} from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function PricingPage() {
  const t = useTranslations('pricing')
  const tLanding = useTranslations('landing')
  const [isYearly, setIsYearly] = useState(true)

  const plans = [
    {
      id: 'starter',
      icon: <Zap className="w-6 h-6" />,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
      features: ['lactateTests', 'trainingZones', 'basicPrograms', 'emailSupport'],
    },
    {
      id: 'professional',
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-200',
      popular: true,
      features: ['allStarter', 'advancedPrograms', 'aiStudio', 'videoAnalysis', 'athletePortal', 'prioritySupport'],
    },
    {
      id: 'business',
      icon: <Building2 className="w-6 h-6" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: 'border-purple-200',
      features: ['allProfessional', 'multipleCoaches', 'teamManagement', 'customBranding', 'apiAccess', 'dedicatedSupport'],
    },
    {
      id: 'enterprise',
      icon: <Crown className="w-6 h-6" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      borderColor: 'border-amber-200',
      features: ['allBusiness', 'unlimitedAthletes', 'sso', 'customIntegrations', 'sla', 'dedicatedManager'],
    },
  ]

  const faqs = ['trial', 'changePlan', 'payment', 'cancelAnytime']

  const getPrice = (planId: string) => {
    if (planId === 'starter') return t('free')
    if (planId === 'enterprise') return t('customPricing')

    const priceKey = isYearly ? 'priceYearly' : 'priceMonthly'
    return t(`${planId}.${priceKey}`)
  }

  const getPriceSuffix = (planId: string) => {
    if (planId === 'starter' || planId === 'enterprise') return ''
    return t('perMonth')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Star by Thomson</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/#features" className="text-muted-foreground hover:text-primary transition-colors">{tLanding('nav.features')}</Link>
            <Link href="/#science" className="text-muted-foreground hover:text-primary transition-colors">{tLanding('nav.science')}</Link>
            <Link href="/pricing" className="text-primary font-semibold">{tLanding('nav.pricing')}</Link>
          </nav>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher showLabel={false} variant="ghost" />
            <Link href="/login">
              <Button variant="ghost" size="sm">{tLanding('nav.login')}</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                {tLanding('nav.startNow')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              {t('title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {t('subtitle')}
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('monthly')}
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t('yearly')}
              </span>
              {isYearly && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  -17%
                </Badge>
              )}
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-8 -mt-8">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col ${plan.popular ? 'border-blue-500 border-2 shadow-lg scale-[1.02]' : 'border'}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-600 hover:bg-blue-600 text-white">
                        {t('mostPopular')}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <div className={`w-12 h-12 rounded-xl ${plan.bgColor} flex items-center justify-center mx-auto mb-4 ${plan.color}`}>
                      {plan.icon}
                    </div>
                    <CardTitle className="text-xl">{t(`${plan.id}.name`)}</CardTitle>
                    <CardDescription>{t(`${plan.id}.description`)}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {/* Price */}
                    <div className="text-center mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        {plan.id !== 'enterprise' && plan.id !== 'starter' && (
                          <span className="text-lg text-muted-foreground">kr</span>
                        )}
                        <span className="text-4xl font-bold">{getPrice(plan.id)}</span>
                        <span className="text-muted-foreground">{getPriceSuffix(plan.id)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(`${plan.id}.athletes`)}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{t(`${plan.id}.features.${feature}`)}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Link href={plan.id === 'enterprise' ? '/contact' : '/register'} className="block">
                      <Button
                        className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                      >
                        {plan.id === 'enterprise' ? t('contactSales') : t('getStarted')}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Common Features */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">{t('allPlansInclude')}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">{t('commonFeatures.secureData')}</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">{t('commonFeatures.gdprCompliant')}</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                <Zap className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">{t('commonFeatures.regularUpdates')}</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">{t('commonFeatures.mobileApp')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-4">{t('faq.title')}</h2>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faqId, index) => (
                  <AccordionItem key={faqId} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {t(`faq.${faqId}.question`)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {t(`faq.${faqId}.answer`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{tLanding('cta.title')}</h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              {tLanding('cta.description')}
            </p>
            <Link href="/register">
              <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-900 hover:bg-slate-100">
                {tLanding('cta.button')}
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="mt-6 text-sm text-slate-400">
              {tLanding('cta.noCreditCard')}
            </p>
          </div>
        </section>
      </main>

      <footer className="py-12 bg-background border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Star by Thomson</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Star by Thomson. {tLanding('footer.copyright')}</p>
        </div>
      </footer>
    </div>
  )
}
