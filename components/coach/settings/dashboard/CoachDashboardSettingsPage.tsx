'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  CATEGORY_LABELS,
  type WidgetCategory,
  type WidgetDefinition,
} from '@/lib/dashboard/widget-registry'

type CoachMode = 'PT' | 'TEAM' | 'GYM'

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

  // Reload preferences whenever mode changes (different prefs per mode).
  useEffect(() => {
    setWidgets(buildDefaults())
    setIsLoading(true)
    setHasChanges(false)
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
    load()
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
        setSaveMessage('Inställningar sparade!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage('Kunde inte spara inställningar')
      }
    } catch (err) {
      console.error('Failed to save coach dashboard preferences', err)
      setSaveMessage('Ett fel uppstod')
    } finally {
      setIsSaving(false)
    }
  }

  async function reset() {
    if (!confirm('Återställ alla widgets till standardinställningar?')) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/dashboard/preferences?role=COACH&mode=${mode}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setWidgets(buildDefaults())
        setHasChanges(false)
        setSaveMessage('Återställt till standardinställningar')
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
      <div className="container max-w-3xl py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const visibleCount = widgets.filter(w => w.visible).length
  const totalCount = widgets.length

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${basePath}/coach/settings`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Anpassa dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            {visibleCount} av {totalCount} widgets synliga
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <GlassCard glow="blue">
        <GlassCardHeader>
          <GlassCardTitle className="text-base">Dashboard-läge</GlassCardTitle>
          <GlassCardDescription>
            Du har separata inställningar för varje läge. Byt här för att anpassa ett annat läge.
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <Select value={mode} onValueChange={v => setMode(v as CoachMode)}>
            <SelectTrigger className="w-full max-w-xs bg-white/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PT">PT (personlig tränare)</SelectItem>
              <SelectItem value="TEAM">Lag</SelectItem>
              <SelectItem value="GYM">Gym</SelectItem>
            </SelectContent>
          </Select>
        </GlassCardContent>
      </GlassCard>

      {/* Widget groups */}
      {(Object.keys(grouped) as WidgetCategory[]).map(category => {
        const items = grouped[category]
        if (!items || items.length === 0) return null
        return (
          <GlassCard key={category} glow="purple">
            <GlassCardHeader>
              <GlassCardTitle>{CATEGORY_LABELS[category]}</GlassCardTitle>
              <GlassCardDescription>
                {items.length} widget{items.length === 1 ? '' : 's'} {'\u2022'} ändra ordning med pilarna
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3">
              {items.map((w, idx) => (
                <div key={w.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-slate-100 dark:hover:bg-white/5"
                      disabled={idx === 0}
                      onClick={() => move(w, 'up')}
                      aria-label="Flytta upp"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-slate-100 dark:hover:bg-white/5"
                      disabled={idx === items.length - 1}
                      onClick={() => move(w, 'down')}
                      aria-label="Flytta ner"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-base font-medium flex items-center gap-2 text-slate-900 dark:text-white">
                      {w.definition.name}
                      {w.definition.required && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" /> krävs
                        </span>
                      )}
                    </Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{w.definition.description}</p>
                  </div>
                  <Switch
                    checked={w.definition.required ? true : w.visible}
                    onCheckedChange={v => toggle(w, v)}
                    disabled={w.definition.required}
                  />
                </div>
              ))}
            </GlassCardContent>
          </GlassCard>
        )
      })}

      {/* Sticky save bar */}
      <div className={cn(
        "flex items-center justify-between sticky bottom-4 p-4 rounded-2xl border transition-all backdrop-blur-md z-35",
        hasChanges 
          ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
          : "bg-white/80 dark:bg-black/50 border-slate-200/50 dark:border-white/10"
      )}>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={reset} disabled={isSaving} className="border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">
            <RotateCcw className="h-4 w-4 mr-2" />
            Återställ
          </Button>
          {saveMessage && (
            <p
              className={`text-sm font-semibold ${
                saveMessage.includes('sparade') || saveMessage.includes('Återställt')
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {saveMessage}
            </p>
          )}
          {hasChanges && !saveMessage && (
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Osparade ändringar</p>
          )}
        </div>
        <Button 
          onClick={save} 
          disabled={isSaving || !hasChanges}
          className={cn(
            "transition-all",
            hasChanges && "bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-650 dark:hover:bg-amber-700"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sparar...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Spara
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
