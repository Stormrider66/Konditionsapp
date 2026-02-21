'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, Sparkles, Check, X, Key, Lightbulb, Crown } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { AIChatUsageMeter } from '@/components/athlete/AIChatUsageMeter'
import { ATHLETE_TIER_FEATURES } from '@/lib/ai/cost-data'

interface SubscriptionData {
  hasSubscription: boolean
  tier: string
  status: string
  trialActive?: boolean
  trialDaysRemaining?: number | null
  features?: {
    aiChat?: { enabled: boolean; used: number; limit: number }
    videoAnalysis?: { enabled: boolean }
    strava?: { enabled: boolean }
    garmin?: { enabled: boolean }
    workoutLogging?: { enabled: boolean }
  }
  assignedCoachId?: string | null
}

export default function AthleteAIInfoPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/athlete/subscription-status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSubscription(data.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hasCoach = !!subscription?.assignedCoachId
  const tier = subscription?.tier || 'FREE'
  const isPro = tier === 'PRO'
  const isStandard = tier === 'STANDARD'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-200 pb-20 selection:bg-orange-500/30 transition-colors">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-400/10 dark:bg-green-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 dark:bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-0 z-20 transition-colors">
        <div className="container max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/athlete/settings">
            <Button variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center border border-green-200 dark:border-green-500/20 transition-colors">
              <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400 transition-colors" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-none transition-colors">AI & Din Plan</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 transition-colors">Funktioner & användning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-lg mx-auto p-4 space-y-6 relative z-10">

        {/* How AI Works */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-purple-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Hur AI fungerar</h3>
          </div>
          <GlassCard>
            <GlassCardContent className="p-4 pt-4">
              {loading ? (
                <div className="h-16 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : hasCoach ? (
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>
                    Din coach tillhandahåller AI-funktionerna via sina API-nycklar.
                    Du behöver inte tänka på kostnader &mdash; det hanteras av din coach.
                  </p>
                  <p className="text-xs text-slate-500">
                    AI-modeller och funktioner bestäms av din coachs inställningar och din prenumerationsnivå.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <p>Du har två alternativ för AI-funktioner:</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Crown className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Plattformens AI (inkluderat)</p>
                        <p className="text-xs">AI ingår i din prenumeration med begränsningar baserat på din nivå.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Key className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Egna API-nycklar (obegränsat)</p>
                        <p className="text-xs">Koppla dina egna nycklar för obegränsad AI-användning utan tier-begränsningar.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </section>

        {/* Current Plan & Usage */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-green-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Din plan</h3>
          </div>
          <GlassCard>
            <GlassCardContent className="p-4 pt-4 space-y-4">
              {loading ? (
                <div className="h-16 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-slate-900 dark:text-white">{tier}</span>
                        {subscription?.trialActive && (
                          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                            Provperiod{subscription.trialDaysRemaining ? ` (${subscription.trialDaysRemaining} dagar kvar)` : ''}
                          </Badge>
                        )}
                        {subscription?.status === 'ACTIVE' && (
                          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 text-[10px]">
                            Aktiv
                          </Badge>
                        )}
                      </div>
                      {isStandard && <p className="text-xs text-slate-500 mt-1">199 kr/mån</p>}
                      {isPro && <p className="text-xs text-slate-500 mt-1">399 kr/mån</p>}
                    </div>
                  </div>

                  {subscription?.features?.aiChat && (
                    <AIChatUsageMeter
                      used={subscription.features.aiChat.used}
                      limit={subscription.features.aiChat.limit === -1 ? undefined : subscription.features.aiChat.limit}
                    />
                  )}
                </>
              )}
            </GlassCardContent>
          </GlassCard>
        </section>

        {/* Tier Comparison */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Jämför planer</h3>
          </div>
          <GlassCard>
            <GlassCardContent className="p-0 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className="text-left p-3 text-xs font-bold text-slate-500">Funktion</th>
                      <th className="text-center p-3 text-xs font-bold text-slate-500">
                        <div>FREE</div>
                        <div className="text-[10px] font-normal">0 kr/mån</div>
                      </th>
                      <th className="text-center p-3 text-xs font-bold text-slate-500">
                        <div>STANDARD</div>
                        <div className="text-[10px] font-normal">199 kr/mån</div>
                      </th>
                      <th className="text-center p-3 text-xs font-bold text-slate-500">
                        <div>PRO</div>
                        <div className="text-[10px] font-normal">399 kr/mån</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ATHLETE_TIER_FEATURES.map((feature, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                        <td className="p-3 text-slate-700 dark:text-slate-300">{feature.name}</td>
                        <td className="p-3 text-center">
                          {feature.free === true ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : feature.free === false ? (
                            <X className="h-4 w-4 text-slate-300 dark:text-slate-600 mx-auto" />
                          ) : (
                            <span className="text-xs text-slate-500">{feature.free}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {feature.standard === true ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : feature.standard === false ? (
                            <X className="h-4 w-4 text-slate-300 dark:text-slate-600 mx-auto" />
                          ) : (
                            <span className="text-xs text-slate-500">{feature.standard}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {feature.pro === true ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : feature.pro === false ? (
                            <X className="h-4 w-4 text-slate-300 dark:text-slate-600 mx-auto" />
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">{feature.pro}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCardContent>
          </GlassCard>
        </section>

        {/* BYOK Section (only for self-coached athletes) */}
        {!hasCoach && !loading && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Egna API-nycklar</h3>
            </div>
            <GlassCard>
              <GlassCardContent className="p-4 pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <p>
                      Koppla dina egna API-nycklar för obegränsad AI-användning utan tier-begränsningar.
                      Du betalar direkt till AI-leverantören (Google, Anthropic, OpenAI).
                    </p>
                    <p className="text-xs text-slate-500">
                      Med egna nycklar kan du använda vilken modell som helst och har inga meddelandegränser.
                    </p>
                    <Link href="/athlete/settings">
                      <Button variant="outline" size="sm" className="mt-2">
                        <Key className="h-3.5 w-3.5 mr-1.5" />
                        Gå till AI-inställningar
                      </Button>
                    </Link>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </section>
        )}

        {/* Tips */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-4 bg-cyan-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Tips</h3>
          </div>
          <GlassCard>
            <GlassCardContent className="p-4 pt-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-cyan-500 mt-0.5 shrink-0" />
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-semibold text-slate-900 dark:text-white">Använd AI effektivt</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    <li>Ställ specifika frågor &mdash; du får bättre svar och använder färre meddelanden</li>
                    <li>Använd &quot;Dagens pass&quot; istället för chatt för snabba träningspass</li>
                    <li>Morgonbriefingen ger dagliga tips utan att använda dina chattmeddelanden</li>
                    {!hasCoach && (
                      <li>Överväg egna API-nycklar om du vill använda AI intensivt</li>
                    )}
                  </ul>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </section>

      </div>
    </div>
  )
}
