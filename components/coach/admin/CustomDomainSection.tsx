'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Globe, RefreshCw, ShieldCheck, Trash2, AlertCircle, Copy, Check } from 'lucide-react'
import { useBusinessAdminHeaders } from '@/components/coach/admin/BusinessAdminContext'

interface CustomDomainData {
  customDomain: string | null
  domainVerified: boolean
  domainTxtRecord: string | null
}

interface CustomDomainSectionProps {
  data: CustomDomainData
  /** Called after a successful add/verify/disconnect so the parent can refetch. */
  onChange: () => void
}

interface DnsInstructions {
  cname: { host: string; value: string }
  txt: { host: string; value: string }
}

function dnsInstructionsFor(domain: string, txtRecord: string): DnsInstructions {
  return {
    cname: { host: domain, value: 'cname.trainomics.app' },
    txt: { host: `_trainomics-verify.${domain}`, value: txtRecord },
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API blocked — silently ignore, value is already visible in the DOM
    }
  }
  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

export function CustomDomainSection({ data, onChange }: CustomDomainSectionProps) {
  const businessHeaders = useBusinessAdminHeaders()
  const [domainInput, setDomainInput] = useState('')
  const [busy, setBusy] = useState<'add' | 'verify' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)

  const isConfigured = !!data.customDomain
  const dnsRecords =
    data.customDomain && data.domainTxtRecord
      ? dnsInstructionsFor(data.customDomain, data.domainTxtRecord)
      : null

  const handleAdd = async () => {
    setBusy('add')
    setError(null)
    setVerifyMessage(null)
    try {
      const res = await fetch('/api/coach/admin/branding/custom-domain', {
        method: 'POST',
        headers: { ...businessHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim().toLowerCase() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Kunde inte spara domänen')
      }
      setDomainInput('')
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setBusy(null)
    }
  }

  const handleVerify = async () => {
    setBusy('verify')
    setError(null)
    setVerifyMessage(null)
    try {
      const res = await fetch('/api/coach/admin/branding/custom-domain', {
        method: 'PUT',
        headers: { ...businessHeaders, 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setVerifyMessage('Domänen är verifierad — det kan ta upp till 30 minuter innan SSL är aktivt.')
        onChange()
      } else {
        throw new Error(
          json.error ||
            'Vi hittar ingen TXT-post ännu. DNS kan ta upp till 30 min — försök igen.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifiering misslyckades')
    } finally {
      setBusy(null)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Ta bort den anpassade domänen? Du kan lägga till den igen senare.')) return
    setBusy('remove')
    setError(null)
    setVerifyMessage(null)
    try {
      const res = await fetch('/api/coach/admin/branding/custom-domain', {
        method: 'DELETE',
        headers: businessHeaders,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Kunde inte ta bort domänen')
      }
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">Anpassad domän</p>
            <p className="text-xs text-muted-foreground">
              Låt dina coacher och atleter logga in på din egen adress, t.ex. <code>coach.dingym.se</code>
            </p>
          </div>
        </div>
        {isConfigured && (
          <Badge variant={data.domainVerified ? 'default' : 'secondary'}>
            {data.domainVerified ? 'Verifierad' : 'Väntar på DNS'}
          </Badge>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {verifyMessage && (
        <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{verifyMessage}</span>
        </div>
      )}

      {!isConfigured ? (
        <div className="space-y-2">
          <Label htmlFor="customDomain">Domän</Label>
          <div className="flex gap-2">
            <Input
              id="customDomain"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="coach.dingym.se"
              disabled={busy !== null}
            />
            <Button onClick={handleAdd} disabled={busy !== null || domainInput.trim().length < 4}>
              {busy === 'add' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Lägg till'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ange en subdomän du redan äger. Vi visar de DNS-poster du behöver lägga till hos din
            registrar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium">{data.customDomain}</p>
            {dnsRecords && (
              <div className="mt-3 space-y-2 text-xs">
                <p className="font-medium">DNS-poster att lägga till hos din registrar:</p>
                <div className="space-y-1 rounded bg-background p-2 font-mono">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate">
                      <span className="text-muted-foreground">CNAME </span>
                      <span>{dnsRecords.cname.host}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span>{dnsRecords.cname.value}</span>
                    </div>
                    <CopyButton value={dnsRecords.cname.value} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate">
                      <span className="text-muted-foreground">TXT </span>
                      <span>{dnsRecords.txt.host}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span>{dnsRecords.txt.value}</span>
                    </div>
                    <CopyButton value={dnsRecords.txt.value} />
                  </div>
                </div>
                <p className="text-muted-foreground">
                  CNAME-posten gör att besökare når oss; TXT-posten är vad vi läser för att
                  bekräfta att du äger domänen.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!data.domainVerified && (
              <Button onClick={handleVerify} disabled={busy !== null}>
                {busy === 'verify' ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Kontrollerar DNS…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Verifiera nu
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={handleRemove} disabled={busy !== null}>
              {busy === 'remove' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Ta bort
                </>
              )}
            </Button>
          </div>

          {!data.domainVerified && (
            <p className="text-xs text-muted-foreground">
              När DNS-posterna har spridit sig (oftast 5–30 min) klickar du på <strong>Verifiera nu</strong>.
              Vi måste även lägga till domänen i Vercel — kontakta support om verifiering lyckas men
              sidan fortfarande inte laddar efter en timme.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
