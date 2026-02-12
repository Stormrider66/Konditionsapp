'use client'

import Link from 'next/link'
import { Activity } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

export function LandingFooter() {
  const t = useTranslations('landing')

  return (
    <footer className="py-12 bg-background border-t">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">Star by Thomson</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
          <Link href="/for-athletes" className="hover:text-foreground transition-colors">
            {t('segments.athletes.title')}
          </Link>
          <Link href="/for-coaches" className="hover:text-foreground transition-colors">
            {t('segments.coaches.title')}
          </Link>
          <Link href="/for-gyms" className="hover:text-foreground transition-colors">
            {t('segments.gyms.title')}
          </Link>
          <Link href="/for-clubs" className="hover:text-foreground transition-colors">
            {t('segments.clubs.title')}
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            {t('nav.pricing')}
          </Link>
        </nav>
        <p className="text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Star by Thomson. {t('footer.copyright')}
        </p>
      </div>
    </footer>
  )
}
