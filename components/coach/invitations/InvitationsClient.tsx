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
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
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
    <RolePageFrame contentClassName="max-w-4xl">
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            {t('title')}
          </span>
        }
        description={t('dialog.description')}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`${basePath}/coach/dashboard`}>
                <ChevronLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  {t('newInvitation')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t('dialog.title')}</DialogTitle>
                  <DialogDescription>
                    {t('dialog.description')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t('fields.type')}</label>
                    <select
                      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="ATHLETE_SIGNUP">{t('types.athleteSignup')}</option>
                      <option value="REFERRAL">Referral</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t('fields.recipientName')}</label>
                    <input
                      type="text"
                      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50"
                      placeholder="Anna Andersson"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t('fields.recipientEmail')}</label>
                    <input
                      type="email"
                      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50"
                      placeholder="anna@example.com"
                      value={formData.recipientEmail}
                      onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t('fields.maxUses')}</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50"
                        value={formData.maxUses}
                        onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{t('fields.expiresInDays')}</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-50"
                        value={formData.expiresInDays}
                        onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                  </div>

                  <Button onClick={createInvitation} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {t('dialog.create')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="space-y-4">
        {invitations.length === 0 ? (
          <RolePanel className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <UserPlus className="h-6 w-6" />
            </div>
            <h3 className="mb-2 font-semibold text-zinc-950 dark:text-zinc-50">{t('empty.title')}</h3>
            <p className="mx-auto mb-5 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
              {t('empty.description')}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('empty.createFirst')}
            </Button>
          </RolePanel>
        ) : (
          invitations.map((invitation) => {
            const expired = isExpired(invitation.expiresAt)
            const used = invitation.currentUses >= invitation.maxUses

            return (
              <RolePanel
                key={invitation.id}
                className={expired || used ? 'p-4 opacity-70' : 'p-4'}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100">
                        {invitation.code}
                      </code>
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                        {getTypeLabel(invitation.type)}
                      </span>
                      {expired && (
                        <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                          {t('status.expired')}
                        </span>
                      )}
                      {used && !expired && (
                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                          {t('status.used')}
                        </span>
                      )}
                    </div>

                    {invitation.recipientName && (
                      <p className="text-sm text-zinc-700 dark:text-zinc-200">
                        <span className="text-zinc-500 dark:text-zinc-400">{t('recipientPrefix')}</span> {invitation.recipientName}
                        {invitation.recipientEmail && ` (${invitation.recipientEmail})`}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
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
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {t('usedBy', { name: invitation.usedByClient.name })}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2 self-end sm:self-start">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyInviteLink(invitation.code)}
                      disabled={expired || used}
                      aria-label={t('toasts.copiedTitle')}
                    >
                      {copiedId === invitation.code ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteInvitation(invitation.code)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      aria-label={t('toasts.deletedTitle')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </RolePanel>
            )
          })
        )}
      </div>
    </RolePageFrame>
  )
}
