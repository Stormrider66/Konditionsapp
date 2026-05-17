'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
import {
  getAthleteWidgets,
  PRESETS,
  type PresetKey,
  type WidgetCategory,
  type WidgetDefinition,
} from '@/lib/dashboard/widget-registry'
import { Sparkles } from 'lucide-react'
import type { SportType } from '@prisma/client'
import { useTranslations } from '@/i18n/client'

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

type SaveMessage = {
  tone: 'success' | 'error' | 'info'
  text: string
}

const PRESET_KEYS: Record<PresetKey, { name: string; description: string }> = {
  standard: { name: 'presets.standard.name', description: 'presets.standard.description' },
  minimal: { name: 'presets.minimal.name', description: 'presets.minimal.description' },
  performance: { name: 'presets.performance.name', description: 'presets.performance.description' },
  recovery: { name: 'presets.recovery.name', description: 'presets.recovery.description' },
  'sport-focus': { name: 'presets.sportFocus.name', description: 'presets.sportFocus.description' },
}

const CATEGORY_KEYS: Record<WidgetCategory, string> = {
  overview: 'categories.overview',
  training: 'categories.training',
  health: 'categories.health',
  'ai-insights': 'categories.aiInsights',
  nutrition: 'categories.nutrition',
  social: 'categories.social',
  'sport-specific': 'categories.sportSpecific',
  'coach-clients': 'categories.coachClients',
  'coach-team': 'categories.coachTeam',
  'coach-business': 'categories.coachBusiness',
}

interface DashboardSettingsPageProps {
  /** The athlete's currently active sport — used to make presets sport-aware. */
  currentSport?: SportType | null
}

export default function DashboardSettingsPage({ currentSport = null }: DashboardSettingsPageProps = {}) {
  const basePath = useBasePath()
  const t = useTranslations('pages.dashboardSettings')
  const allWidgets = useMemo(() => getAthleteWidgets(), [])

  // Build initial state from registry defaults — overridden by saved prefs after fetch.
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
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard/preferences?role=ATHLETE')
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
        console.error('Failed to load dashboard preferences', err)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  // Group widgets by category, preserving the current order within each group
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
    setWidgets(prev =>
      prev.map(w => (w.key === widget.key ? { ...w, visible: value } : w))
    )
    setHasChanges(true)
    setSaveMessage(null)
  }

  /**
   * Apply a preset by setting visibility to the preset's curated widget set.
   * Doesn't save automatically — user reviews and clicks Save.
   */
  function applyPreset(presetKey: PresetKey) {
    const preset = PRESETS[presetKey]
    if (!preset) return
    // Pass the athlete's current sport so sport-aware presets (e.g. sport-focus)
    // can curate the right widget set.
    const visibleSet = preset.resolve(allWidgets, currentSport)
    setWidgets(prev =>
      prev.map(w => ({
        ...w,
        visible: w.definition.required ? true : visibleSet.has(w.key),
      }))
    )
    setHasChanges(true)
    const presetName = t(PRESET_KEYS[presetKey].name)
    setSaveMessage({
      tone: 'info',
      text: t('messages.preview', { name: presetName }),
    })
  }

  /**
   * Move a widget up or down within its category. Swaps order values with
   * the previous/next visible-or-hidden widget in the same category.
   */
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
        body: JSON.stringify({ role: 'ATHLETE', preferences }),
      })

      if (res.ok) {
        setHasChanges(false)
        setSaveMessage({ tone: 'success', text: t('messages.saved') })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage({ tone: 'error', text: t('messages.saveError') })
      }
    } catch (err) {
      console.error('Failed to save dashboard preferences', err)
      setSaveMessage({ tone: 'error', text: t('messages.genericError') })
    } finally {
      setIsSaving(false)
    }
  }

  async function reset() {
    if (!confirm(t('confirmReset'))) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/dashboard/preferences?role=ATHLETE', { method: 'DELETE' })
      if (res.ok) {
        setWidgets(buildDefaults())
        setHasChanges(false)
        setSaveMessage({ tone: 'success', text: t('messages.reset') })
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

  const visibleCount = widgets.filter(w => w.visible).length
  const totalCount = widgets.length

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
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('subtitle', { visible: visibleCount, total: totalCount })}
          </p>
        </div>
      </div>

      {/* Sport-aware info */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{t('tip.title')}</strong> {t('tip.description')}
          </p>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {t('presetsTitle')}
          </CardTitle>
          <CardDescription>
            {t('presetsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(PRESETS) as PresetKey[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className="text-left p-3 rounded-lg border bg-card hover:bg-muted/40 transition"
            >
              <p className="font-medium">{t(PRESET_KEYS[key].name)}</p>
              <p className="text-xs text-muted-foreground">{t(PRESET_KEYS[key].description)}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Widget groups */}
      {(Object.keys(grouped) as WidgetCategory[]).map(category => {
        const items = grouped[category]
        if (!items || items.length === 0) return null
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{t(CATEGORY_KEYS[category])}</CardTitle>
              <CardDescription>
                {t('categoryDescription', { count: items.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((w, idx) => (
                <div
                  key={w.key}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {/* Reorder controls */}
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={() => move(w, 'up')}
                      aria-label={t('moveUp')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === items.length - 1}
                      onClick={() => move(w, 'down')}
                      aria-label={t('moveDown')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Widget info */}
                  <div className="flex-1 min-w-0">
                    <Label className="text-base font-medium flex items-center gap-2 flex-wrap">
                      {t(`widgets.${w.key}.name`)}
                      {w.definition.required && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" /> {t('required')}
                        </span>
                      )}
                      {w.definition.sports && w.definition.sports.length > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {currentSport && w.definition.sports.includes(currentSport)
                            ? t('sportVisibility.currentSport')
                            : t('sportVisibility.someSports')}
                        </span>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground">{t(`widgets.${w.key}.description`)}</p>
                  </div>

                  {/* Visibility toggle */}
                  <Switch
                    checked={w.definition.required ? true : w.visible}
                    onCheckedChange={v => toggle(w, v)}
                    disabled={w.definition.required}
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
            {t('actions.reset')}
          </Button>
          {saveMessage && (
            <p
              className={`text-sm ${
                saveMessage.tone === 'success'
                  ? 'text-green-600'
                  : saveMessage.tone === 'error'
                    ? 'text-red-600'
                    : 'text-muted-foreground'
              }`}
            >
              {saveMessage.text}
            </p>
          )}
          {hasChanges && !saveMessage && (
            <p className="text-sm text-muted-foreground">{t('unsavedChanges')}</p>
          )}
        </div>
        <Button onClick={save} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('actions.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('actions.save')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
