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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('description')}
        </p>
      </div>

      {/* Default Model Selection - Most Important */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('defaultModel')}</h2>
        <DefaultModelSelector />
      </div>

      {/* Athlete Model Restrictions */}
      <div className="mb-8">
        <AthleteModelSettings />
      </div>

      {/* API Keys Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('apiKeys')}</h2>
        <ApiKeySettingsClient />
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200">{t('byok.title')}</h3>
        <p className="mt-2 text-sm text-blue-800 dark:text-blue-300">
          {t('byok.description')}
        </p>
        <div className="mt-4 space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <p><strong>Anthropic (Claude):</strong> {t('byok.anthropic')}</p>
          <p><strong>Google (Gemini):</strong> {t('byok.google')}</p>
          <p><strong>OpenAI:</strong> {t('byok.openai')}</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">{t('costs.title')}</h3>
        <div className="mt-2 text-sm text-amber-800 dark:text-amber-300">
          <ul className="space-y-1">
            <li>{t('costs.programGeneration')}</li>
            <li>{t('costs.documentEmbedding')}</li>
            <li>{t('costs.videoAnalysis')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
