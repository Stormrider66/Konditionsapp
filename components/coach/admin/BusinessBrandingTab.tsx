'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  RefreshCw,
  AlertCircle,
  Palette,
  Globe,
  Eye,
  Lock,
  Save,
  Crown,
  Type,
} from 'lucide-react'

const CURATED_FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Nunito', label: 'Nunito' },
]

interface BrandingData {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  backgroundColor: string | null
  fontFamily: string | null
  faviconUrl: string | null
  customDomain: string | null
  domainVerified: boolean
  domainVerifiedAt: string | null
  domainTxtRecord: string | null
  emailSenderName: string | null
  pageTitle: string | null
  hidePlatformBranding: boolean
  hasCustomBranding: boolean
  hasWhiteLabel: boolean
}

function LockedSection({ title, description, tier }: { title: string; description: string; tier: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-white/60 dark:bg-black/40 backdrop-blur-[1px] z-10 rounded-lg flex items-center justify-center">
        <div className="text-center p-6">
          <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          <Badge variant="outline" className="mt-2">
            <Crown className="h-3 w-3 mr-1" />
            {tier}
          </Badge>
        </div>
      </div>
      <div className="opacity-40 pointer-events-none select-none" aria-hidden="true">
        <div className="space-y-4 p-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    </div>
  )
}

export function BusinessBrandingTab() {
  const [data, setData] = useState<BrandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [form, setForm] = useState({
    logoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    backgroundColor: '',
    fontFamily: '',
    faviconUrl: '',
    emailSenderName: '',
    pageTitle: '',
    hidePlatformBranding: false,
  })

  const fetchBranding = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/coach/admin/branding')
      if (!response.ok) throw new Error('Failed to fetch branding')
      const result = await response.json()
      setData(result.data)
      setForm({
        logoUrl: result.data.logoUrl || '',
        primaryColor: result.data.primaryColor || '#3b82f6',
        secondaryColor: result.data.secondaryColor || '',
        backgroundColor: result.data.backgroundColor || '',
        fontFamily: result.data.fontFamily || '',
        faviconUrl: result.data.faviconUrl || '',
        emailSenderName: result.data.emailSenderName || '',
        pageTitle: result.data.pageTitle || '',
        hidePlatformBranding: result.data.hidePlatformBranding || false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branding')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const body: Record<string, unknown> = {
        logoUrl: form.logoUrl || null,
        primaryColor: form.primaryColor || null,
      }

      // Include custom branding fields if feature is enabled
      if (data?.hasCustomBranding) {
        body.secondaryColor = form.secondaryColor || null
        body.backgroundColor = form.backgroundColor || null
        body.fontFamily = form.fontFamily || null
        body.faviconUrl = form.faviconUrl || null
      }

      // Include white-label fields if feature is enabled
      if (data?.hasWhiteLabel) {
        body.emailSenderName = form.emailSenderName || null
        body.pageTitle = form.pageTitle || null
        body.hidePlatformBranding = form.hidePlatformBranding
      }

      const response = await fetch('/api/coach/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save branding')
      }

      setSuccessMessage('Branding saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchBranding()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchBranding} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

      {/* Basic Branding (available to all) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle className="text-lg">Basic Branding</CardTitle>
          </div>
          <CardDescription>Logo and primary color for your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  value={form.primaryColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
                <input
                  type="color"
                  value={form.primaryColor || '#3b82f6'}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          {(form.logoUrl || form.primaryColor) && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Preview
              </p>
              <div className="flex items-center gap-3">
                {form.logoUrl && (
                  <Image
                    src={form.logoUrl}
                    alt="Logo preview"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain rounded"
                    unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <span
                  className="font-semibold text-lg"
                  style={{ color: form.primaryColor || '#3b82f6' }}
                >
                  {data?.name}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Branding (Tier 1) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              <CardTitle className="text-lg">Custom Branding</CardTitle>
            </div>
            {data?.hasCustomBranding ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="outline">
                <Crown className="h-3 w-3 mr-1" />
                Pro / Enterprise
              </Badge>
            )}
          </div>
          <CardDescription>
            Extended colors, custom font, and favicon
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.hasCustomBranding ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      value={form.secondaryColor}
                      onChange={(e) => setForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                      placeholder="#6366F1"
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={form.secondaryColor || '#6366f1'}
                      onChange={(e) => setForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Tint</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      value={form.backgroundColor}
                      onChange={(e) => setForm((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      placeholder="#F9FAFB"
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={form.backgroundColor || '#f9fafb'}
                      onChange={(e) => setForm((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select
                    value={form.fontFamily || ''}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, fontFamily: value }))}
                  >
                    <SelectTrigger id="fontFamily">
                      <SelectValue placeholder="Default (Inter)" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURATED_FONTS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faviconUrl">Favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    type="url"
                    value={form.faviconUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, faviconUrl: e.target.value }))}
                    placeholder="https://example.com/favicon.ico"
                  />
                  <p className="text-xs text-muted-foreground">32x32 PNG or ICO recommended</p>
                </div>
              </div>
            </div>
          ) : (
            <LockedSection
              title="Upgrade to unlock Custom Branding"
              description="Set secondary colors, background tints, custom fonts, and favicon"
              tier="Pro / Enterprise"
            />
          )}
        </CardContent>
      </Card>

      {/* White Label (Tier 2) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle className="text-lg">White Label</CardTitle>
            </div>
            {data?.hasWhiteLabel ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="outline">
                <Crown className="h-3 w-3 mr-1" />
                Enterprise
              </Badge>
            )}
          </div>
          <CardDescription>
            Remove platform branding, custom page title, and email sender name
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.hasWhiteLabel ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pageTitle">Custom Page Title</Label>
                  <Input
                    id="pageTitle"
                    value={form.pageTitle}
                    onChange={(e) => setForm((prev) => ({ ...prev, pageTitle: e.target.value }))}
                    placeholder={data?.name || 'My Business'}
                  />
                  <p className="text-xs text-muted-foreground">Shown in browser tab</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailSenderName">Email Sender Name</Label>
                  <Input
                    id="emailSenderName"
                    value={form.emailSenderName}
                    onChange={(e) => setForm((prev) => ({ ...prev, emailSenderName: e.target.value }))}
                    placeholder={data?.name || 'My Business'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Emails sent as &quot;{form.emailSenderName || 'Trainomics'} &lt;noreply@trainomics.app&gt;&quot;
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="hidePlatformBranding">Hide Platform Branding</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove all &quot;Trainomics&quot; references from the UI
                  </p>
                </div>
                <Switch
                  id="hidePlatformBranding"
                  checked={form.hidePlatformBranding}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, hidePlatformBranding: checked }))
                  }
                />
              </div>

              {/* Custom Domain Section */}
              {data.customDomain ? (
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Custom Domain</p>
                      <p className="text-sm text-muted-foreground">{data.customDomain}</p>
                    </div>
                    <Badge variant={data.domainVerified ? 'default' : 'secondary'}>
                      {data.domainVerified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                  {!data.domainVerified && data.domainTxtRecord && (
                    <div className="mt-2 p-3 bg-muted rounded text-xs space-y-1">
                      <p className="font-medium">DNS Records Required:</p>
                      <p>CNAME: {data.customDomain} &rarr; cname.trainomics.app</p>
                      <p>TXT: _trainomics-verify.{data.customDomain} &rarr; {data.domainTxtRecord}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <Globe className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Custom domain can be configured in domain settings
                  </p>
                </div>
              )}
            </div>
          ) : (
            <LockedSection
              title="Upgrade to unlock White Label"
              description="Hide platform branding, custom page title, email sender, and domain"
              tier="Enterprise"
            />
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Branding
        </Button>
      </div>
    </div>
  )
}
