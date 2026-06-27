'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  Loader2,
  RotateCcw,
  LayoutDashboard,
  Lock,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { cn } from '@/lib/utils'
import {
  getCoachWidgets,
  categoryLabel,
  widgetDescription,
  widgetDisplayName,
  type WidgetCategory,
  type WidgetDefinition,
} from '@/lib/dashboard/widget-registry'
import { useLocale } from 'next-intl'

type CoachMode = 'PT' | 'TEAM' | 'GYM'
type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface PreferenceRow {
  widgetKey: string
  visible: boolean
  order: number
}

interface WidgetState {
  key: string
  visible: boolean
  order: number
  definition: WidgetDefinition
}

export default function CoachDashboardSettingsPage() {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const basePath = useBasePath()
  const searchParams = useSearchParams()
  const initialMode = (searchParams.get('mode') as CoachMode) || 'PT'
  const [mode, setMode] = useState<CoachMode>(initialMode)

  const allWidgets = useMemo(() => getCoachWidgets(mode), [mode])

  const buildDefaults = (): WidgetState[] =>
    allWidgets.map(w => ({
      key: w.key,
      visible: w.defaultVisible,
      order: w.defaultOrder,
      definition: w,
    }))

  const [widgets, setWidgets] = useState<WidgetState[]>(buildDefaults)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveMessageType, setSaveMessageType] = useState<'success' | 'error' | null>(null)

  // Reload preferences whenever mode changes (different prefs per mode).
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/preferences?role=COACH&mode=${mode}`)
        if (res.ok) {
          const data = await res.json()
          const prefs: PreferenceRow[] = data.preferences ?? []
          if (prefs.length > 0) {
            const prefMap = new Map(prefs.map(p => [p.widgetKey, p]))
            setWidgets(prev =>
              prev
                .map(w => {
                  const p = prefMap.get(w.key)
                  return p ? { ...w, visible: p.visible, order: p.order } : w
                })
                .sort((a, b) => a.order - b.order)
            )
          }
        }
      } catch (err) {
        console.error('Failed to load coach dashboard preferences', err)
      } finally {
        setIsLoading(false)
      }
    }
    const timeout = window.setTimeout(() => {
      setWidgets(buildDefaults())
      setIsLoading(true)
      setHasChanges(false)
      void load()
    }, 0)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const grouped = useMemo(() => {
    const map: Partial<Record<WidgetCategory, WidgetState[]>> = {}
    for (const w of widgets) {
      const cat = w.definition.category
      if (!map[cat]) map[cat] = []
      map[cat]!.push(w)
    }
    return map
  }, [widgets])

  function toggle(widget: WidgetState, value: boolean) {
    if (widget.definition.required) return
    setWidgets(prev => prev.map(w => (w.key === widget.key ? { ...w, visible: value } : w)))
    setHasChanges(true)
    setSaveMessage(null)
    setSaveMessageType(null)
  }

  function move(widget: WidgetState, direction: 'up' | 'down') {
    const cat = widget.definition.category
    const inCategory = widgets.filter(w => w.definition.category === cat)
    const idx = inCategory.findIndex(w => w.key === widget.key)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= inCategory.length) return
    const a = inCategory[idx]
    const b = inCategory[swapIdx]
    setWidgets(prev =>
      prev
        .map(w => {
          if (w.key === a.key) return { ...w, order: b.order }
          if (w.key === b.key) return { ...w, order: a.order }
          return w
        })
        .sort((x, y) => x.order - y.order)
    )
    setHasChanges(true)
    setSaveMessage(null)
    setSaveMessageType(null)
  }

  async function save() {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const preferences = widgets.map(w => ({
        widgetKey: w.key,
        visible: w.definition.required ? true : w.visible,
        order: w.order,
      }))
      const res = await fetch('/api/dashboard/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'COACH', mode, preferences }),
      })
      if (res.ok) {
        setHasChanges(false)
        setSaveMessage(copy(locale, 'Settings saved!', 'Inställningar sparade!'))
        setSaveMessageType('success')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage(copy(locale, 'Could not save settings', 'Kunde inte spara inställningar'))
        setSaveMessageType('error')
      }
    } catch (err) {
      console.error('Failed to save coach dashboard preferences', err)
      setSaveMessage(copy(locale, 'An error occurred', 'Ett fel uppstod'))
      setSaveMessageType('error')
    } finally {
      setIsSaving(false)
    }
  }

  async function reset() {
    if (!confirm(copy(locale, 'Reset all widgets to default settings?', 'Återställ alla widgets till standardinställningar?'))) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/dashboard/preferences?role=COACH&mode=${mode}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setWidgets(buildDefaults())
        setHasChanges(false)
        setSaveMessage(copy(locale, 'Reset to default settings', 'Återställt till standardinställningar'))
        setSaveMessageType('success')
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (err) {
      console.error('Failed to reset coach dashboard preferences', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <RolePageFrame contentClassName="max-w-4xl">
        <RolePanel className="flex min-h-64 items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500 dark:text-zinc-400" />
        </RolePanel>
      </RolePageFrame>
    )
  }

  const visibleCount = widgets.filter(w => w.visible).length
  const totalCount = widgets.length

  return (
    <RolePageFrame contentClassName="max-w-4xl">
      <RolePageHeader
        eyebrow={copy(locale, 'Settings', 'Inställningar')}
        title={
          <span className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-zinc-500" />
            {copy(locale, 'Customize dashboard', 'Anpassa dashboard')}
          </span>
        }
        description={copy(locale, `${visibleCount} of ${totalCount} widgets visible`, `${visibleCount} av ${totalCount} widgets synliga`)}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/coach/settings`}>
              <ArrowLeft className="h-4 w-4" />
              {copy(locale, 'Settings', 'Inställningar')}
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <RolePanel className="p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Dashboard mode', 'Dashboard-läge')}</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {copy(locale, 'You have separate settings for each mode. Switch here to customize another mode.', 'Du har separata inställningar för varje läge. Byt här för att anpassa ett annat läge.')}
            </p>
          </div>
          <Select value={mode} onValueChange={v => setMode(v as CoachMode)}>
            <SelectTrigger className="w-full max-w-xs border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PT">{copy(locale, 'PT (personal trainer)', 'PT (personlig tränare)')}</SelectItem>
              <SelectItem value="TEAM">{copy(locale, 'Team', 'Lag')}</SelectItem>
              <SelectItem value="GYM">Gym</SelectItem>
            </SelectContent>
          </Select>
        </RolePanel>

        {(Object.keys(grouped) as WidgetCategory[]).map(category => {
          const items = grouped[category]
          if (!items || items.length === 0) return null
          return (
            <RolePanel key={category} className="p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{categoryLabel(category, locale)}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {copy(locale, `${items.length} widget${items.length === 1 ? '' : 's'} - reorder with the arrows`, `${items.length} widget${items.length === 1 ? '' : 's'} - ändra ordning med pilarna`)}
                </p>
              </div>
              <div className="space-y-3">
                {items.map((w, idx) => (
                  <div key={w.key} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors dark:border-white/10 dark:bg-zinc-950/60">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        disabled={idx === 0}
                        onClick={() => move(w, 'up')}
                        aria-label={copy(locale, 'Move up', 'Flytta upp')}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        disabled={idx === items.length - 1}
                        onClick={() => move(w, 'down')}
                        aria-label={copy(locale, 'Move down', 'Flytta ner')}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label className="flex items-center gap-2 text-base font-medium text-zinc-950 dark:text-zinc-50">
                        {widgetDisplayName(w.definition, locale)}
                        {w.definition.required && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                            <Lock className="h-3 w-3" /> {copy(locale, 'required', 'krävs')}
                          </span>
                        )}
                      </Label>
                      <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                        {widgetDescription(w.definition, locale)}
                      </p>
                    </div>
                    <Switch
                      checked={w.definition.required ? true : w.visible}
                      onCheckedChange={v => toggle(w, v)}
                      disabled={w.definition.required}
                    />
                  </div>
                ))}
              </div>
            </RolePanel>
          )
        })}

        <div className={cn(
          'sticky bottom-4 z-35 flex flex-col gap-3 rounded-lg border p-4 shadow-lg transition-colors sm:flex-row sm:items-center sm:justify-between',
          hasChanges
            ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30'
            : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950'
        )}>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={reset} disabled={isSaving}>
              <RotateCcw className="h-4 w-4" />
              {copy(locale, 'Reset', 'Återställ')}
            </Button>
            {saveMessage && (
              <p
                className={cn(
                  'text-sm font-semibold',
                  saveMessageType === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {saveMessage}
              </p>
            )}
            {hasChanges && !saveMessage && (
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {copy(locale, 'Unsaved changes', 'Osparade ändringar')}
              </p>
            )}
          </div>
          <Button
            onClick={save}
            disabled={isSaving || !hasChanges}
            className={cn(
              'transition-colors',
              hasChanges && 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy(locale, 'Saving...', 'Sparar...')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {copy(locale, 'Save', 'Spara')}
              </>
            )}
          </Button>
        </div>
      </div>
    </RolePageFrame>
  )
}
