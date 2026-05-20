'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IceHockeyRink, type DrillStructure } from './IceHockeyRink'
import { DrillTemplateLibrary } from './DrillTemplateLibrary'
import type { DrillTemplate } from '@/lib/drills/templates'
import {
  Plus,
  Trash2,
  Clock,
  Save,
  ChevronDown,
  ChevronUp,
  Calendar,
  ClipboardList,
  Copy,
  Printer,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from '@/i18n/client'

// ─── Types ──────────────────────────────────────────────────────────────

type PracticeBlockFocus =
  | 'warmup'
  | 'skill'
  | 'skating'
  | 'tactical'
  | 'specialTeams'
  | 'smallArea'
  | 'conditioning'
  | 'game'
  | 'cooldown'

const BLOCK_FOCUS_OPTIONS: { value: PracticeBlockFocus; labelKey: string }[] = [
  { value: 'warmup', labelKey: 'focus.warmup' },
  { value: 'skill', labelKey: 'focus.skill' },
  { value: 'skating', labelKey: 'focus.skating' },
  { value: 'tactical', labelKey: 'focus.tactical' },
  { value: 'specialTeams', labelKey: 'focus.specialTeams' },
  { value: 'smallArea', labelKey: 'focus.smallArea' },
  { value: 'conditioning', labelKey: 'focus.conditioning' },
  { value: 'game', labelKey: 'focus.game' },
  { value: 'cooldown', labelKey: 'focus.cooldown' },
]

const PRACTICE_PHASE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'preseason', labelKey: 'phases.preseason' },
  { value: 'season', labelKey: 'phases.season' },
  { value: 'matchPrep', labelKey: 'phases.matchPrep' },
  { value: 'recovery', labelKey: 'phases.recovery' },
  { value: 'camp', labelKey: 'phases.camp' },
]

const INTENSITY_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'low', labelKey: 'intensities.low' },
  { value: 'moderate', labelKey: 'intensities.moderate' },
  { value: 'high', labelKey: 'intensities.high' },
  { value: 'matchLike', labelKey: 'intensities.matchLike' },
]

interface PracticeBlock {
  id: string
  type: 'drill' | 'custom'
  focus: PracticeBlockFocus
  title: string
  description?: string
  durationMinutes: number
  workRest?: string
  coachingNotes?: string
  structure?: DrillStructure
  templateId?: string
}

interface Team {
  id: string
  name: string
}

interface SavedDrill {
  id: string
  title: string
  description: string | null
  structure: DrillStructure
}

interface PracticePlannerProps {
  teams: Team[]
}

let _blockId = 0
function nextBlockId() {
  _blockId++
  return `block-${Date.now()}-${_blockId}`
}

function getTemplateFocus(category: DrillTemplate['category']): PracticeBlockFocus {
  if (category === 'warmup') return 'warmup'
  if (category === 'shooting' || category === 'passing' || category === 'rush') return 'skill'
  if (category === 'powerplay' || category === 'penaltykill') return 'specialTeams'
  return 'tactical'
}

// ─── Component ──────────────────────────────────────────────────────────

export function PracticePlanner({ teams }: PracticePlannerProps) {
  const t = useTranslations('coach.pages.practicePlanner')
  const tCommon = useTranslations('common')
  const blockFocusOptions = useMemo(
    () => BLOCK_FOCUS_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) })),
    [t]
  )
  const phaseOptions = useMemo(
    () => PRACTICE_PHASE_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) })),
    [t]
  )
  const intensityOptions = useMemo(
    () => INTENSITY_OPTIONS.map((option) => ({ ...option, label: t(option.labelKey) })),
    [t]
  )
  const focusLabel = useCallback(
    (focus: PracticeBlockFocus) => blockFocusOptions.find((o) => o.value === focus)?.label ?? focus,
    [blockFocusOptions]
  )

  const defaultBlocks = useMemo<PracticeBlock[]>(
    () => [
      {
        id: 'default-warmup',
        type: 'custom',
        focus: 'warmup',
        title: t('blocks.defaultWarmupTitle'),
        durationMinutes: 10,
      },
    ],
    [t]
  )

  const [blocks, setBlocks] = useState<PracticeBlock[]>(defaultBlocks)
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('17:00')
  const [practicePhase, setPracticePhase] = useState('season')
  const [practiceIntensity, setPracticeIntensity] = useState('moderate')
  const [lineGroups, setLineGroups] = useState('')
  const [goalieNotes, setGoalieNotes] = useState('')
  const [coachNotes, setCoachNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showTemplatePickerFor, setShowTemplatePickerFor] = useState<number | null>(null)
  const [savedDrills, setSavedDrills] = useState<SavedDrill[]>([])
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)

  // Fetch saved drills
  useEffect(() => {
    const fetchDrills = async () => {
      try {
        const res = await fetch('/api/coach/drills?shared=true')
        if (res.ok) {
          const data = await res.json()
          setSavedDrills(data.drills || [])
        }
      } catch {
        // silently fail
      }
    }
    void fetchDrills()
  }, [])

  const totalMinutes = useMemo(
    () => blocks.reduce((sum, b) => sum + b.durationMinutes, 0),
    [blocks]
  )

  const addCustomBlock = useCallback(() => {
    setBlocks((prev) => [
      ...prev,
      {
        id: nextBlockId(),
        type: 'custom',
        focus: 'skill',
        title: t('blocks.newActivity'),
        durationMinutes: 10,
      },
    ])
  }, [t])

  const addDrillBlock = useCallback(
    (template: DrillTemplate, insertAt?: number) => {
      const newBlock: PracticeBlock = {
        id: nextBlockId(),
        type: 'drill',
        focus: getTemplateFocus(template.category),
        title: template.name,
        description: template.description,
        durationMinutes: 15,
        structure: JSON.parse(JSON.stringify(template.structure)),
        templateId: template.id,
      }
      setBlocks((prev) => {
        if (insertAt !== undefined && insertAt >= 0) {
          const copy = [...prev]
          copy.splice(insertAt + 1, 0, newBlock)
          return copy
        }
        return [...prev, newBlock]
      })
      setShowTemplatePickerFor(null)
    },
    []
  )

  const addSavedDrillBlock = useCallback(
    (drill: SavedDrill) => {
      const newBlock: PracticeBlock = {
        id: nextBlockId(),
        type: 'drill',
        focus: 'skill',
        title: drill.title,
        description: drill.description || undefined,
        durationMinutes: 15,
        structure: JSON.parse(JSON.stringify(drill.structure)),
      }
      setBlocks((prev) => [...prev, newBlock])
    },
    []
  )

  const updateBlock = useCallback(
    (id: string, updates: Partial<PracticeBlock>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      )
    },
    []
  )

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
      return copy
    })
  }, [])

  // Build timeline with start times
  const timeline = useMemo(() => {
    return blocks.reduce<Array<PracticeBlock & { startMin: number; endMin: number }>>((items, block) => {
      const startMin = items.at(-1)?.endMin ?? 0
      const endMin = startMin + block.durationMinutes
      items.push({ ...block, startMin, endMin })
      return items
    }, [])
  }, [blocks])

  const formatTime = useCallback(
    (minutesOffset: number) => {
      if (!startTime) return ''
      const [h, m] = startTime.split(':').map(Number)
      const totalMin = h * 60 + m + minutesOffset
      const hh = Math.floor(totalMin / 60) % 24
      const mm = totalMin % 60
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    },
    [startTime]
  )

  const buildPracticePlanText = useCallback(
    (audience: 'staff' | 'players') => {
      const selectedTeam = teams.find((team) => team.id === teamId)
      const header = [
        title || `${t('defaultTitle')} ${date || ''}`.trim(),
        selectedTeam?.name ? `${t('share.team')}: ${selectedTeam.name}` : null,
        date ? `${tCommon('date')}: ${date}` : null,
        startTime ? `${t('labels.startTime')}: ${formatTime(0)}-${formatTime(totalMinutes)}` : null,
        `${t('share.duration')}: ${totalMinutes} ${t('minutesLabel')}`,
        `${t('planSummary.phase')}: ${phaseOptions.find((option) => option.value === practicePhase)?.label ?? practicePhase}`,
        `${t('planSummary.intensity')}: ${intensityOptions.find((option) => option.value === practiceIntensity)?.label ?? practiceIntensity}`,
      ].filter(Boolean).join('\n')

      const notes = audience === 'staff'
        ? [
            lineGroups ? `${t('planSummary.linesGroups')}: ${lineGroups}` : null,
            goalieNotes ? `${t('planSummary.goalieNotes')}: ${goalieNotes}` : null,
            coachNotes ? `${t('planSummary.coachNotes')}: ${coachNotes}` : null,
          ].filter(Boolean).join('\n')
        : [
            lineGroups ? `${t('planSummary.linesGroups')}: ${lineGroups}` : null,
            goalieNotes ? `${t('planSummary.goalieNotes')}: ${goalieNotes}` : null,
          ].filter(Boolean).join('\n')

      const plan = timeline
        .map((block, index) => {
          const blockLines = [
            `${index + 1}. ${formatTime(block.startMin)}-${formatTime(block.endMin)} ${block.title} (${block.durationMinutes} ${t('minutesLabel')})`,
            `${t('planSummary.focus')}: ${focusLabel(block.focus)}${block.workRest ? ` | ${t('planSummary.workRest')}: ${block.workRest}` : ''}`,
            block.description ? block.description : null,
            audience === 'staff' && block.coachingNotes
              ? `${t('planSummary.coachingNotes')}: ${block.coachingNotes}`
              : null,
          ].filter(Boolean)
          return blockLines.join('\n')
        })
        .join('\n\n')

      return [
        header,
        notes ? `${t('share.notesTitle')}\n${notes}` : null,
        `${t('descriptionTitle')}\n${plan}`,
      ].filter(Boolean).join('\n\n')
    },
    [
      teams,
      teamId,
      title,
      date,
      startTime,
      totalMinutes,
      practicePhase,
      phaseOptions,
      practiceIntensity,
      intensityOptions,
      lineGroups,
      goalieNotes,
      coachNotes,
      timeline,
      formatTime,
      focusLabel,
      t,
      tCommon,
    ]
  )

  const copyPracticePlan = useCallback(
    async (audience: 'staff' | 'players') => {
      try {
        await navigator.clipboard.writeText(buildPracticePlanText(audience))
        toast.success(audience === 'staff' ? t('toasts.staffPlanCopied') : t('toasts.playerPlanCopied'))
      } catch {
        toast.error(t('toasts.copyFailed'))
      }
    },
    [buildPracticePlanText, t]
  )

  const printPracticePlan = useCallback(
    (audience: 'staff' | 'players') => {
      const planText = buildPracticePlanText(audience)
      const printWindow = window.open('', '_blank', 'noopener,noreferrer')
      if (!printWindow) {
        toast.error(t('toasts.printFailed'))
        return
      }

      const escaped = planText
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${t('share.printTitle')}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #111827; }
              pre { white-space: pre-wrap; font: inherit; line-height: 1.45; }
              @media print { body { margin: 18mm; } }
            </style>
          </head>
          <body>
            <pre>${escaped}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    },
    [buildPracticePlanText, t]
  )

  // Save as TeamEvent with practice plan in description
  const handleSave = async () => {
    if (!teamId || teamId === 'none') {
      toast.error(t('validation.selectTeam'))
      return
    }
    if (!date) {
      toast.error(t('validation.selectDate'))
      return
    }
    if (blocks.length === 0) {
      toast.error(t('validation.addAtLeastOneActivity'))
      return
    }

    // Build description with the practice plan
    const planText = timeline
      .map(
        (b) =>
          [
            `${formatTime(b.startMin)}-${formatTime(b.endMin)} ${b.title} (${b.durationMinutes} ${t('minutesLabel')})`,
            `  ${t('planSummary.focus')}: ${focusLabel(b.focus)}${b.workRest ? ` | ${t('planSummary.workRest')}: ${b.workRest}` : ''}`,
            b.description ? `  ${b.description}` : null,
            b.coachingNotes ? `  ${t('planSummary.coachingNotes')}: ${b.coachingNotes}` : null,
          ].filter(Boolean).join('\n')
      )
      .join('\n')

    const meta = [
      `${t('planSummary.phase')}: ${practicePhase}`,
      `${t('planSummary.intensity')}: ${practiceIntensity}`,
      lineGroups ? `${t('planSummary.linesGroups')}: ${lineGroups}` : null,
      goalieNotes ? `${t('planSummary.goalieNotes')}: ${goalieNotes}` : null,
      coachNotes ? `${t('planSummary.coachNotes')}: ${coachNotes}` : null,
    ].filter(Boolean).join('\n')

    const fullDescription = `${t('descriptionTitle')} — ${totalMinutes} ${t('minutesLabel')}\n${meta ? `\n${meta}` : ''}\n\n${planText}`

    setSaving(true)
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `${t('defaultTitle')} ${date}`,
          description: fullDescription,
          type: 'PRACTICE',
          startDate: `${date}T${startTime || '17:00'}:00`,
          endDate: `${date}T${formatTime(totalMinutes)}:00`,
          allDay: false,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(t('toasts.saved'))
      // Reset
      setBlocks(defaultBlocks)
      setTitle('')
      setDate('')
      setLineGroups('')
      setGoalieNotes('')
      setCoachNotes('')
    } catch {
      toast.error(t('toasts.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header settings */}
      <GlassCard glow="blue">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-blue-500" />
            {t('title')}
          </GlassCardTitle>
          <GlassCardDescription>
            {t('description')}
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.title')}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('placeholders.title')}
                className="h-8 text-sm"
              />
            </div>
            {teams.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t('labels.team')}</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t('placeholders.selectTeam')} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tCommon('date')}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.startTime')}</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.phase')}</Label>
              <Select value={practicePhase} onValueChange={setPracticePhase}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.intensity')}</Label>
              <Select value={practiceIntensity} onValueChange={setPracticeIntensity}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intensityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.lineGroups')}</Label>
              <Textarea
                value={lineGroups}
                onChange={(e) => setLineGroups(e.target.value)}
                placeholder={t('placeholders.lineGroups')}
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.goalieNotes')}</Label>
              <Textarea
                value={goalieNotes}
                onChange={(e) => setGoalieNotes(e.target.value)}
                placeholder={t('placeholders.goalieNotes')}
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.coachNotes')}</Label>
              <Textarea
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder={t('placeholders.coachNotes')}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Timeline blocks */}
      <GlassCard glow="purple">
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t('timeline.title')}
            </GlassCardTitle>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t('timeline.totalMinutes', { count: totalMinutes })}
              {startTime && (
                <span className="ml-1">
                  ({formatTime(0)}–{formatTime(totalMinutes)})
                </span>
              )}
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent className="space-y-2">
          {timeline.map((block, i) => (
            <div key={block.id} className="border rounded-lg p-3 space-y-2">
              {/* Block header */}
              <div className="flex items-center gap-2">
                {/* Time badge */}
                <div className="text-[10px] text-muted-foreground font-mono w-14 flex-shrink-0">
                  {startTime
                    ? formatTime(block.startMin)
                    : `+${block.startMin} ${t('minutesLabel')}`}
                </div>

                {/* Move buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => moveBlock(block.id, 'up')}
                    disabled={i === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={i === timeline.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Title */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={block.title}
                      onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                      className="h-7 text-sm font-medium flex-1"
                    />
                    <Badge variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">
                      {focusLabel(block.focus)}
                    </Badge>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={block.durationMinutes}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        durationMinutes: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="h-7 w-14 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">{t('minutesLabel')}</span>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeBlock(block.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_160px_1fr]">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t('fields.focus')}</Label>
                  <Select
                    value={block.focus}
                    onValueChange={(value) => updateBlock(block.id, { focus: value as PracticeBlockFocus })}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {blockFocusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t('fields.workRest')}</Label>
                  <Input
                    value={block.workRest || ''}
                    onChange={(e) => updateBlock(block.id, { workRest: e.target.value || undefined })}
                    placeholder={t('placeholders.workRest')}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t('fields.coaching')}</Label>
                  <Input
                    value={block.coachingNotes || ''}
                    onChange={(e) => updateBlock(block.id, { coachingNotes: e.target.value || undefined })}
                    placeholder={t('placeholders.coaching')}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              {/* Drill preview (expandable) */}
              {block.structure && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground px-1"
                    onClick={() =>
                      setExpandedBlockId(expandedBlockId === block.id ? null : block.id)
                    }
                  >
                    {expandedBlockId === block.id ? t('actions.hideDiagram') : t('actions.showDiagram')}
                  </Button>
                  {expandedBlockId === block.id && (
                    <div className="mt-2">
                      <IceHockeyRink structure={block.structure} width={400} className="mx-auto" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add block buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={addCustomBlock}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('actions.addActivity')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplatePickerFor(blocks.length - 1)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('actions.addTemplate')}
            </Button>
            {savedDrills.length > 0 && (
              <Select
                onValueChange={(id) => {
                  const drill = savedDrills.find((d) => d.id === id)
                  if (drill) addSavedDrillBlock(drill)
                }}
              >
                <SelectTrigger className="h-8 w-auto text-xs">
                  <SelectValue placeholder={t('actions.addSavedDrill')} />
                </SelectTrigger>
                <SelectContent>
                  {savedDrills.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Template picker (modal-like inline) */}
          {showTemplatePickerFor !== null && (
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('templatePicker.title')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplatePickerFor(null)}
                >
                  {t('actions.cancel')}
                </Button>
              </div>
              <DrillTemplateLibrary
                onSelect={(t) => addDrillBlock(t, showTemplatePickerFor)}
              />
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Share / print */}
      <GlassCard glow="emerald">
        <GlassCardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                {t('share.title')}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('share.description')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyPracticePlan('staff')}
                disabled={blocks.length === 0}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                {t('actions.copyStaffPlan')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyPracticePlan('players')}
                disabled={blocks.length === 0}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                {t('actions.copyPlayerPlan')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => printPracticePlan('staff')}
                disabled={blocks.length === 0}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                {t('actions.printStaffPlan')}
              </Button>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving || blocks.length === 0}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-1.5" />
        {saving ? t('actions.saving') : t('actions.saveToCalendar')}
      </Button>
    </div>
  )
}
