'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, AlertCircle, Wallet, RefreshCw } from 'lucide-react'
import { useBusinessAdminHeaders } from '@/components/coach/admin/BusinessAdminContext'

interface MemberBudget {
  userId: string
  name: string | null
  email: string
  role: string
  monthlyLimitSek: number | null
  monthSpendSek: number
  remainingSek: number | null
}

type AppLocale = 'en' | 'sv'

const COPY = {
  en: {
    title: 'AI spending limits',
    description:
      'Set a monthly AI spending limit per member. When the limit is reached, AI features are paused for that member until next month — including on their personal athlete page. Leave empty for unlimited.',
    monthSpend: 'Spent this month',
    limitPlaceholder: 'No limit',
    save: 'Save',
    clear: 'Remove limit',
    unlimited: 'Unlimited',
    limitReached: 'Limit reached',
    nearLimit: 'Near limit',
    saved: 'Saved.',
    saveError: 'Could not save the limit',
    loadError: 'Could not load members',
    invalidLimit: 'Enter a positive amount in kr',
    retry: 'Retry',
    perMonth: 'kr/month',
  },
  sv: {
    title: 'AI-utgiftsgränser',
    description:
      'Sätt en månatlig AI-utgiftsgräns per medlem. När gränsen nås pausas AI-funktionerna för medlemmen till nästa månad — även på deras personliga atletsida. Lämna tomt för obegränsat.',
    monthSpend: 'Förbrukat denna månad',
    limitPlaceholder: 'Ingen gräns',
    save: 'Spara',
    clear: 'Ta bort gräns',
    unlimited: 'Obegränsat',
    limitReached: 'Gräns nådd',
    nearLimit: 'Nära gränsen',
    saved: 'Sparat.',
    saveError: 'Kunde inte spara gränsen',
    loadError: 'Kunde inte hämta medlemmar',
    invalidLimit: 'Ange ett positivt belopp i kr',
    retry: 'Försök igen',
    perMonth: 'kr/månad',
  },
} as const

function formatSek(value: number, locale: AppLocale): string {
  return `${value.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    maximumFractionDigits: 2,
  })} kr`
}

export function BusinessAiBudgetsTab() {
  const rawLocale = useLocale()
  const locale: AppLocale = rawLocale === 'sv' ? 'sv' : 'en'
  const t = COPY[locale]
  const businessHeaders = useBusinessAdminHeaders()

  const [members, setMembers] = useState<MemberBudget[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [rowMessage, setRowMessage] = useState<Record<string, { ok: boolean; text: string }>>({})

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const response = await fetch('/api/coach/admin/coach-budgets', {
        headers: businessHeaders,
      })
      if (!response.ok) throw new Error('Failed to fetch budgets')
      const result = await response.json()
      const data: MemberBudget[] = result.data
      setMembers(data)
      setDrafts(
        Object.fromEntries(
          data.map((m) => [m.userId, m.monthlyLimitSek !== null ? String(m.monthlyLimitSek) : '']),
        ),
      )
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [businessHeaders])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchBudgets()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchBudgets])

  const saveLimit = async (userId: string, monthlyLimitSek: number | null) => {
    setSavingUserId(userId)
    setRowMessage((prev) => {
      const { [userId]: _removed, ...rest } = prev
      return rest
    })
    try {
      const response = await fetch('/api/coach/admin/coach-budgets', {
        method: 'PATCH',
        headers: { ...businessHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, monthlyLimitSek }),
      })
      if (!response.ok) throw new Error('Failed to save')
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === userId
            ? {
                ...m,
                monthlyLimitSek,
                remainingSek:
                  monthlyLimitSek !== null
                    ? Math.max(0, monthlyLimitSek - m.monthSpendSek)
                    : null,
              }
            : m,
        ),
      )
      setDrafts((prev) => ({
        ...prev,
        [userId]: monthlyLimitSek !== null ? String(monthlyLimitSek) : '',
      }))
      setRowMessage((prev) => ({ ...prev, [userId]: { ok: true, text: t.saved } }))
    } catch {
      setRowMessage((prev) => ({ ...prev, [userId]: { ok: false, text: t.saveError } }))
    } finally {
      setSavingUserId(null)
    }
  }

  const handleSave = (member: MemberBudget) => {
    const raw = (drafts[member.userId] ?? '').trim().replace(',', '.')
    if (raw === '') {
      void saveLimit(member.userId, null)
      return
    }
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) {
      setRowMessage((prev) => ({
        ...prev,
        [member.userId]: { ok: false, text: t.invalidLimit },
      }))
      return
    }
    void saveLimit(member.userId, Math.round(value * 100) / 100)
  }

  const statusBadge = (member: MemberBudget) => {
    if (member.monthlyLimitSek === null) {
      return <Badge variant="secondary">{t.unlimited}</Badge>
    }
    if (member.monthSpendSek >= member.monthlyLimitSek) {
      return <Badge variant="destructive">{t.limitReached}</Badge>
    }
    if (member.monthSpendSek >= member.monthlyLimitSek * 0.8) {
      return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">{t.nearLimit}</Badge>
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span>{t.loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchBudgets()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t.retry}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.map((member) => {
          const message = rowMessage[member.userId]
          return (
            <div
              key={member.userId}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{member.name || member.email}</span>
                  <Badge variant="outline">{member.role}</Badge>
                  {statusBadge(member)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t.monthSpend}: {formatSek(member.monthSpendSek, locale)}
                  {member.monthlyLimitSek !== null && (
                    <> / {formatSek(member.monthlyLimitSek, locale)}</>
                  )}
                </div>
                {message && (
                  <div className={`text-sm ${message.ok ? 'text-green-600' : 'text-destructive'}`}>
                    {message.text}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="w-28"
                    placeholder={t.limitPlaceholder}
                    value={drafts[member.userId] ?? ''}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [member.userId]: e.target.value }))
                    }
                  />
                  <span className="whitespace-nowrap text-sm text-muted-foreground">
                    {t.perMonth}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSave(member)}
                  disabled={savingUserId === member.userId}
                >
                  {savingUserId === member.userId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t.save
                  )}
                </Button>
                {member.monthlyLimitSek !== null && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void saveLimit(member.userId, null)}
                    disabled={savingUserId === member.userId}
                  >
                    {t.clear}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
