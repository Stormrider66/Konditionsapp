'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  MapPin,
  Key,
  TrendingUp,
  DollarSign,
  Clock,
  FileText,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface BusinessStats {
  members: { total: number; testers: number }
  locations: number
  apiKeys: { active: number; total: number }
  referrals: {
    total: number
    active: number
    pending: number
    churned: number
    totalRevenue: number
    businessShare: number
    pendingPayout: number
  }
  contract: {
    id: string
    status: string
    startDate: string
    endDate: string | null
    monthlyFee: number
    currency: string
    athleteLimit: number
    coachLimit: number
  } | null
  business: {
    id: string
    name: string
    slug: string
  }
}

export function BusinessOverviewTab() {
  const [stats, setStats] = useState<BusinessStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/coach/admin/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const result = await response.json()
      setStats(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatCurrency = (amount: number, currency: string = 'SEK') => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchStats} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) return null

  const getContractStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      PENDING_APPROVAL: 'secondary',
      DRAFT: 'outline',
      SUSPENDED: 'destructive',
      CANCELLED: 'destructive',
      EXPIRED: 'outline',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Members</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.members.total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.members.testers} testers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Locations</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.locations}</p>
            <p className="text-xs text-muted-foreground mt-1">Active locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">API Keys</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.apiKeys.active}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.apiKeys.total} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Referrals</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.referrals.total}</p>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-green-600">{stats.referrals.active} active</span>
              <span className="text-muted-foreground">{stats.referrals.pending} pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(stats.referrals.totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">From referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Your Share</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {formatCurrency(stats.referrals.businessShare)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Earned from referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pending Payout</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {formatCurrency(stats.referrals.pendingPayout)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting transfer</p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Details */}
      {stats.contract && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle className="text-lg">Enterprise Contract</CardTitle>
              </div>
              {getContractStatusBadge(stats.contract.status)}
            </div>
            <CardDescription>Your current agreement with Star by Thomson</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Fee</p>
                <p className="font-medium">
                  {formatCurrency(stats.contract.monthlyFee, stats.contract.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {format(new Date(stats.contract.startDate), 'yyyy-MM-dd')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Athlete Limit</p>
                <p className="font-medium">
                  {stats.contract.athleteLimit === -1 ? 'Unlimited' : stats.contract.athleteLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coach Limit</p>
                <p className="font-medium">
                  {stats.contract.coachLimit === -1 ? 'Unlimited' : stats.contract.coachLimit}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
