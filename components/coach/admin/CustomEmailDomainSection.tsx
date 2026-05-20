'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  AtSign,
  Check,
  Copy,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import { useBusinessAdminHeaders } from '@/components/coach/admin/BusinessAdminContext'

interface DnsRecord {
  record: string
  name: string
  type: string
  value: string
  ttl?: string
  status?: string
}

interface CustomEmailDomainData {
  customEmailDomain: string | null
  customEmailVerified: boolean
  customEmailVerifiedAt: string | null
  customEmailDnsRecords: DnsRecord[] | null
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked — visible value still works as copy fallback
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2 flex-shrink-0"
      aria-label="Copy value"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

export function CustomEmailDomainSection() {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = useCallback((en: string, sv: string) => locale === 'sv' ? sv : en, [locale])
  const businessHeaders = useBusinessAdminHeaders()
  const [data, setData] = useState<CustomEmailDomainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [domainInput, setDomainInput] = useState('')
  const [busy, setBusy] = useState<'add' | 'refresh' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/admin/branding/custom-email-domain', {
        headers: businessHeaders,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || copy('Could not load domain status', 'Kunde inte hämta domänstatus'))
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy('Something went wrong', 'Något gick fel'))
    } finally {
      setLoading(false)
    }
  }, [businessHeaders, copy])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleAdd = async () => {
    setBusy('add')
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/coach/admin/branding/custom-email-domain', {
        method: 'POST',
        headers: { ...businessHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim().toLowerCase() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || copy('Could not save the domain', 'Kunde inte spara domänen'))
      setData(json.data)
      setDomainInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : copy('Something went wrong', 'Något gick fel'))
    } finally {
      setBusy(null)
    }
  }

  const handleRefresh = async () => {
    setBusy('refresh')
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/coach/admin/branding/custom-email-domain', {
        method: 'PUT',
        headers: businessHeaders,
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || copy('Could not update status', 'Kunde inte uppdatera status'))
      }
      setData(json.data)
      if (json.data.customEmailVerified) {
        setInfo(copy('The domain is verified. Emails now send from your sender address.', 'Domänen är verifierad — utskick går nu från din avsändaradress.'))
      } else {
        setInfo(
          copy('Resend cannot see all DNS records yet. DKIM can take up to an hour to propagate.', 'Resend ser inte alla DNS-poster ännu. DKIM kan ta upp till en timme att spridas.'),
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy('Something went wrong', 'Något gick fel'))
    } finally {
      setBusy(null)
    }
  }

  const handleRemove = async () => {
    if (
      !confirm(
        copy('Remove the custom sender domain? Emails will go back to noreply@trainomics.app.', 'Ta bort den anpassade avsändardomänen? Utskick går då tillbaka till noreply@trainomics.app.'),
      )
    ) {
      return
    }
    setBusy('remove')
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/coach/admin/branding/custom-email-domain', {
        method: 'DELETE',
        headers: businessHeaders,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || copy('Could not remove the domain', 'Kunde inte ta bort domänen'))
      }
      setData({
        customEmailDomain: null,
        customEmailVerified: false,
        customEmailVerifiedAt: null,
        customEmailDnsRecords: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : copy('Something went wrong', 'Något gick fel'))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {copy('Loading sender status...', 'Laddar avsändarstatus…')}
        </div>
      </div>
    )
  }

  const isConfigured = !!data?.customEmailDomain
  const records = data?.customEmailDnsRecords ?? []

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AtSign className="h-5 w-5 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{copy('Custom sender address', 'Egen avsändaradress')}</p>
            <p className="text-xs text-muted-foreground">
              {copy('Sends emails from', 'Skickar utskick från')} <code>noreply@yourdomain.com</code> {copy('instead of', 'i stället för')}{' '}
              <code>noreply@trainomics.app</code>. {copy('Requires DKIM verification with your DNS provider.', 'Kräver DKIM-verifiering hos din DNS-leverantör.')}
            </p>
          </div>
        </div>
        {isConfigured && (
          <Badge variant={data?.customEmailVerified ? 'default' : 'secondary'}>
            {data?.customEmailVerified ? copy('Verified', 'Verifierad') : copy('Waiting for DNS', 'Väntar på DNS')}
          </Badge>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {info && (
        <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{info}</span>
        </div>
      )}

      {!isConfigured ? (
        <div className="space-y-2">
          <Label htmlFor="customEmailDomain">{copy('Domain', 'Domän')}</Label>
          <div className="flex gap-2">
            <Input
              id="customEmailDomain"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="dingym.se"
              disabled={busy !== null}
            />
            <Button onClick={handleAdd} disabled={busy !== null || domainInput.trim().length < 4}>
              {busy === 'add' ? <RefreshCw className="h-4 w-4 animate-spin" /> : copy('Add', 'Lägg till')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {copy(
              'Use your own domain. We create DKIM and SPF records you need to add at your registrar so receiving mail servers can trust the sender.',
              'Använd din egen domän. Vi skapar DKIM- och SPF-poster du behöver lägga till hos din registrar — det är så mottagande mailservrar litar på att du är vi.',
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium">{data?.customEmailDomain}</p>
            {records.length > 0 && (
              <div className="mt-3 space-y-2 text-xs">
                <p className="font-medium">DNS-poster:</p>
                <div className="space-y-1 rounded bg-background p-2 font-mono">
                  {records.map((rec, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate">
                          <span className="text-muted-foreground">{rec.type} </span>
                          <span>{rec.name}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span className="break-all">{rec.value}</span>
                        </div>
                        {rec.status && rec.status !== 'verified' && (
                          <span className="text-amber-600 dark:text-amber-400">
                            ({rec.status})
                          </span>
                        )}
                      </div>
                      <CopyButton value={rec.value} />
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  {copy('Add all records at your DNS provider. When they are active, click', 'Lägg in alla poster hos din DNS-leverantör. När alla är aktiva klickar du på')}{' '}
                  <strong>{copy('Update status', 'Uppdatera status')}</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRefresh} disabled={busy !== null}>
              {busy === 'refresh' ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> {copy('Checking...', 'Kontrollerar…')}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> {copy('Update status', 'Uppdatera status')}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleRemove} disabled={busy !== null}>
              {busy === 'remove' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> {copy('Remove', 'Ta bort')}
                </>
              )}
            </Button>
          </div>

          {!data?.customEmailVerified && (
            <p className="text-xs text-muted-foreground">
              {copy('Until the domain is verified, emails continue to send from', 'Tills domänen är verifierad fortsätter utskick gå från')}
              <code> noreply@trainomics.app</code>. {copy('No interruptions.', 'Inga avbrott.')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
