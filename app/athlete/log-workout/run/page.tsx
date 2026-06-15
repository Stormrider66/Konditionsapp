'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'

import { OutdoorRunCapture } from '@/components/athlete/outdoor-run'
import { Button } from '@/components/ui/button'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useLocale } from '@/i18n/client'

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export default function OutdoorRunPage() {
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
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MapPin className="h-6 w-6" />
            {text(locale, 'Record run', 'Spela in lopning')}
          </h1>
          <p className="text-muted-foreground">
            {text(locale, 'Use Android GPS with optional Bluetooth heart rate.', 'Anvand Android-GPS med valfri Bluetooth-puls.')}
          </p>
        </div>
      </div>

      <OutdoorRunCapture />
    </div>
  )
}
