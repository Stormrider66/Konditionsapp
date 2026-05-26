'use client'

import { ChevronLeft, Zap, Lightbulb, Cog } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
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

export function AICostInfoClient({ businessSlug }: AICostInfoClientProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const settingsHref = businessSlug ? `/${businessSlug}/coach/settings` : '/login'

  // Reference models for cost comparisons
  const flashModel = AI_MODELS.find(m => m.id === 'gemini-3-flash')!
  const sonnetModel = AI_MODELS.find(m => m.id === 'claude-sonnet')!

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-200 pb-20 selection:bg-orange-500/30 transition-colors">
      {/* Header */}
      <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-16 z-20 transition-colors">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={settingsHref}>
            <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center border border-green-200 dark:border-green-500/20 transition-colors">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400 transition-colors" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-none transition-colors">
                {copy(locale, 'AI costs', 'AI-kostnader')}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 transition-colors">
                {copy(locale, 'Cost per athlete', 'Kostnad per atlet')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto p-4 space-y-6 relative z-10">

        {/* Model Overview */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">
              {copy(locale, 'Model overview', 'Modellöversikt')}
            </h3>
          </div>
          <GlassCard glow="blue">
            <GlassCardContent className="p-0 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold">{copy(locale, 'Model', 'Modell')}</TableHead>
                      <TableHead className="text-xs font-bold">{copy(locale, 'Speed', 'Hastighet')}</TableHead>
                      <TableHead className="text-xs font-bold text-right">Input $/1M</TableHead>
                      <TableHead className="text-xs font-bold text-right">Output $/1M</TableHead>
                      <TableHead className="text-xs font-bold text-right">Max output</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AI_MODELS.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{model.name}</span>
                            {model.recommended && (
                              <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 text-[10px] px-1.5">Rec</Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 capitalize">{model.provider}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={COST_TIER_COLORS[model.costTier] + ' text-[10px] px-1.5'}>
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
            </GlassCardContent>
          </GlassCard>
        </section>

        {/* Per-Feature Costs */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">
              {copy(locale, 'Cost per feature', 'Kostnad per funktion')}
            </h3>
          </div>
          <GlassCard glow="purple">
            <GlassCardContent className="p-0 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold">{copy(locale, 'Feature', 'Funktion')}</TableHead>
                      <TableHead className="text-xs font-bold text-right">Gemini Flash</TableHead>
                      <TableHead className="text-xs font-bold text-right">Claude Sonnet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AI_FEATURES.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{featureCopy(feature.id, 'name', locale, feature.name)}</span>
                            {feature.automatic && (
                              <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5">Auto</Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">{featureCopy(feature.id, 'description', locale, feature.description)}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                          {formatCostUSD(featureCostUSD(feature, flashModel))}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                          {formatCostUSD(featureCostUSD(feature, sonnetModel))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </GlassCardContent>
          </GlassCard>
        </section>

        {/* Monthly Cost Per Athlete */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-green-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">
              {copy(locale, 'Monthly cost per athlete', 'Månadskostnad per atlet')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
            {copy(
              locale,
              'Estimated cost with Gemini 3.5 Flash (recommended balanced model). Actual cost depends on the selected model.',
              'Uppskattad kostnad med Gemini 3.5 Flash (rekommenderad balanserad modell). Faktisk kostnad beror på modellval.'
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {USAGE_PROFILES.map((profile) => {
              const costFlash = monthlyCostUSD(profile, flashModel)
              const costSonnet = monthlyCostUSD(profile, sonnetModel)
              const glowColor = profile.id === 'light' ? 'blue' : profile.id === 'normal' ? 'purple' : 'amber'
              return (
                <GlassCard key={profile.id} glow={glowColor}>
                  <GlassCardContent className="p-4 pt-4 space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{profileCopy(profile.id, 'name', locale, profile.name)}</h4>
                      <p className="text-[10px] text-slate-500">{profileCopy(profile.id, 'description', locale, profile.description)}</p>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {AI_FEATURES.filter(f => (profile.usage[f.id] || 0) > 0).map(f => (
                        <div key={f.id} className="flex justify-between">
                          <span>{featureCopy(f.id, 'name', locale, f.name).split('(')[0].trim()}</span>
                          <span className="tabular-nums">{profile.usage[f.id]}×</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 dark:border-white/10 pt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Flash:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">{formatCostSEK(costFlash)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Sonnet:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{formatCostSEK(costSonnet)}</span>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              )
            })}
          </div>
        </section>

        {/* Automatic Costs */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">
              {copy(locale, 'Automatic costs', 'Automatiska kostnader')}
            </h3>
          </div>
          <GlassCard glow="amber">
            <GlassCardContent className="p-4 pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Cog className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    {copy(
                      locale,
                      'Some AI features run automatically without the athlete actively starting them:',
                      'Vissa AI-funktioner körs automatiskt utan att atleten aktivt startar dem:'
                    )}
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
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
                  <p className="text-xs text-slate-500">
                    {copy(
                      locale,
                      'These always run with the cheapest available model (for example Gemini Flash) to keep costs low.',
                      'Dessa körs alltid med den billigaste tillgängliga modellen (t.ex. Gemini Flash) för att minimera kostnad.'
                    )}
                  </p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </section>

        {/* Tips */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-cyan-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">
              {copy(locale, 'Cost optimization tips', 'Tips för kostnadsoptimering')}
            </h3>
          </div>
          <GlassCard glow="teal">
            <GlassCardContent className="p-4 pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-cyan-500 mt-0.5 shrink-0" />
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {copy(locale, 'Background tasks -> Flash Lite / GPT-5.3 Instant', 'Bakgrundsuppgifter -> Flash Lite / GPT-5.3 Instant')}
                    </p>
                    <p className="text-xs">
                      {copy(locale, 'Cheapest. Perfect for briefings, memory extraction, and nudges.', 'Billigast. Perfekt för briefings, minnesextraktion och nudges.')}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {copy(locale, 'Daily training -> Gemini Flash / Claude Haiku', 'Daglig träning -> Gemini Flash / Claude Haiku')}
                    </p>
                    <p className="text-xs">
                      {copy(locale, 'Fast and affordable. Good for WOD, chat, and simpler questions.', 'Snabb och prisvärd. Bra för WOD, chatt och enklare frågor.')}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {copy(locale, 'Longer programs -> Claude Opus / GPT-5.4', 'Längre program -> Claude Opus / GPT-5.4')}
                    </p>
                    <p className="text-xs">
                      {copy(locale, '128K output tokens. Can generate 16+ weeks of detailed programming in one response.', '128K output-tokens. Kan generera 16+ veckors detaljerat program i ett svar.')}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {copy(locale, 'Best quality -> Claude Sonnet / Gemini Pro', 'Bäst kvalitet -> Claude Sonnet / Gemini Pro')}
                    </p>
                    <p className="text-xs">
                      {copy(locale, 'Excellent reasoning at a reasonable cost. Good for nutrition planning and analysis.', 'Utmärkt resonering till rimlig kostnad. Bra för nutritionsplanering och analys.')}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {copy(locale, 'Multiple providers -> lower risk', 'Flera providers -> lägre risk')}
                    </p>
                    <p className="text-xs">
                      {copy(
                        locale,
                        'Configure 2-3 API keys. If one provider has an outage, another is used automatically.',
                        'Konfigurera 2-3 API-nycklar. Om en provider har driftstörning används automatiskt en annan.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </section>

      </div>
    </div>
  )
}
