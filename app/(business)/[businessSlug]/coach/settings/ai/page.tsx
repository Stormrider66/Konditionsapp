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
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
    <RolePageFrame contentClassName="max-w-4xl">
      <RolePageHeader
        eyebrow="Settings"
        title={t('title')}
        description={t('description')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/${businessSlug}/coach/settings`}>
              <ArrowLeft className="h-4 w-4" />
              Settings
            </Link>
          </Button>
        }
      />

      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{t('defaultModel')}</h2>
          <DefaultModelSelector />
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{t('athleteRestrictions')}</h2>
          <AthleteModelSettings />
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{t('apiKeys')}</h2>
          <ApiKeySettingsClient />
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <RolePanel className="p-5">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('byok.title')}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {t('byok.description')}
            </p>
            <div className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <p><strong>Anthropic (Claude):</strong> {t('byok.anthropic')}</p>
              <p><strong>Google (Gemini):</strong> {t('byok.google')}</p>
              <p><strong>OpenAI:</strong> {t('byok.openai')}</p>
            </div>
          </RolePanel>

          <RolePanel className="p-5">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('costs.title')}</h3>
            <div className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              <ul className="list-disc space-y-1 pl-4">
                <li>{t('costs.programGeneration')}</li>
                <li>{t('costs.documentEmbedding')}</li>
                <li>{t('costs.videoAnalysis')}</li>
              </ul>
            </div>
          </RolePanel>
        </div>
      </div>
    </RolePageFrame>
  )
}
