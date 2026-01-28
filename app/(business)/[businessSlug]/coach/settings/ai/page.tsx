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
import { ApiKeySettingsClient } from '@/app/coach/settings/ai/ApiKeySettingsClient'
import { DefaultModelSelector } from '@/app/coach/settings/ai/DefaultModelSelector'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessAISettingsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI-inställningar</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Konfigurera AI-modeller och API-nycklar för AI-funktionerna.
        </p>
      </div>

      {/* Default Model Selection - Most Important */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Standardmodell</h2>
        <DefaultModelSelector />
      </div>

      {/* API Keys Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">API-nycklar</h2>
        <ApiKeySettingsClient />
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200">Om BYOK (Bring Your Own Key)</h3>
        <p className="mt-2 text-sm text-blue-800 dark:text-blue-300">
          AI Studio använder en BYOK-modell där du tillhandahåller dina egna API-nycklar.
          Detta ger dig full kontroll över kostnader och användning. Dina nycklar lagras
          krypterade och används endast för dina förfrågningar.
        </p>
        <div className="mt-4 space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <p><strong>Anthropic (Claude):</strong> Bäst för komplexa träningsprogram och resonemang</p>
          <p><strong>Google (Gemini):</strong> Bäst för videoanalys och multimodal input</p>
          <p><strong>OpenAI:</strong> Används för embeddings och dokumentsökning</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">Uppskattade kostnader</h3>
        <div className="mt-2 text-sm text-amber-800 dark:text-amber-300">
          <ul className="space-y-1">
            <li>Programgenerering (Claude): ~$0.15-0.30 per program</li>
            <li>Dokumentembedding (OpenAI): ~$0.0001 per sida</li>
            <li>Videoanalys (Gemini): ~$0.20 per video</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
