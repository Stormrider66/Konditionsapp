'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'

interface EarningsSummary {
  allTime: {
    totalEarnings: number
    transactionCount: number
  }
  thisMonth: {
    totalEarnings: number
    transactionCount: number
  }
  thisYear: {
    totalEarnings: number
    transactionCount: number
  }
  pendingPayout: number
}

interface Earning {
  id: string
  athleteId: string
  athleteName: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  coachAmount: number
  platformAmount: number
  sharePercent: number
  status: string
  paidOutAt: string | null
  createdAt: string
}

interface Props {
  locale?: 'en' | 'sv'
}

// Format öre to SEK
function formatCurrency(amountInOre: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
  }).format(amountInOre / 100)
}

export function CoachEarningsDashboard({ locale = 'sv' }: Props) {
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const t = (en: string, sv: string) => locale === 'sv' ? sv : en
  const dateLocale = locale === 'sv' ? sv : enUS

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/coach/earnings')
        const data = await response.json()

        if (data.success) {
          setSummary(data.data.summary)
          setEarnings(data.data.earnings)
        } else {
          console.error('Failed to fetch earnings:', data.error)
          // Set empty state on error
          setSummary({
            allTime: { totalEarnings: 0, transactionCount: 0 },
            thisMonth: { totalEarnings: 0, transactionCount: 0 },
            thisYear: { totalEarnings: 0, transactionCount: 0 },
            pendingPayout: 0,
          })
          setEarnings([])
        }
      } catch (error) {
        console.error('Failed to fetch earnings:', error)
        // Set empty state on error
        setSummary({
          allTime: { totalEarnings: 0, transactionCount: 0 },
          thisMonth: { totalEarnings: 0, transactionCount: 0 },
          thisYear: { totalEarnings: 0, transactionCount: 0 },
          pendingPayout: 0,
        })
        setEarnings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('This Month', 'Denna månad')}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              {formatCurrency(summary?.thisMonth.totalEarnings || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary?.thisMonth.transactionCount || 0} {t('transactions', 'transaktioner')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('This Year', 'Detta år')}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              {formatCurrency(summary?.thisYear.totalEarnings || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary?.thisYear.transactionCount || 0} {t('transactions', 'transaktioner')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('All Time', 'Totalt')}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              {formatCurrency(summary?.allTime.totalEarnings || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary?.allTime.transactionCount || 0} {t('transactions', 'transaktioner')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('Pending Payout', 'Väntande utbetalning')}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              {formatCurrency(summary?.pendingPayout || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('Awaiting next payout', 'Väntar på nästa utbetalning')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Earnings History', 'Intäktshistorik')}</CardTitle>
          <CardDescription>
            {t('Your earnings from athlete subscriptions.', 'Dina intäkter från atletprenumerationer.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {t('No earnings yet', 'Inga intäkter ännu')}
              </p>
              <p className="text-muted-foreground">
                {t(
                  'When athletes subscribe through you, your earnings will appear here.',
                  'När atleter prenumererar via dig kommer dina intäkter att visas här.'
                )}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Athlete', 'Atlet')}</TableHead>
                  <TableHead>{t('Period', 'Period')}</TableHead>
                  <TableHead className="text-right">{t('Your Share', 'Din andel')}</TableHead>
                  <TableHead className="text-right">{t('Total', 'Totalt')}</TableHead>
                  <TableHead>{t('Status', 'Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map(earning => (
                  <TableRow key={earning.id}>
                    <TableCell className="font-medium">{earning.athleteName}</TableCell>
                    <TableCell>
                      {format(new Date(earning.periodStart), 'PP', { locale: dateLocale })} -{' '}
                      {format(new Date(earning.periodEnd), 'PP', { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(earning.coachAmount)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({earning.sharePercent}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(earning.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={earning.status === 'PAID_OUT' ? 'default' : 'secondary'}
                      >
                        {earning.status === 'PAID_OUT'
                          ? t('Paid', 'Utbetalat')
                          : t('Pending', 'Väntande')
                        }
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-2">{t('How Revenue Sharing Works', 'Hur intäktsdelning fungerar')}</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • {t('You earn 75% of athlete subscription fees', 'Du tjänar 75% av atletprenumerationsavgifterna')}
            </li>
            <li>
              • {t('Revenue share starts from the next billing cycle after connection', 'Intäktsdelning börjar från nästa faktureringsperiod efter anslutning')}
            </li>
            <li>
              • {t('Payouts are processed monthly', 'Utbetalningar behandlas månadsvis')}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
