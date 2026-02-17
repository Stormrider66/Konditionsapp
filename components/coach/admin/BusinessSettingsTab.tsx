'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  RefreshCw,
  AlertCircle,
  Building2,
  MapPin,
  FileText,
  Save,
} from 'lucide-react'
import { format } from 'date-fns'

interface BusinessLocation {
  id: string
  name: string
  city: string | null
  address: string | null
  postalCode: string | null
  totalTests: number
  isActive: boolean
}

interface EnterpriseContract {
  id: string
  contractNumber: string
  contractName: string
  status: string
  startDate: string
  endDate: string | null
  monthlyFee: number
  currency: string
  revenueSharePercent: number
  athleteLimit: number
  coachLimit: number
  billingCycle: string
  paymentTermDays: number
  autoRenew: boolean
  noticePeriodDays: number
  customFeatures: unknown
}

interface BusinessSettings {
  id: string
  name: string
  slug: string
  description: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  logoUrl: string | null
  primaryColor: string | null
  isActive: boolean
  defaultRevenueShare: number
  createdAt: string
  updatedAt: string
  locations: BusinessLocation[]
  contract: EnterpriseContract | null
}

export function BusinessSettingsTab() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
  })

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/coach/admin/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const result = await response.json()
      setSettings(result.data)
      setFormData({
        name: result.data.name || '',
        description: result.data.description || '',
        email: result.data.email || '',
        phone: result.data.phone || '',
        website: result.data.website || '',
        address: result.data.address || '',
        city: result.data.city || '',
        postalCode: result.data.postalCode || '',
        country: result.data.country || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/coach/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || undefined,
          description: formData.description || null,
          email: formData.email || null,
          phone: formData.phone || null,
          website: formData.website || null,
          address: formData.address || null,
          city: formData.city || null,
          postalCode: formData.postalCode || null,
          country: formData.country || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }

      setSuccessMessage('Settings saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'SEK') => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchSettings} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Business Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle className="text-lg">Business Information</CardTitle>
          </div>
          <CardDescription>Update your business details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, postalCode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Save Changes
      </Button>

      {/* Locations */}
      {settings && settings.locations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle className="text-lg">Locations</CardTitle>
            </div>
            <CardDescription>Your business locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {settings.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 rounded-lg border dark:border-white/10"
                >
                  <div>
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[location.address, location.city, location.postalCode]
                        .filter(Boolean)
                        .join(', ') || 'No address'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{location.totalTests} tests</p>
                    <Badge variant={location.isActive ? 'default' : 'secondary'}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contract Details */}
      {settings?.contract && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle className="text-lg">Enterprise Contract</CardTitle>
              </div>
              {getContractStatusBadge(settings.contract.status)}
            </div>
            <CardDescription>
              Contract #{settings.contract.contractNumber} - {settings.contract.contractName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Fee</p>
                <p className="font-medium">
                  {formatCurrency(settings.contract.monthlyFee, settings.contract.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue Share</p>
                <p className="font-medium">{settings.contract.revenueSharePercent}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing Cycle</p>
                <p className="font-medium">{settings.contract.billingCycle}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{settings.contract.paymentTermDays} days</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {format(new Date(settings.contract.startDate), 'yyyy-MM-dd')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {settings.contract.endDate
                    ? format(new Date(settings.contract.endDate), 'yyyy-MM-dd')
                    : 'Ongoing'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Athlete Limit</p>
                <p className="font-medium">
                  {settings.contract.athleteLimit === -1 ? 'Unlimited' : settings.contract.athleteLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coach Limit</p>
                <p className="font-medium">
                  {settings.contract.coachLimit === -1 ? 'Unlimited' : settings.contract.coachLimit}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t dark:border-white/10 flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Auto-Renew:</span>{' '}
                <span className="font-medium">{settings.contract.autoRenew ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Notice Period:</span>{' '}
                <span className="font-medium">{settings.contract.noticePeriodDays} days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
