'use client'

/**
 * Coach Athlete Dashboard Templates Editor
 *
 * Lets coaches define which widgets appear on their athletes' dashboards.
 *
 * Three scopes:
 *  - Business default: applies to all athletes in the business without a more specific template
 *  - Per team:         applies to all members of a team
 *  - Per athlete:      applies to one specific athlete
 *
 * Resolution precedence (handled in lib/dashboard/resolve-widgets.ts):
 *   athlete's own pref > individual template > team template > business default > registry default
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Lock,
  ChevronUp,
  ChevronDown,
  Users,
  User,
  Building2,
  Trash2,
} from 'lucide-react'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import {
  getAthleteWidgets,
  categoryLabel,
  widgetDescription,
  widgetDisplayName,
  type WidgetCategory,
  type WidgetDefinition,
} from '@/lib/dashboard/widget-registry'
import { useLocale } from '@/i18n/client'

export interface AthleteDashboardTemplatesClientProps {
  businessId: string
}

type Scope = 'BUSINESS_DEFAULT' | 'TEAM' | 'INDIVIDUAL'
type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface Team {
  id: string
  name: string
  sport: string | null
  memberCount: number
}

interface Athlete {
  id: string
  name: string
  sport: string | null
}

interface TemplateRow {
  id: string
  name: string
  scope: Scope
  targetId: string | null
  sport: string | null
  widgets: Array<{ widgetKey: string; visible: boolean; order: number }>
}

interface WidgetState {
  key: string
  visible: boolean
  order: number
  definition: WidgetDefinition
}

export default function AthleteDashboardTemplatesClient({
  businessId,
}: AthleteDashboardTemplatesClientProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const basePath = useBasePath()
  const allWidgets = useMemo(() => getAthleteWidgets(), [])

  const [scope, setScope] = useState<Scope>('BUSINESS_DEFAULT')
  const [targetId, setTargetId] = useState<string>('')
  const [templateName, setTemplateName] = useState<string>('Standard')
  const [teams, setTeams] = useState<Team[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])

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
  const [saveMessage, setSaveMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null)

  // Initial load: targets + existing templates
  useEffect(() => {
    async function load() {
      try {
        const [targetsRes, templatesRes] = await Promise.all([
          fetch(`/api/coach/dashboard-templates/targets?businessId=${businessId}`),
          fetch(`/api/coach/dashboard-templates?businessId=${businessId}`),
        ])
        if (targetsRes.ok) {
          const data = await targetsRes.json()
          setTeams(data.teams ?? [])
          setAthletes(data.athletes ?? [])
        }
        if (templatesRes.ok) {
          const data = await templatesRes.json()
          setTemplates(data.templates ?? [])
        }
      } catch (err) {
        console.error('Failed to load templates / targets', err)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [businessId])

  // Find the existing template that matches current scope + targetId
  const currentTemplate = useMemo(() => {
    return (
      templates.find(
        t =>
          t.scope === scope &&
          (t.targetId ?? '') === (scope === 'BUSINESS_DEFAULT' ? '' : targetId)
      ) ?? null
    )
  }, [templates, scope, targetId])

  // When the active template changes, hydrate widget state
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const fresh = buildDefaults()
      if (currentTemplate) {
        setTemplateName(currentTemplate.name)
        const map = new Map(currentTemplate.widgets.map(w => [w.widgetKey, w]))
        setWidgets(
          fresh
            .map(w => {
              const t = map.get(w.key)
              return t ? { ...w, visible: t.visible, order: t.order } : w
            })
            .sort((a, b) => a.order - b.order)
        )
      } else {
        setTemplateName(scope === 'BUSINESS_DEFAULT' ? 'Standard' : '')
        setWidgets(fresh)
      }
      setHasChanges(false)
      setSaveMessage(null)
    }, 0)

    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, targetId, currentTemplate?.id])

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
  }

  async function save() {
    if (scope !== 'BUSINESS_DEFAULT' && !targetId) {
      setSaveMessage({ text: copy(locale, 'Select a target first', 'Välj ett mål först'), tone: 'error' })
      return
    }
    if (!templateName.trim()) {
      setSaveMessage({ text: copy(locale, 'Give the template a name', 'Ge mallen ett namn'), tone: 'error' })
      return
    }
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const body = {
        name: templateName.trim(),
        scope,
        targetId: scope === 'BUSINESS_DEFAULT' ? null : targetId,
        sport: null,
        widgets: widgets.map(w => ({
          widgetKey: w.key,
          visible: w.definition.required ? true : w.visible,
          order: w.order,
        })),
      }
      const res = await fetch(`/api/coach/dashboard-templates?businessId=${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setTemplates(prev => {
          const filtered = prev.filter(t => t.id !== data.template.id)
          return [...filtered, data.template]
        })
        setHasChanges(false)
        setSaveMessage({ text: copy(locale, 'Template saved!', 'Mall sparad!'), tone: 'success' })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveMessage({ text: err.error ?? copy(locale, 'Could not save template', 'Kunde inte spara mall'), tone: 'error' })
      }
    } catch (err) {
      console.error('Failed to save template', err)
      setSaveMessage({ text: copy(locale, 'An error occurred', 'Ett fel uppstod'), tone: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!currentTemplate) return
    if (!confirm(copy(locale, `Delete the template "${currentTemplate.name}"?`, `Ta bort mallen "${currentTemplate.name}"?`))) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/coach/dashboard-templates/${currentTemplate.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== currentTemplate.id))
        setSaveMessage({ text: copy(locale, 'Template deleted', 'Mall borttagen'), tone: 'success' })
        setWidgets(buildDefaults())
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (err) {
      console.error('Failed to delete template', err)
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

  const targetOptions =
    scope === 'TEAM'
      ? teams.map(t => ({ value: t.id, label: `${t.name} (${t.memberCount} ${copy(locale, 'members', 'medlemmar')})` }))
      : scope === 'INDIVIDUAL'
        ? athletes.map(a => ({ value: a.id, label: a.name }))
        : []

  // Affected athletes count helper text
  const affectedCount =
    scope === 'BUSINESS_DEFAULT'
      ? athletes.length
      : scope === 'TEAM'
        ? teams.find(t => t.id === targetId)?.memberCount ?? 0
        : targetId
          ? 1
          : 0

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`${basePath}/coach/settings`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {copy(locale, 'Athlete dashboard templates', 'Atleternas dashboard-mallar')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {copy(
              locale,
              'Choose which widgets appear on your athletes dashboards. Athletes can always override your settings.',
              'Bestäm vilka widgets som ska visas på dina atleters dashboards. Atleten kan alltid välja att åsidosätta dina inställningar.'
            )}
          </p>
        </div>
      </div>

      {/* Scope tabs */}
      <Tabs value={scope} onValueChange={v => { setScope(v as Scope); setTargetId('') }}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="BUSINESS_DEFAULT" className="gap-2">
            <Building2 className="h-4 w-4" /> {copy(locale, 'Default', 'Standard')}
          </TabsTrigger>
          <TabsTrigger value="TEAM" className="gap-2">
            <Users className="h-4 w-4" /> {copy(locale, 'By team', 'Per lag')}
          </TabsTrigger>
          <TabsTrigger value="INDIVIDUAL" className="gap-2">
            <User className="h-4 w-4" /> {copy(locale, 'By athlete', 'Per atlet')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="BUSINESS_DEFAULT" className="mt-4">
          <GlassCard glow="blue">
            <GlassCardHeader>
              <GlassCardTitle className="text-base">{copy(locale, 'Business default template', 'Standardmall för verksamheten')}</GlassCardTitle>
              <GlassCardDescription>
                {copy(
                  locale,
                  `Applies to all athletes in the business without a more specific template (team or individual). Affects ${affectedCount} athlete${affectedCount === 1 ? '' : 's'}.`,
                  `Gäller alla atleter i verksamheten som inte har en mer specifik mall (lag eller individ). Påverkar ${affectedCount} atlet${affectedCount === 1 ? '' : 'er'}.`
                )}
              </GlassCardDescription>
            </GlassCardHeader>
          </GlassCard>
        </TabsContent>

        <TabsContent value="TEAM" className="mt-4">
          <GlassCard glow="purple">
            <GlassCardHeader>
              <GlassCardTitle className="text-base">{copy(locale, 'By team', 'Per lag')}</GlassCardTitle>
              <GlassCardDescription>
                {copy(locale, 'Useful for team coaches: one template applies to all team members.', 'Bra för lagcoacher: en mall gäller alla lagets medlemmar.')}
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="w-full bg-white/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10">
                  <SelectValue placeholder={teams.length === 0 ? copy(locale, 'No teams found', 'Inga lag funna') : copy(locale, 'Select team', 'Välj lag')} />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetId && (
                <p className="text-xs text-slate-500 mt-2">
                  {copy(locale, `Affects ${affectedCount} athlete${affectedCount === 1 ? '' : 's'}.`, `Påverkar ${affectedCount} atlet${affectedCount === 1 ? '' : 'er'}.`)}
                </p>
              )}
            </GlassCardContent>
          </GlassCard>
        </TabsContent>

        <TabsContent value="INDIVIDUAL" className="mt-4">
          <GlassCard glow="emerald">
            <GlassCardHeader>
              <GlassCardTitle className="text-base">{copy(locale, 'By athlete', 'Per atlet')}</GlassCardTitle>
              <GlassCardDescription>
                {copy(locale, 'Useful for PT coaches: tailor one specific athlete dashboard.', 'Bra för PT-coacher: skräddarsy en specifik atlets dashboard.')}
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="w-full bg-white/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10">
                  <SelectValue placeholder={athletes.length === 0 ? copy(locale, 'No athletes found', 'Inga atleter funna') : copy(locale, 'Select athlete', 'Välj atlet')} />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </GlassCardContent>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Template name */}
      {(scope === 'BUSINESS_DEFAULT' || targetId) && (
        <GlassCard glow="blue">
          <GlassCardHeader>
            <GlassCardTitle className="text-base">{copy(locale, 'Template name', 'Mallnamn')}</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <Input
              value={templateName}
              onChange={e => { setTemplateName(e.target.value); setHasChanges(true) }}
              placeholder={copy(locale, "e.g. 'Hockey U18 focus' or 'Default template'", "t.ex. 'Hockey U18 fokus' eller 'Standardmall'")}
              className="bg-white/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10 focus:ring-blue-500 focus:border-blue-500"
            />
            {currentTemplate && (
              <p className="text-xs text-slate-500 mt-2">
                {copy(locale, 'Editing existing template - changes apply after saving.', 'Redigerar befintlig mall — ändringar gäller från sparning.')}
              </p>
            )}
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Widget editor — only shown when a target is selected (or business default) */}
      {(scope === 'BUSINESS_DEFAULT' || targetId) && (
        <>
          {(Object.keys(grouped) as WidgetCategory[]).map(category => {
            const items = grouped[category]
            if (!items || items.length === 0) return null
            return (
              <GlassCard key={category} glow="purple">
                <GlassCardHeader>
                  <GlassCardTitle>{categoryLabel(category, locale)}</GlassCardTitle>
                  <GlassCardDescription>
                    {items.length} widget{items.length === 1 ? '' : 's'}
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-3">
                  {items.map((w, idx) => (
                    <div
                      key={w.key}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md"
                    >
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-slate-100 dark:hover:bg-white/5"
                          disabled={idx === 0}
                          onClick={() => move(w, 'up')}
                          aria-label={copy(locale, 'Move up', 'Flytta upp')}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-slate-100 dark:hover:bg-white/5"
                          disabled={idx === items.length - 1}
                          onClick={() => move(w, 'down')}
                          aria-label={copy(locale, 'Move down', 'Flytta ner')}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-base font-medium flex items-center gap-2 text-slate-900 dark:text-white">
                          {widgetDisplayName(w.definition, locale)}
                          {w.definition.required && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Lock className="h-3 w-3" /> {copy(locale, 'required', 'krävs')}
                            </span>
                          )}
                        </Label>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                </GlassCardContent>
              </GlassCard>
            )
          })}

          {/* Save bar */}
          <div className={cn(
            "flex items-center justify-between sticky bottom-4 p-4 rounded-2xl border transition-all backdrop-blur-md z-35",
            hasChanges 
              ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
              : "bg-white/80 dark:bg-black/50 border-slate-200/50 dark:border-white/10"
          )}>
            <div className="flex items-center gap-3">
              {currentTemplate && (
                <Button variant="outline" size="sm" onClick={remove} disabled={isSaving} className="border-slate-200 dark:border-white/10 text-red-500 hover:text-red-650 hover:bg-red-500/10 transition-all">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {copy(locale, 'Delete template', 'Ta bort mall')}
                </Button>
              )}
              {saveMessage && (
                <p
                  className={`text-sm font-semibold ${
                    saveMessage.tone === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {saveMessage.text}
                </p>
              )}
              {hasChanges && !saveMessage && (
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{copy(locale, 'Unsaved changes', 'Osparade ändringar')}</p>
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
                  {copy(locale, 'Saving...', 'Sparar...')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {currentTemplate ? copy(locale, 'Update template', 'Uppdatera mall') : copy(locale, 'Create template', 'Skapa mall')}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
