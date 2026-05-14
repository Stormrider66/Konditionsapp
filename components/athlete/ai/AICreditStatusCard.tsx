'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, Coins, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type AthleteTier = 'FREE' | 'STANDARD' | 'PRO' | 'ELITE'

interface AllowancePayload {
  tier: AthleteTier
  subscriptionStatus: string | null
  billingCycle: string | null
  allowance: {
    periodStart: string
    periodEnd: string
    includedBudgetSek: number
    includedUsedSek: number
    includedRemainingSek: number
    topUpBalanceSek: number
    hardCapSek: number
    remainingSek: number
    status: string
    usage: {
      includedUsedPercent: number
      totalUsedPercent: number
      alertLevel: 'HEALTHY' | 'NOTICE' | 'LOW' | 'EXHAUSTED'
    }
  }
  recentTopUps: Array<{
    id: string
    amountPaidSek: number
    creditsSek: number
    creditsRemainingSek: number
    status: string
    expiresAt: string | null
    createdAt: string
  }>
}

interface AICreditStatusCardProps {
  basePath?: string
  className?: string
  compact?: boolean
}

function formatSek(value: number): string {
  if (!Number.isFinite(value)) return '0 kr'
  return `${Math.max(0, value).toLocaleString('sv-SE', {
    maximumFractionDigits: value < 10 ? 2 : 0,
  })} kr`
}

function formatPeriodEnd(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'nästa månad'
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export function AICreditStatusCard({
  basePath = '',
  className,
  compact = false,
}: AICreditStatusCardProps) {
  const [data, setData] = useState<AllowancePayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadAllowance() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/athlete/ai-allowance', {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('allowance_fetch_failed')
        }
        const payload = await response.json()
        if (isMounted) {
          setData(payload)
          setError(null)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        if (isMounted) {
          setError('Kunde inte hämta AI-krediter just nu.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadAllowance()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  const status = useMemo(() => {
    if (!data) return { tone: 'neutral' as const, label: 'AI-krediter' }
    const allowance = data.allowance
    const remaining = Math.max(allowance.remainingSek, 0)

    if (remaining <= 0 || allowance.status !== 'ACTIVE' || allowance.usage.alertLevel === 'EXHAUSTED') {
      return { tone: 'empty' as const, label: 'Slut på AI-krediter' }
    }
    if (allowance.usage.alertLevel === 'LOW') {
      return { tone: 'low' as const, label: 'Lågt saldo' }
    }
    if (allowance.usage.alertLevel === 'NOTICE') {
      return { tone: 'watch' as const, label: 'AI-krediter' }
    }
    return { tone: 'healthy' as const, label: 'AI-krediter' }
  }, [data])

  if (isLoading) {
    return (
      <div className={cn(
        'rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5',
        className,
      )}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-2 w-full animate-pulse rounded bg-slate-100 dark:bg-white/5" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={cn(
        'rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5',
        className,
      )}>
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <RefreshCw className="h-4 w-4" />
          <span>{error ?? 'AI-krediter är tillfälligt otillgängliga.'}</span>
        </div>
      </div>
    )
  }

  const allowance = data.allowance
  const totalBudget = Math.max(allowance.includedBudgetSek + allowance.topUpBalanceSek, 0)
  const remaining = Math.max(allowance.remainingSek, 0)
  const usedPercent = totalBudget > 0
    ? Math.min(100, Math.max(0, ((totalBudget - remaining) / totalBudget) * 100))
    : 100
  const subscriptionHref = `${basePath}/athlete/subscription`
  const periodEnd = formatPeriodEnd(allowance.periodEnd)

  return (
    <section
      className={cn(
        'rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-colors',
        status.tone === 'empty'
          ? 'border-red-200 bg-red-50/90 dark:border-red-500/30 dark:bg-red-950/30'
          : status.tone === 'low' || status.tone === 'watch'
            ? 'border-amber-200 bg-amber-50/90 dark:border-amber-500/30 dark:bg-amber-950/30'
            : 'border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/5',
        className,
      )}
      aria-label="AI-krediter"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              status.tone === 'empty'
                ? 'border-red-200 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                : status.tone === 'low' || status.tone === 'watch'
                  ? 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                  : 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
            )}
          >
            {status.tone === 'healthy' ? <Sparkles className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-white">
                {status.label}
              </h2>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white dark:bg-white dark:text-slate-950">
                {data.tier}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {formatSek(remaining)} kvar till {periodEnd}
            </p>
          </div>
        </div>

        {!compact && (
          <Button asChild size="sm" variant={status.tone === 'healthy' ? 'outline' : 'default'}>
            <Link href={subscriptionHref}>
              <span>Hantera</span>
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <Progress value={100 - usedPercent} className="h-2" />
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{formatSek(allowance.includedUsedSek)} använt</span>
          <span>{formatSek(allowance.includedBudgetSek)} ingår/mån</span>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 space-y-3">
          {allowance.usage.alertLevel !== 'HEALTHY' && (
            <div className={cn(
              'flex items-start gap-2 rounded-xl p-3 text-xs',
              status.tone === 'empty'
                ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
            )}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {allowance.usage.alertLevel === 'EXHAUSTED'
                  ? 'AI-krediterna är slut för perioden. Fyll på eller uppgradera för att fortsätta med tyngre AI-funktioner.'
                  : allowance.usage.alertLevel === 'LOW'
                    ? 'Du har använt över 90% av månadens AI-krediter. Fyll på i tid om du använder mat-skanner, videoanalys eller röstcoach ofta.'
                    : 'Du har använt över 80% av månadens AI-krediter. Håll koll om du planerar fler AI-tunga pass den här perioden.'}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-slate-950/[0.03] p-3 text-xs text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
            <Coins className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              AI-krediter används av mat-skanner, videoanalys, röstcoach, programimport och andra tyngre AI-funktioner.
              {allowance.topUpBalanceSek > 0 ? ` Extra saldo: ${formatSek(allowance.topUpBalanceSek)}.` : ''}
            </p>
          </div>

          {data.recentTopUps.length > 0 && (
            <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3 text-xs dark:border-white/10 dark:bg-white/5">
              <p className="mb-2 font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Senaste påfyllningar
              </p>
              <div className="space-y-2">
                {data.recentTopUps.map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-200">
                    <div>
                      <p className="font-semibold">{formatSek(purchase.creditsSek)} krediter</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {formatShortDate(purchase.createdAt)} · {purchase.status.toLowerCase()}
                      </p>
                    </div>
                    <span className="font-semibold">{formatSek(purchase.creditsRemainingSek)} kvar</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {compact && status.tone !== 'healthy' && (
        <Button asChild size="sm" className="mt-4 w-full">
          <Link href={subscriptionHref}>Uppgradera eller fyll på</Link>
        </Button>
      )}
    </section>
  )
}
