'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function LandingHeader({ activeLink }: { activeLink?: string }) {
  const t = useTranslations('landing')

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Star by Thomson</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/#features"
            className={activeLink === 'features' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary transition-colors'}
          >
            {t('nav.features')}
          </Link>
          <Link
            href="/pricing"
            className={activeLink === 'pricing' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary transition-colors'}
          >
            {t('nav.pricing')}
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher showLabel={false} variant="ghost" />
          <Link href="/login">
            <Button variant="ghost" size="sm">{t('nav.login')}</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              {t('nav.startNow')}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
