'use client'

import type { ReactNode } from 'react'
import { ArrowLeft, Zap, Lightbulb, Cog } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { useLocale } from '@/i18n/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AI_MODELS, formatTokenCount, COST_TIER_COLORS } from '@/types/ai-models'
import {
  AI_FEATURES,
  USAGE_PROFILES,
  featureCostUSD,
  monthlyCostUSD,
  formatCostUSD,
  formatCostSEK,
} from '@/lib/ai/cost-data'

interface AICostInfoClientProps {
  businessSlug?: string
}

type AppLocale = 'en' | 'sv'

type LocalizedLabel = Record<AppLocale, string>

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

const FEATURE_COPY: Record<string, { name: LocalizedLabel; description: LocalizedLabel }> = {
  chat: {
    name: { en: 'AI chat (one message)', sv: 'AI-chatt (ett meddelande)' },
    description: { en: 'Questions about training, nutrition, and recovery', sv: 'Frågor om träning, kost, återhämtning' },
  },
  wod: {
    name: { en: 'Daily workout (WOD)', sv: 'Dagens pass (WOD)' },
    description: { en: 'Generate a daily training session', sv: 'Generera ett dagligt träningspass' },
  },
  program: {
    name: { en: 'Program generation', sv: 'Programgenerering' },
    description: { en: 'Complete training program (4-16 weeks)', sv: 'Komplett träningsprogram (4-16 veckor)' },
  },
  nutrition: {
    name: { en: 'Nutrition planning', sv: 'Nutritionsplanering' },
    description: { en: 'Nutrition plan based on training and goals', sv: 'Kostplan baserad på träning och mål' },
  },
  briefing: {
    name: { en: 'Morning briefing', sv: 'Morgonbriefing' },
    description: { en: 'Daily summary with readiness and tips', sv: 'Daglig sammanfattning med readiness och tips' },
  },
  memory: {
    name: { en: 'Memory extraction', sv: 'Minnesextraktion' },
    description: { en: 'Extracts key info from conversations', sv: 'Extraherar nyckelinfo från konversationer' },
  },
  analysis: {
    name: { en: 'Performance analysis', sv: 'Prestationsanalys' },
    description: { en: 'Trend analysis of training data', sv: 'Trendanalys av träningsdata' },
  },
  video: {
    name: { en: 'Video analysis', sv: 'Videoanalys' },
    description: { en: 'Running technique, skiing technique, HYROX analysis', sv: 'Löpteknik, skidteknik, HYROX-analys' },
  },
}

const PROFILE_COPY: Record<string, { name: LocalizedLabel; description: LocalizedLabel }> = {
  light: {
    name: { en: 'Light user', sv: 'Lätt användare' },
    description: { en: 'Basic AI usage', sv: 'Grundläggande AI-användning' },
  },
  normal: {
    name: { en: 'Normal user', sv: 'Normal användare' },
    description: { en: 'Regular AI usage', sv: 'Regelbunden AI-användning' },
  },
  heavy: {
    name: { en: 'Active user', sv: 'Aktiv användare' },
    description: { en: 'Intensive AI usage', sv: 'Intensiv AI-användning' },
  },
}

function featureCopy(id: string, field: 'name' | 'description', locale: AppLocale, fallback: string) {
  return FEATURE_COPY[id]?.[field][locale] ?? fallback
}

function profileCopy(id: string, field: 'name' | 'description', locale: AppLocale, fallback: string) {
  return PROFILE_COPY[id]?.[field][locale] ?? fallback
}

function SectionHeading({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      {description && (
        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
    </div>
  )
}

export function AICostInfoClient({ businessSlug }: AICostInfoClientProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const settingsHref = businessSlug ? `/${businessSlug}/coach/settings` : '/login'

  const flashModel = AI_MODELS.find(m => m.id === 'gemini-3-flash')!
  const sonnetModel = AI_MODELS.find(m => m.id === 'claude-sonnet')!

  return (
    <RolePageFrame contentClassName="max-w-5xl">
      <RolePageHeader
        eyebrow={copy(locale, 'Cost per athlete', 'Kostnad per atlet')}
        title={
          <span className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
            {copy(locale, 'AI costs', 'AI-kostnader')}
          </span>
        }
        description={copy(locale, 'Compare AI model pricing, common feature costs, and monthly per-athlete estimates.', 'Jämför AI-modellpriser, vanliga funktionskostnader och uppskattad månadskostnad per atlet.')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={settingsHref}>
              <ArrowLeft className="h-4 w-4" />
              {copy(locale, 'Settings', 'Inställningar')}
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <section className="space-y-3">
          <SectionHeading title={copy(locale, 'Model overview', 'Modellöversikt')} />
          <RolePanel className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold">{copy(locale, 'Model', 'Modell')}</TableHead>
                    <TableHead className="text-xs font-bold">{copy(locale, 'Speed', 'Hastighet')}</TableHead>
                    <TableHead className="text-right text-xs font-bold">Input $/1M</TableHead>
                    <TableHead className="text-right text-xs font-bold">Output $/1M</TableHead>
                    <TableHead className="text-right text-xs font-bold">Max output</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AI_MODELS.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{model.name}</span>
                          {model.recommended && (
                            <Badge className="border-emerald-200 bg-emerald-50 px-1.5 text-[10px] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                              Rec
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] capitalize text-zinc-500 dark:text-zinc-400">{model.provider}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={COST_TIER_COLORS[model.costTier] + ' px-1.5 text-[10px]'}>
                          {model.capabilities.speed === 'fast'
                            ? copy(locale, 'Fast', 'Snabb')
                            : model.capabilities.speed === 'medium'
                              ? copy(locale, 'Medium', 'Medel')
                              : copy(locale, 'Slow', 'Långsam')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">${model.pricing.input.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">${model.pricing.output.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatTokenCount(model.capabilities.maxOutputTokens)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </RolePanel>
        </section>

        <section className="space-y-3">
          <SectionHeading title={copy(locale, 'Cost per feature', 'Kostnad per funktion')} />
          <RolePanel className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold">{copy(locale, 'Feature', 'Funktion')}</TableHead>
                    <TableHead className="text-right text-xs font-bold">Gemini Flash</TableHead>
                    <TableHead className="text-right text-xs font-bold">Claude Sonnet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AI_FEATURES.map((feature) => (
                    <TableRow key={feature.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{featureCopy(feature.id, 'name', locale, feature.name)}</span>
                          {feature.automatic && (
                            <Badge className="border-amber-200 bg-amber-50 px-1.5 text-[10px] text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                              Auto
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{featureCopy(feature.id, 'description', locale, feature.description)}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                        {formatCostUSD(featureCostUSD(feature, flashModel))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                        {formatCostUSD(featureCostUSD(feature, sonnetModel))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </RolePanel>
        </section>

        <section className="space-y-3">
          <SectionHeading
            title={copy(locale, 'Monthly cost per athlete', 'Månadskostnad per atlet')}
            description={copy(
              locale,
              'Estimated cost with Gemini 3.5 Flash (recommended balanced model). Actual cost depends on the selected model.',
              'Uppskattad kostnad med Gemini 3.5 Flash (rekommenderad balanserad modell). Faktisk kostnad beror på modellval.'
            )}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {USAGE_PROFILES.map((profile) => {
              const costFlash = monthlyCostUSD(profile, flashModel)
              const costSonnet = monthlyCostUSD(profile, sonnetModel)
              return (
                <RolePanel key={profile.id} className="p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{profileCopy(profile.id, 'name', locale, profile.name)}</h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{profileCopy(profile.id, 'description', locale, profile.description)}</p>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {AI_FEATURES.filter(f => (profile.usage[f.id] || 0) > 0).map(f => (
                      <div key={f.id} className="flex justify-between gap-3">
                        <span>{featureCopy(f.id, 'name', locale, f.name).split('(')[0].trim()}</span>
                        <span className="tabular-nums">{profile.usage[f.id]}x</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-zinc-200 pt-3 dark:border-white/10">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Flash</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-300">{formatCostSEK(costFlash)}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Sonnet</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-300">{formatCostSEK(costSonnet)}</span>
                    </div>
                  </div>
                </RolePanel>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <RolePanel className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <Cog className="h-5 w-5" />
              </div>
              <div className="space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Automatic costs', 'Automatiska kostnader')}</h2>
                <p>
                  {copy(
                    locale,
                    'Some AI features run automatically without the athlete actively starting them:',
                    'Vissa AI-funktioner körs automatiskt utan att atleten aktivt startar dem:'
                  )}
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    <strong>{copy(locale, 'Morning briefing', 'Morgonbriefing')}</strong>
                    {' - '}
                    {copy(locale, 'Generated every morning for athletes with the feature enabled', 'Genereras varje morgon för atleter med funktionen aktiverad')}
                  </li>
                  <li>
                    <strong>{copy(locale, 'Memory extraction', 'Minnesextraktion')}</strong>
                    {' - '}
                    {copy(locale, 'Extracts key information after AI conversations', 'Extraherar nyckelinfo efter AI-konversationer')}
                  </li>
                </ul>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {copy(
                    locale,
                    'These always run with the cheapest available model (for example Gemini Flash) to keep costs low.',
                    'Dessa körs alltid med den billigaste tillgängliga modellen (t.ex. Gemini Flash) för att minimera kostnad.'
                  )}
                </p>
              </div>
            </div>
          </RolePanel>

          <RolePanel className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-300">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Cost optimization tips', 'Tips för kostnadsoptimering')}</h2>
                {[
                  [
                    copy(locale, 'Background tasks -> Flash Lite / GPT-5.3 Instant', 'Bakgrundsuppgifter -> Flash Lite / GPT-5.3 Instant'),
                    copy(locale, 'Cheapest. Perfect for briefings, memory extraction, and nudges.', 'Billigast. Perfekt för briefings, minnesextraktion och nudges.'),
                  ],
                  [
                    copy(locale, 'Daily training -> Gemini Flash / Claude Haiku', 'Daglig träning -> Gemini Flash / Claude Haiku'),
                    copy(locale, 'Fast and affordable. Good for WOD, chat, and simpler questions.', 'Snabb och prisvärd. Bra för WOD, chatt och enklare frågor.'),
                  ],
                  [
                    copy(locale, 'Longer programs -> Claude Opus / GPT-5.4', 'Längre program -> Claude Opus / GPT-5.4'),
                    copy(locale, '128K output tokens. Can generate 16+ weeks of detailed programming in one response.', '128K output-tokens. Kan generera 16+ veckors detaljerat program i ett svar.'),
                  ],
                  [
                    copy(locale, 'Best quality -> Claude Sonnet / Gemini Pro', 'Bäst kvalitet -> Claude Sonnet / Gemini Pro'),
                    copy(locale, 'Excellent reasoning at a reasonable cost. Good for nutrition planning and analysis.', 'Utmärkt resonering till rimlig kostnad. Bra för nutritionsplanering och analys.'),
                  ],
                  [
                    copy(locale, 'Multiple providers -> lower risk', 'Flera providers -> lägre risk'),
                    copy(
                      locale,
                      'Configure 2-3 API keys. If one provider has an outage, another is used automatically.',
                      'Konfigurera 2-3 API-nycklar. Om en provider har driftstörning används automatiskt en annan.'
                    ),
                  ],
                ].map(([title, description]) => (
                  <div key={title}>
                    <p className="font-semibold text-zinc-950 dark:text-zinc-50">{title}</p>
                    <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </RolePanel>
        </section>
      </div>
    </RolePageFrame>
  )
}
