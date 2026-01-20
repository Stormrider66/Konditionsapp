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

export function BusinessReferralsTab() {
  const [referrals, setReferrals] = useState<PartnerReferral[]>([])
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [businessSlug, setBusinessSlug] = useState<string>('')
  const [businessName, setBusinessName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [copied, setCopied] = useState(false)

  const referralLink = businessSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register/partner/${businessSlug}`
    : ''

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

      const response = await fetch(`/api/coach/admin/referrals?${params}`)
      if (!response.ok) throw new Error('Failed to fetch referrals')

      const result = await response.json()
      setReferrals(result.data.referrals)
      setStats(result.data.stats)
      setTotalPages(result.data.pagination.totalPages)
      setBusinessSlug(result.data.business.slug)
      setBusinessName(result.data.business.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referrals')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchReferrals()
  }, [fetchReferrals])

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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
      PENDING: { variant: 'secondary', label: 'Pending' },
      ACTIVE: { variant: 'default', label: 'Active' },
      CHURNED: { variant: 'destructive', label: 'Churned' },
      EXPIRED: { variant: 'outline', label: 'Expired' },
    }
    const config = variants[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatCurrency = (amount: number, currency: string = 'SEK') => {
    return new Intl.NumberFormat('sv-SE', {
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
          Retry
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
            Partner Referral Link
          </CardTitle>
          <CardDescription>
            Share this link to invite new users to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="font-mono text-sm"
              placeholder="Loading..."
            />
            <Button variant="outline" size="icon" onClick={copyReferralLink} disabled={!referralLink}>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Users who sign up through this link will be tracked as your referrals
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
                <span className="text-sm text-muted-foreground">Total Referrals</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalReferrals}</p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-green-600">{stats.byStatus.active} active</span>
                <span className="text-muted-foreground">{stats.byStatus.pending} pending</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.revenue.total)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Generated by referrals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Your Share</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-green-600">
                {formatCurrency(stats.revenue.businessShare)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.revenueSharePercent}% revenue share
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pending Payout</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-amber-600">
                {formatCurrency(stats.revenue.pendingPayout)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Awaiting transfer
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
                Referred Users
              </CardTitle>
              <CardDescription>
                Users who signed up through your referral link
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="CHURNED">Churned</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchReferrals} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && referrals.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading referrals...</p>
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No referrals yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Share your referral link to get started
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Your Share</TableHead>
                    <TableHead>Signed Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.user.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{referral.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>
                        {referral.subscriptionTier ? (
                          <div>
                            <p className="text-sm">{referral.subscriptionTier}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(referral.monthlyAmount, referral.currency)}/mo
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Free</span>
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
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
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
