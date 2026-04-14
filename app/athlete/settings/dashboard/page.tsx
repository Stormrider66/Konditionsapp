'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2, RotateCcw, LayoutDashboard, Lock } from 'lucide-react'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import {
  getAthleteWidgets,
  groupByCategory,
  CATEGORY_LABELS,
  type WidgetCategory,
  type WidgetDefinition,
} from '@/lib/dashboard/widget-registry'

interface PreferenceRow {
  widgetKey: string
  visible: boolean
  order: number
}

export default function DashboardSettingsPage() {
  const basePath = useBasePath()
  const allWidgets = useMemo(() => getAthleteWidgets(), [])
  const grouped = useMemo(() => groupByCategory(allWidgets), [allWidgets])

  // Build initial state from registry defaults — overridden by saved prefs after fetch.
  const buildDefaults = (): Record<string, boolean> => {
    const map: Record<string, boolean> = {}
    for (const w of allWidgets) map[w.key] = w.defaultVisible
    return map
  }

  const [visibility, setVisibility] = useState<Record<string, boolean>>(buildDefaults)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard/preferences?role=ATHLETE')
        if (res.ok) {
          const data = await res.json()
          const prefs: PreferenceRow[] = data.preferences ?? []
          if (prefs.length > 0) {
            setVisibility(prev => {
              const next = { ...prev }
              for (const p of prefs) next[p.widgetKey] = p.visible
              return next
            })
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard preferences', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  function toggle(widget: WidgetDefinition, value: boolean) {
    if (widget.required) return
    setVisibility(prev => ({ ...prev, [widget.key]: value }))
    setHasChanges(true)
    setSaveMessage(null)
  }

  async function save() {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const preferences = allWidgets.map((w, idx) => ({
        widgetKey: w.key,
        visible: w.required ? true : (visibility[w.key] ?? w.defaultVisible),
        order: w.defaultOrder + idx, // stable ordering until Phase 2 reorder UI
      }))

      const res = await fetch('/api/dashboard/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'ATHLETE', preferences }),
      })

      if (res.ok) {
        setHasChanges(false)
        setSaveMessage('Inställningar sparade!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage('Kunde inte spara inställningar')
      }
    } catch (err) {
      console.error('Failed to save dashboard preferences', err)
      setSaveMessage('Ett fel uppstod')
    } finally {
      setIsSaving(false)
    }
  }

  async function reset() {
    if (!confirm('Återställ alla widgets till standardinställningar?')) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/dashboard/preferences?role=ATHLETE', { method: 'DELETE' })
      if (res.ok) {
        setVisibility(buildDefaults())
        setHasChanges(false)
        setSaveMessage('Återställt till standardinställningar')
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (err) {
      console.error('Failed to reset dashboard preferences', err)
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

  const visibleCount = Object.values(visibility).filter(Boolean).length
  const totalCount = allWidgets.length

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${basePath}/athlete/settings`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Anpassa dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Välj vilka widgets du vill se på din dashboard ({visibleCount} av {totalCount} synliga)
          </p>
        </div>
      </div>

      {/* Widget groups */}
      {(Object.keys(grouped) as WidgetCategory[]).map(category => {
        const widgets = grouped[category]
        if (!widgets || widgets.length === 0) return null
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{CATEGORY_LABELS[category]}</CardTitle>
              <CardDescription>{widgets.length} widget{widgets.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {widgets.map(widget => (
                <div key={widget.key} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Label className="text-base font-medium flex items-center gap-2">
                      {widget.name}
                      {widget.required && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" /> krävs
                        </span>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground">{widget.description}</p>
                  </div>
                  <Switch
                    checked={widget.required ? true : (visibility[widget.key] ?? widget.defaultVisible)}
                    onCheckedChange={v => toggle(widget, v)}
                    disabled={widget.required}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}

      {/* Sticky save bar */}
      <div className="flex items-center justify-between sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={reset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Återställ
          </Button>
          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes('sparade') || saveMessage.includes('Återställt') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </p>
          )}
          {hasChanges && !saveMessage && (
            <p className="text-sm text-muted-foreground">Osparade ändringar</p>
          )}
        </div>
        <Button onClick={save} disabled={isSaving || !hasChanges}>
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
