'use client'

/**
 * Invitations Client Component
 *
 * Client-side component for managing invitations.
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronLeft,
  Mail,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Check,
  Clock,
  Users,
  UserPlus,
} from 'lucide-react'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { useLocale, useTranslations } from '@/i18n/client'

interface Invitation {
  id: string
  code: string
  type: string
  recipientName?: string | null
  recipientEmail?: string | null
  maxUses: number
  currentUses: number
  expiresAt?: Date | null
  createdAt: Date
  usedByClient?: { name: string } | null
}

interface InvitationsClientProps {
  invitations: Invitation[]
  userId: string
}

export function InvitationsClient({ invitations: initialInvitations, userId: _userId }: InvitationsClientProps) {
  const t = useTranslations('components.invitationsClient')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const { toast } = useToast()
  const pathname = usePathname()
  const businessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = businessSlug ? `/${businessSlug}` : ''
  const [invitations, setInvitations] = useState(initialInvitations)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    type: 'ATHLETE_SIGNUP',
    recipientName: '',
    recipientEmail: '',
    maxUses: 1,
    expiresInDays: 30,
  })

  const createInvitation = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setInvitations([data.invitation, ...invitations])
        setIsCreateOpen(false)
        setFormData({
          type: 'ATHLETE_SIGNUP',
          recipientName: '',
          recipientEmail: '',
          maxUses: 1,
          expiresInDays: 30,
        })
        toast({
          title: t('toasts.createdTitle'),
          description: t('toasts.createdDescription'),
        })
      } else {
        toast({
          title: t('toasts.errorTitle'),
          description: data.error || t('toasts.createFailed'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.createFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteInvitation = async (code: string) => {
    try {
      const response = await fetch(`/api/invitations/${code}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setInvitations(invitations.filter((inv) => inv.code !== code))
        toast({
          title: t('toasts.deletedTitle'),
          description: t('toasts.deletedDescription'),
        })
      } else {
        const data = await response.json()
        toast({
          title: t('toasts.errorTitle'),
          description: data.error || t('toasts.deleteFailed'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.deleteFailed'),
        variant: 'destructive',
      })
    }
  }

  const copyInviteLink = async (code: string) => {
    const link = `${window.location.origin}/signup?invite=${code}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(code)
      toast({
        title: t('toasts.copiedTitle'),
        description: t('toasts.copiedDescription'),
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch (_error) {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.copyFailed'),
        variant: 'destructive',
      })
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isExpired = (expiresAt?: Date | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ATHLETE_SIGNUP':
        return t('types.athleteSignup')
      case 'REPORT_VIEW':
        return t('types.reportView')
      case 'REFERRAL':
        return 'Referral'
      default:
        return type
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`${basePath}/coach/dashboard`}>
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <h1 className="text-lg font-semibold">{t('title')}</h1>
            </div>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('newInvitation')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('dialog.title')}</DialogTitle>
                <DialogDescription>
                  {t('dialog.description')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('fields.type')}</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="ATHLETE_SIGNUP">{t('types.athleteSignup')}</option>
                    <option value="REFERRAL">Referral</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('fields.recipientName')}</label>
                  <input
                    type="text"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Anna Andersson"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('fields.recipientEmail')}</label>
                  <input
                    type="email"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="anna@example.com"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('fields.maxUses')}</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('fields.expiresInDays')}</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.expiresInDays}
                      onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>

                <Button onClick={createInvitation} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {t('dialog.create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {invitations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">{t('empty.title')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('empty.description')}
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('empty.createFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          invitations.map((invitation) => {
            const expired = isExpired(invitation.expiresAt)
            const used = invitation.currentUses >= invitation.maxUses

            return (
              <Card key={invitation.id} className={expired || used ? 'opacity-60' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {invitation.code}
                        </code>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {getTypeLabel(invitation.type)}
                        </span>
                        {expired && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            {t('status.expired')}
                          </span>
                        )}
                        {used && !expired && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                            {t('status.used')}
                          </span>
                        )}
                      </div>

                      {invitation.recipientName && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">{t('recipientPrefix')}</span> {invitation.recipientName}
                          {invitation.recipientEmail && ` (${invitation.recipientEmail})`}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {t('uses', { current: invitation.currentUses, max: invitation.maxUses })}
                        </span>
                        {invitation.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t('expires', { date: formatDate(invitation.expiresAt) })}
                          </span>
                        )}
                      </div>

                      {invitation.usedByClient && (
                        <p className="text-xs text-green-600">
                          {t('usedBy', { name: invitation.usedByClient.name })}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyInviteLink(invitation.code)}
                        disabled={expired || used}
                      >
                        {copiedId === invitation.code ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteInvitation(invitation.code)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
