'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Copy,
  Check,
  ExternalLink,
  UserPlus,
  AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useLocale, useTranslations } from '@/i18n/client'

interface PartnerReferral {
  id: string
  status: string
  referralSource: string
  subscriptionTier: string | null
  monthlyAmount: number
  currency: string
  totalRevenue: number
  totalBusinessShare: number
  totalPlatformShare: number
  pendingPayout: number
  paymentCount: number
  signedUpAt: Date
  activatedAt: Date | null
  user: {
    id: string
    name: string | null
    email: string
    createdAt: Date
  }
}

interface ReferralStats {
  totalReferrals: number
  byStatus: {
    pending: number
    active: number
    churned: number
    expired: number
  }
  revenue: {
    total: number
    businessShare: number
    platformShare: number
    pendingPayout: number
  }
  revenueSharePercent: number
}

interface PartnerReferralsTabProps {
  businessId: string
  businessSlug: string
  businessName: string
}

export function PartnerReferralsTab({ businessId, businessSlug, businessName }: PartnerReferralsTabProps) {
  const t = useTranslations('components.partnerReferralsTab')
  const numberLocale = useLocale() === 'sv' ? 'sv-SE' : 'en-US'
  const [referrals, setReferrals] = useState<PartnerReferral[]>([])
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [copied, setCopied] = useState(false)

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register/partner/${businessSlug}`

  const fetchReferrals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/admin/businesses/${businessId}/referrals?${params}`)
      if (!response.ok) throw new Error(t('errors.fetchFailed'))

      const result = await response.json()
      setReferrals(result.data.referrals)
      setStats(result.data.stats)
      setTotalPages(result.data.pagination.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [businessId, page, statusFilter, t])

  useEffect(() => {
    void fetchReferrals()
  }, [fetchReferrals])

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = referralLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      PENDING: { variant: 'secondary', label: t('status.pending') },
      ACTIVE: { variant: 'default', label: t('status.active') },
      CHURNED: { variant: 'destructive', label: t('status.churned') },
      EXPIRED: { variant: 'outline', label: t('status.expired') },
    }
    const config = variants[status] || { variant: 'outline' as const, label: t('status.unknown') }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatCurrency = (amount: number, currency: string = 'SEK') => {
    return new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchReferrals} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('actions.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Referral Link Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            {t('header.title')}
          </CardTitle>
          <CardDescription>
            {t('header.description', { businessName })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyReferralLink}
              aria-label={copied ? t('copy.ariaCopied') : t('copy.ariaCopy')}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t('header.trackingInfo', { businessName })}
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('stats.totalReferrals')}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalReferrals}</p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-green-600">
                  {stats.byStatus.active} {t('stats.active')}
                </span>
                <span className="text-muted-foreground">
                  {stats.byStatus.pending} {t('stats.pending')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('stats.totalRevenue')}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.revenue.total)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('stats.generatedByReferrals')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('stats.businessShare')}</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">
                {formatCurrency(stats.revenue.businessShare)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('stats.revenueSharePercent', { percent: stats.revenueSharePercent })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('stats.pendingPayout')}</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-amber-600">
                {formatCurrency(stats.revenue.pendingPayout)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('stats.awaitingTransfer')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referrals Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {t('table.title')}
              </CardTitle>
              <CardDescription>
                {t('table.subtitle', { businessName })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('filter.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter.all')}</SelectItem>
                  <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
                  <SelectItem value="ACTIVE">{t('status.active')}</SelectItem>
                  <SelectItem value="CHURNED">{t('status.churned')}</SelectItem>
                  <SelectItem value="EXPIRED">{t('status.expired')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchReferrals}
                disabled={loading}
                aria-label={t('actions.refreshList')}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && referrals.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">{t('loading')}</p>
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('empty.title')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('empty.description', { businessName })}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.columns.user')}</TableHead>
                    <TableHead>{t('table.columns.status')}</TableHead>
                    <TableHead>{t('table.columns.subscription')}</TableHead>
                    <TableHead className="text-right">{t('table.columns.revenue')}</TableHead>
                    <TableHead className="text-right">{t('table.columns.businessShare')}</TableHead>
                    <TableHead>{t('table.columns.signedUp')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {referral.user.name || t('table.unknownUser')}
                          </p>
                          <p className="text-xs text-muted-foreground">{referral.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>
                        {referral.subscriptionTier ? (
                          <div>
                            <p className="text-sm">{referral.subscriptionTier}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(referral.monthlyAmount, referral.currency)}
                              {t('table.monthly')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t('subscription.free')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(referral.totalRevenue, referral.currency)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(referral.totalBusinessShare, referral.currency)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(referral.signedUpAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('pagination.label', { current: page, total: totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t('pagination.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      {t('pagination.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
