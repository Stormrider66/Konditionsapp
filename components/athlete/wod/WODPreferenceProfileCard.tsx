'use client'

import { useEffect, useState } from 'react'
import { Brain, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import type { WODPreferenceProfile } from '@/types/wod'
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

function text(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function WODPreferenceProfileCard() {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [profile, setProfile] = useState<WODPreferenceProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetch('/api/ai/wod/preferences')
      .then((response) => response.json())
      .then((data) => setProfile(data.profile ?? null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  const reset = async () => {
    setResetting(true)
    try {
      await fetch('/api/ai/wod/preferences', { method: 'DELETE' })
      setProfile(null)
    } finally {
      setResetting(false)
    }
  }

  return (
    <GlassCard>
      <GlassCardContent className="p-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
              <Brain className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">
                {text(locale, 'Daily workout learning', 'Inlärning för Dagens pass')}
              </h4>
            </div>
          </div>
          {profile && (
            <Badge variant="secondary" className="shrink-0">
              {Math.round(profile.confidence * 100)}%
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {text(locale, 'Loading learning profile...', 'Laddar inlärningsprofil...')}
          </div>
        ) : profile ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border bg-background/60 p-3 text-sm text-slate-700 dark:text-slate-200">
              {profile.promptSummary || text(locale, 'Learning profile is active.', 'Inlärningsprofilen är aktiv.')}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{text(locale, `${profile.sampleSize} signals`, `${profile.sampleSize} signaler`)}</Badge>
              {profile.preferredDuration && (
                <Badge variant="outline">{profile.preferredDuration} min</Badge>
              )}
              {profile.preferredFormats.slice(0, 2).map((format) => (
                <Badge key={format} variant="outline">{format}</Badge>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {text(locale, 'Reset learning', 'Nollställ inlärning')}
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {text(locale, 'No learning profile yet.', 'Ingen inlärningsprofil än.')}
          </p>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
