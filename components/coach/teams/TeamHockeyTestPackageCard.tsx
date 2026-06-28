'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface PackageItem {
  id: string
  metricKey: string
  label: string
  unit: string
  category: string
  lowerIsBetter?: boolean
  linkedExerciseId?: string | null
  linkedExerciseName?: string | null
  aliases: string[]
  enabled: boolean
  notes?: string | null
}

interface HockeyTestPackage {
  version: 1
  name: string
  items: PackageItem[]
}

interface TeamHockeyTestPackageCardProps {
  teamId: string
  businessSlug?: string
}

function packageUrl(teamId: string, businessSlug?: string) {
  return `/api/teams/${teamId}/hockey-test-package${businessSlug ? `?businessSlug=${encodeURIComponent(businessSlug)}` : ''}`
}

export function TeamHockeyTestPackageCard({ teamId, businessSlug }: TeamHockeyTestPackageCardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [testPackage, setTestPackage] = useState<HockeyTestPackage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(packageUrl(teamId, businessSlug))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (!cancelled) setTestPackage(body.package)
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : copy(locale, 'Could not fetch test package', 'Kunde inte hämta testpaket'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [businessSlug, locale, teamId])

  const enabledCount = useMemo(
    () => testPackage?.items.filter((item) => item.enabled).length ?? 0,
    [testPackage]
  )

  const updateItem = (itemId: string, patch: Partial<PackageItem>) => {
    setTestPackage((current) => {
      if (!current) return current
      return {
        ...current,
        items: current.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
      }
    })
  }

  const save = async () => {
    if (!testPackage) return
    setIsSaving(true)
    try {
      const res = await fetch(packageUrl(teamId, businessSlug), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: testPackage }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const body = await res.json()
      setTestPackage(body.package)
      toast.success(copy(locale, 'Hockey test package saved', 'Hockeytestpaket sparat'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy(locale, 'Could not save test package', 'Kunde inte spara testpaket'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="bg-muted/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              {copy(locale, 'Hockey test package', 'Hockeytestpaket')}
            </CardTitle>
            <CardDescription className="text-xs">
              {copy(locale, 'Control which tests appear in manual entry and how names/aliases map to hockey analysis and PR history.', 'Styr vilka tester som visas i manuell inmatning och hur namn/alias kopplas till hockeyanalys och PR-historik.')}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={save} disabled={!testPackage || isSaving || isLoading}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {copy(locale, 'Save package', 'Spara paket')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy(locale, 'Fetching test package...', 'Hämtar testpaket...')}
          </div>
        )}

        {testPackage && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{enabledCount} {copy(locale, 'active tests', 'aktiva tester')}</Badge>
              <span>{copy(locale, 'Aliases are used for import and to avoid mixing up tests such as power clean and hang clean.', 'Alias används för import och för att undvika att t.ex. power clean blandas ihop med hang clean.')}</span>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {testPackage.items.map((item) => (
                <div key={item.id} className="rounded-md border bg-background p-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2 text-sm font-medium">
                      <Checkbox
                        checked={item.enabled}
                        onCheckedChange={(checked) => updateItem(item.id, { enabled: checked === true })}
                      />
                      <span>
                        {item.label}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">({item.unit})</span>
                      </span>
                    </label>
                    <Badge variant="outline" className="text-[10px] uppercase">{item.category}</Badge>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Alias</Label>
                    <Input
                      value={item.aliases.join(', ')}
                      onChange={(event) => updateItem(item.id, {
                        aliases: event.target.value.split(',').map((alias) => alias.trim()).filter(Boolean),
                      })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    {copy(locale, 'PR link', 'PR-koppling')}: {item.linkedExerciseName ?? copy(locale, 'no linked strength exercise', 'ingen kopplad styrkeövning')}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
