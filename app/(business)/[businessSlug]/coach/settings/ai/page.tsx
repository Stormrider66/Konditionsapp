// app/(business)/[businessSlug]/coach/settings/ai/page.tsx
/**
 * Business-scoped AI Settings Page
 *
 * Allows coaches to configure their own API keys for AI features.
 * BYOK (Bring Your Own Key) model for cost transparency.
 */

import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { ApiKeySettingsClient } from '@/components/coach/settings/ai/ApiKeySettingsClient'
import { DefaultModelSelector } from '@/components/coach/settings/ai/DefaultModelSelector'
import { AthleteModelSettings } from '@/components/coach/settings/AthleteModelSettings'
import { getTranslations } from '@/i18n/server'

import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessAISettingsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.aiSettings')

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-none">{t('title')}</h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('description')}
        </p>
      </div>

      {/* Default Model Selection - Most Important */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">{t('defaultModel')}</h2>
        <DefaultModelSelector />
      </div>

      {/* Athlete Model Restrictions */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Restriktioner för atleter</h2>
        <AthleteModelSettings />
      </div>

      {/* API Keys Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">{t('apiKeys')}</h2>
        <ApiKeySettingsClient />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard glow="blue">
          <GlassCardContent className="p-5 space-y-3">
            <h3 className="font-black italic uppercase tracking-tight text-sm text-blue-900 dark:text-blue-200">{t('byok.title')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('byok.description')}
            </p>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <p><strong>Anthropic (Claude):</strong> {t('byok.anthropic')}</p>
              <p><strong>Google (Gemini):</strong> {t('byok.google')}</p>
              <p><strong>OpenAI:</strong> {t('byok.openai')}</p>
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard glow="amber">
          <GlassCardContent className="p-5 space-y-3">
            <h3 className="font-black italic uppercase tracking-tight text-sm text-amber-900 dark:text-amber-200">{t('costs.title')}</h3>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <ul className="space-y-1.5">
                <li>• {t('costs.programGeneration')}</li>
                <li>• {t('costs.documentEmbedding')}</li>
                <li>• {t('costs.videoAnalysis')}</li>
              </ul>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
