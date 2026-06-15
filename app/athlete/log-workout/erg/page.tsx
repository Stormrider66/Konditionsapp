'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { QuickErgCapture } from '@/components/athlete/quick-erg'
import { Button } from '@/components/ui/button'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useLocale } from '@/i18n/client'

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export default function QuickErgSessionPage() {
  const basePath = useBasePath()
  const locale = useLocale()

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${basePath}/athlete/log-workout`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{text(locale, 'Record erg', 'Spela in erg')}</h1>
          <p className="text-muted-foreground">
            {text(locale, 'Free recording for rowing, skiing, cycling, and airbikes.', 'Fri inspelning for rodd, ski, cykel och airbike.')}
          </p>
        </div>
      </div>

      <QuickErgCapture />
    </div>
  )
}
