'use client'

import { ChevronLeft, Zap, Bot, Lightbulb, Cog } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AI_MODELS, formatTokenCount, COST_TIER_LABELS, COST_TIER_COLORS } from '@/types/ai-models'
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

export function AICostInfoClient({ businessSlug }: AICostInfoClientProps) {
  const basePath = businessSlug ? `/${businessSlug}/coach` : '/coach'

  // Reference models for cost comparisons
  const flashModel = AI_MODELS.find(m => m.id === 'gemini-3-flash')!
  const sonnetModel = AI_MODELS.find(m => m.id === 'claude-sonnet')!

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-200 pb-20 selection:bg-orange-500/30 transition-colors">
      {/* Header */}
      <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-16 z-20 transition-colors">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`${basePath}/settings`}>
            <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center border border-green-200 dark:border-green-500/20 transition-colors">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400 transition-colors" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-none transition-colors">AI-kostnader</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 transition-colors">Kostnad per atlet</p>
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
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Modellöversikt</h3>
          </div>
          <GlassCard>
            <GlassCardContent className="p-0 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold">Modell</TableHead>
                      <TableHead className="text-xs font-bold">Hastighet</TableHead>
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
                            {model.capabilities.speed === 'fast' ? 'Snabb' : model.capabilities.speed === 'medium' ? 'Medel' : 'Långsam'}
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
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Kostnad per funktion</h3>
          </div>
          <GlassCard>
            <GlassCardContent className="p-0 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-bold">Funktion</TableHead>
                      <TableHead className="text-xs font-bold text-right">Gemini Flash</TableHead>
                      <TableHead className="text-xs font-bold text-right">Claude Sonnet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AI_FEATURES.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{feature.name}</span>
                            {feature.automatic && (
                              <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5">Auto</Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">{feature.description}</span>
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
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Månadskostnad per atlet</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
            Uppskattad kostnad med Gemini 3 Flash (billigaste modellen). Faktisk kostnad beror på modellval.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {USAGE_PROFILES.map((profile) => {
              const costFlash = monthlyCostUSD(profile, flashModel)
              const costSonnet = monthlyCostUSD(profile, sonnetModel)
              return (
                <GlassCard key={profile.id}>
                  <GlassCardContent className="p-4 pt-4 space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{profile.name}</h4>
                      <p className="text-[10px] text-slate-500">{profile.description}</p>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {AI_FEATURES.filter(f => (profile.usage[f.id] || 0) > 0).map(f => (
                        <div key={f.id} className="flex justify-between">
                          <span>{f.name.split('(')[0].trim()}</span>
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
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Automatiska kostnader</h3>
          </div>
          <GlassCard>
            <GlassCardContent className="p-4 pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Cog className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    Vissa AI-funktioner körs automatiskt utan att atleten aktivt startar dem:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Morgonbriefing</strong> — Genereras varje morgon för atleter med funktionen aktiverad</li>
                    <li><strong>Minnesextraktion</strong> — Extraherar nyckelinfo efter AI-konversationer</li>
                  </ul>
                  <p className="text-xs text-slate-500">
                    Dessa körs alltid med den billigaste tillgängliga modellen (t.ex. Gemini Flash) för att minimera kostnad.
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
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Tips för kostnadsoptimering</h3>
          </div>
          <GlassCard>
            <GlassCardContent className="p-4 pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-cyan-500 mt-0.5 shrink-0" />
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Daglig träning → Gemini Flash / GPT-5 Nano</p>
                    <p className="text-xs">Snabbast och billigast. Perfekt för WOD, chatt och briefings.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Längre program → Claude Opus / GPT-5.2</p>
                    <p className="text-xs">128K output-tokens. Kan generera 16+ veckors detaljerat program i ett svar.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Bäst kvalitet → Claude Sonnet / Gemini Pro</p>
                    <p className="text-xs">Utmärkt resonering till rimlig kostnad. Bra för nutritionsplanering och analys.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Flera providers → Lägre risk</p>
                    <p className="text-xs">Konfigurera 2–3 API-nycklar. Om en provider har driftstörning används automatiskt en annan.</p>
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
