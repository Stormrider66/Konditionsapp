'use client'

/**
 * RecentTestsCard
 *
 * Surfaces the 5 most recent sport-specific test results on the
 * Analys tab. Acts as a discovery hook into the existing Tests tab
 * for things the strength PR table doesn't cover — VO2max, hockey
 * physical batteries, custom protocols (broad jump, sprint times,
 * mobility, etc.).
 *
 * Renders nothing when there are no tests at all so the Analys tab
 * stays clean for clients who haven't been tested yet.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TestTube, ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'

interface RecentTestEntry {
  id: string
  date: string
  kind: 'TEST' | 'HOCKEY_PHYSICAL' | 'CUSTOM'
  label: string
  summary: string | null
}

interface RecentTestsCardProps {
  clientId: string
  /** Path to the Tests tab, e.g. `/{slug}/coach/clients/{id}?tab=tests` */
  testsHref: string
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function RecentTestsCard({ clientId, testsHref }: RecentTestsCardProps) {
  const t = useTranslations('components.recentTestsCard')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [items, setItems] = useState<RecentTestEntry[]>([])
  const [counts, setCounts] = useState({ test: 0, hockey: 0, custom: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/clients/${clientId}/recent-tests`)
        if (!res.ok) return
        const body = await res.json()
        if (!cancelled && body.success) {
          setItems(body.data)
          setCounts(body.counts)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [clientId])

  // Stay invisible while loading and when there's nothing to show. The
  // Tests tab still owns the entry surface, so the card's only job is
  // to surface activity that exists.
  if (isLoading || items.length === 0) return null

  const totalTests = counts.test + counts.hockey + counts.custom
  const kindLabels: Record<RecentTestEntry['kind'], string> = {
    TEST: t('kinds.test'),
    HOCKEY_PHYSICAL: 'Hockey',
    CUSTOM: t('kinds.custom'),
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TestTube className="h-4 w-4 text-purple-500" />
              {t('title')}
              <Badge variant="secondary">{totalTests}</Badge>
            </CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </div>
          <a href={testsHref}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              {t('viewAll')}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {items.map((t) => (
            <div key={`${t.kind}-${t.id}`} className="flex items-center gap-3 py-2">
              <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                {kindLabels[t.kind]}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.label}</div>
                {t.summary && (
                  <div className="text-xs text-muted-foreground truncate">{t.summary}</div>
                )}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {formatDate(t.date, dateLocale)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
