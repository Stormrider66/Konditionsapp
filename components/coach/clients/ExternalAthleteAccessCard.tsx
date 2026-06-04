'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, LockKeyhole, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/client'

interface ExternalAccessGrant {
  id: string
  viewerName: string | null
  viewerEmail: string | null
  organizationName: string | null
  organizationType: string | null
  roleLabel: string | null
  status: 'active' | 'expired' | 'revoked'
  expiresAt: string | null
  lastViewedAt: string | null
  viewCount: number
  createdAt: string
}

interface ExternalAthleteAccessCardProps {
  clientId: string
  clientName: string
}

function label(locale: string, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function formatDate(value: string | null, locale: string) {
  if (!value) return label(locale, 'No expiry', 'Inget slutdatum')
  return new Date(value).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ExternalAthleteAccessCard({
  clientId,
  clientName,
}: ExternalAthleteAccessCardProps) {
  const locale = useLocale()
  const { toast } = useToast()
  const [grants, setGrants] = useState<ExternalAccessGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    viewerName: '',
    viewerEmail: '',
    organizationName: '',
    organizationType: '',
    roleLabel: '',
    expiresAt: '',
    note: '',
  })

  const activeGrants = grants.filter((grant) => grant.status === 'active')

  const loadGrants = useCallback(async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/external-access`)
      const data = await response.json()
      setGrants(response.ok ? data.externalAccess || [] : [])
    } catch {
      setGrants([])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadGrants()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadGrants])

  async function createGrant() {
    setCreating(true)
    setShareUrl(null)
    try {
      const response = await fetch(`/api/clients/${clientId}/external-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewerName: form.viewerName,
          viewerEmail: form.viewerEmail,
          organizationName: form.organizationName,
          organizationType: form.organizationType,
          roleLabel: form.roleLabel,
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T12:00:00.000Z`).toISOString() : undefined,
          note: form.note,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create access')
      }

      setShareUrl(data.shareUrl)
      setForm({
        viewerName: '',
        viewerEmail: '',
        organizationName: '',
        organizationType: '',
        roleLabel: '',
        expiresAt: '',
        note: '',
      })
      await loadGrants()
      toast({
        title: label(locale, 'Player access created', 'Spelarlänk skapad'),
        description: label(locale, 'Copy the link and send it to the external staff member.', 'Kopiera länken och skicka den till extern personal.'),
      })
    } catch (error) {
      toast({
        title: label(locale, 'Could not create link', 'Kunde inte skapa länk'),
        description: error instanceof Error ? error.message : label(locale, 'Try again shortly.', 'Försök igen strax.'),
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  async function revokeGrant(grantId: string) {
    setRevokingId(grantId)
    try {
      const response = await fetch(`/api/clients/${clientId}/external-access/${grantId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke access')
      }
      await loadGrants()
      toast({
        title: label(locale, 'Access revoked', 'Åtkomst återkallad'),
        description: label(locale, 'The external link no longer works.', 'Den externa länken fungerar inte längre.'),
      })
    } catch (error) {
      toast({
        title: label(locale, 'Could not revoke access', 'Kunde inte återkalla åtkomst'),
        description: error instanceof Error ? error.message : label(locale, 'Try again shortly.', 'Försök igen strax.'),
        variant: 'destructive',
      })
    } finally {
      setRevokingId(null)
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      toast({
        title: label(locale, 'Link copied', 'Länk kopierad'),
        description: label(locale, 'Ready to send.', 'Redo att skickas.'),
      })
    } catch {
      toast({
        title: label(locale, 'Could not copy link', 'Kunde inte kopiera länk'),
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-md dark:border dark:border-white/10 dark:bg-slate-900/50 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold dark:text-white">
              {label(locale, 'External staff access', 'Extern personalåtkomst')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {label(locale, 'Share this athlete’s calendar, workouts, and tests only.', 'Dela endast denna aktives kalender, pass och tester.')}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3 text-sm dark:border-white/10">
          <p className="font-medium text-gray-900 dark:text-white">
            {activeGrants.length} {label(locale, 'active link(s)', 'aktiva länk(ar)')}
          </p>
          <p className="mt-1 text-muted-foreground">
            {label(locale, 'Read-only, athlete-scoped access.', 'Läsbar åtkomst begränsad till aktiv.')}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setShareUrl(null)
            setCopied(false)
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {label(locale, 'Create external link', 'Skapa extern länk')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {label(locale, 'External player access', 'Extern spelaråtkomst')}
              </DialogTitle>
              <DialogDescription>
                {label(locale, `Create a read-only link for ${clientName}.`, `Skapa en läsbar länk för ${clientName}.`)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2 sm:grid-cols-2">
              <Input
                placeholder={label(locale, 'Viewer name', 'Mottagarens namn')}
                value={form.viewerName}
                onChange={(event) => setForm((current) => ({ ...current, viewerName: event.target.value }))}
              />
              <Input
                type="email"
                placeholder={label(locale, 'Viewer email', 'Mottagarens e-post')}
                value={form.viewerEmail}
                onChange={(event) => setForm((current) => ({ ...current, viewerEmail: event.target.value }))}
              />
              <Input
                placeholder={label(locale, 'Organization', 'Organisation')}
                value={form.organizationName}
                onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value }))}
              />
              <Input
                placeholder={label(locale, 'Role', 'Roll')}
                value={form.roleLabel}
                onChange={(event) => setForm((current) => ({ ...current, roleLabel: event.target.value }))}
              />
              <Input
                placeholder={label(locale, 'Organization type', 'Organisationstyp')}
                value={form.organizationType}
                onChange={(event) => setForm((current) => ({ ...current, organizationType: event.target.value }))}
              />
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
              />
              <Textarea
                className="sm:col-span-2"
                placeholder={label(locale, 'Internal note', 'Intern notering')}
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </div>

            {shareUrl ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                <p className="font-medium">{label(locale, 'Link ready', 'Länken är klar')}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate rounded-md border border-emerald-200 bg-white px-3 py-2">
                    {shareUrl}
                  </div>
                  <Button type="button" size="icon" variant="outline" onClick={copyShareUrl} aria-label={label(locale, 'Copy link', 'Kopiera länk')}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button type="button" size="icon" variant="outline" asChild aria-label={label(locale, 'Open link', 'Öppna länk')}>
                    <a href={shareUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" onClick={createGrant} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {label(locale, 'Create link', 'Skapa länk')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {label(locale, 'Loading links', 'Hämtar länkar')}
          </div>
        ) : activeGrants.length ? (
          <div className="space-y-2">
            {activeGrants.slice(0, 3).map((grant) => (
              <div key={grant.id} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-white">
                      {grant.organizationName || grant.viewerName || label(locale, 'External staff', 'Extern personal')}
                    </p>
                    <p className="mt-1 truncate text-muted-foreground">
                      {grant.roleLabel || grant.viewerEmail || label(locale, 'Calendar + workouts + tests', 'Kalender + pass + tester')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {label(locale, 'Expires', 'Går ut')}: {formatDate(grant.expiresAt, locale)}
                      {grant.lastViewedAt ? ` · ${label(locale, 'Views', 'Visningar')}: ${grant.viewCount}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => revokeGrant(grant.id)}
                    disabled={revokingId === grant.id}
                    aria-label={label(locale, 'Revoke access', 'Återkalla åtkomst')}
                  >
                    {revokingId === grant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-muted-foreground dark:border-white/10">
            {label(locale, 'No active external links.', 'Inga aktiva externa länkar.')}
          </p>
        )}
      </div>
    </div>
  )
}
