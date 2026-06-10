'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  ArrowRightLeft,
  Dumbbell,
  GripVertical,
  Heart,
  Layers,
  Link2,
  MessageSquare,
  Percent,
  Trash2,
} from 'lucide-react'
import {
  INTENSITY_LABELS,
  MAX_FOLLOW_UPS,
  PERCENT_PRESETS,
  SECTION_DEFAULTS,
  SECTION_ORDER,
  intensityLabel,
  sectionLabel,
  text,
  type AppLocale,
  type CardioIntensity,
  type Exercise,
  type FollowUp,
  type SectionType,
  type SetRow,
} from './section-workout-model'

// Sortable Exercise Item
export function SortableExerciseItem({
  exercise,
  sectionType,
  availableExercises,
  onRemove,
  onMoveToSection,
  onUpdate,
  onAddFollowUp,
  onUpdateFollowUp,
  onRemoveFollowUp,
  locale,
  isOverlay = false,
}: {
  exercise: Exercise
  sectionType: SectionType
  availableExercises: Array<{ id: string; name: string; muscleGroup?: string; category?: string }>
  onRemove: () => void
  onMoveToSection: (targetSection: SectionType) => void
  onUpdate: (field: keyof Exercise, value: any) => void
  onAddFollowUp: (followExerciseId: string) => void
  onUpdateFollowUp: (followUpId: string, field: keyof FollowUp, value: any) => void
  onRemoveFollowUp: (followUpId: string) => void
  locale: AppLocale
  isOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: exercise.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isCooldown = sectionType === 'COOLDOWN'
  const isMain = sectionType === 'MAIN'
  const isCardio = exercise.kind === 'cardio'
  const hasSetRows = !isCardio && (exercise.setRows?.length ?? 0) > 0
  const isPercent = exercise.weightUnit === 'percent'

  const togglePercent = () => {
    onUpdate('weightUnit', isPercent ? 'kg' : 'percent')
  }
  const weightLabel = isPercent ? text(locale, 'Vikt (% av 1RM)', 'Weight (% of 1RM)') : text(locale, 'Vikt', 'Weight')
  const weightPlaceholder = isPercent ? '%' : 'kg'

  const [notesOpen, setNotesOpen] = useState(Boolean(exercise.notes))
  const [followUpPickerOpen, setFollowUpPickerOpen] = useState(false)

  const followUps = exercise.followUps ?? []
  // Cardio exercises don't currently support follow-ups (no clear use
  // case — you'd just chain a second cardio block).
  const canAddFollowUp = isMain && !isCardio && followUps.length < MAX_FOLLOW_UPS

  const toggleKind = () => {
    if (isCardio) {
      // Going back to strength — restore sensible defaults if reps/weight
      // were never filled in.
      onUpdate('kind', 'strength')
      if (!exercise.reps) onUpdate('reps', '10')
    } else {
      onUpdate('kind', 'cardio')
      // Pre-seed cardio defaults if they're missing
      if (exercise.durationSec == null) onUpdate('durationSec', 600)
      if (!exercise.intensity) onUpdate('intensity', 'MODERATE')
      // Drop pyramid rows — they don't apply to cardio.
      if (hasSetRows) onUpdate('setRows', undefined)
    }
  }

  // Toggle per-set varied loading. When turning on, expand the flat
  // reps/weight into N rows (one per set) seeded with current values.
  // When turning off, drop setRows so the runner falls back to the flat
  // values.
  const togglePyramid = () => {
    if (hasSetRows) {
      onUpdate('setRows', undefined)
    } else {
      const seedRow: SetRow = { reps: exercise.reps, weight: exercise.weight }
      const rows = Array.from({ length: Math.max(1, exercise.sets) }, () => ({
        ...seedRow,
      }))
      onUpdate('setRows', rows)
    }
  }

  // Keep setRows length in sync with the sets count when pyramid mode is on.
  // Bumping sets up duplicates the last row; bumping down trims the tail.
  const handleSetsChange = (value: string) => {
    const next = parseInt(value) || 1
    onUpdate('sets', next)
    if (hasSetRows) {
      const current = exercise.setRows ?? []
      if (next > current.length) {
        const last = current[current.length - 1] ?? { reps: exercise.reps, weight: exercise.weight }
        const additions = Array.from({ length: next - current.length }, () => ({ ...last }))
        onUpdate('setRows', [...current, ...additions])
      } else if (next < current.length) {
        onUpdate('setRows', current.slice(0, next))
      }
    }
  }

  const updateSetRow = (idx: number, field: keyof SetRow, value: string) => {
    const current = exercise.setRows ?? []
    const next = current.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    onUpdate('setRows', next)
  }

  // Render duration as mm:ss for cleaner editing.
  const durationMinutes = exercise.durationSec
    ? Math.floor(exercise.durationSec / 60)
    : 0
  const durationRemainderSec = exercise.durationSec
    ? exercise.durationSec % 60
    : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-md p-3 flex items-start gap-3 ${
        isOverlay ? 'shadow-lg cursor-grabbing' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{exercise.name}</span>
            {isCardio && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                <Heart className="h-3 w-3 mr-1" />
                {text(locale, 'Kondition', 'Cardio')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleKind}
              className={`h-6 w-6 p-0 ${
                isCardio ? 'text-rose-500' : 'text-muted-foreground'
              } hover:text-foreground`}
              title={isCardio ? text(locale, 'Växla till styrka', 'Switch to strength') : text(locale, 'Växla till kondition (tid/distans)', 'Switch to cardio (time/distance)')}
            >
              {isCardio ? <Heart className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
            </Button>
            {!isCardio && !isCooldown && (
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePercent}
                className={`h-6 w-6 p-0 ${
                  isPercent ? 'text-primary' : 'text-muted-foreground'
                } hover:text-foreground`}
                title={isPercent ? text(locale, 'Använd kg', 'Use kg') : text(locale, 'Använd % av 1RM (per atlet)', 'Use % of 1RM (per athlete)')}
              >
                <Percent className="h-4 w-4" />
              </Button>
            )}
            {!isCardio && (
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePyramid}
                className={`h-6 w-6 p-0 ${
                  hasSetRows ? 'text-primary' : 'text-muted-foreground'
                } hover:text-foreground`}
                title={hasSetRows ? text(locale, 'Använd samma reps/vikt för alla set', 'Use the same reps/weight for all sets') : text(locale, 'Variera reps/vikt per set (pyramid)', 'Vary reps/weight by set (pyramid)')}
              >
                <Layers className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotesOpen((v) => !v)}
              className={`h-6 w-6 p-0 ${
                exercise.notes ? 'text-primary' : 'text-muted-foreground'
              } hover:text-foreground`}
              title={text(locale, 'Kommentar', 'Comment')}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            {!isOverlay && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title={text(locale, 'Flytta till annan sektion', 'Move to another section')}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SECTION_ORDER.filter((type) => type !== sectionType).map((type) => {
                    const TargetIcon = SECTION_DEFAULTS[type].icon
                    return (
                      <DropdownMenuItem
                        key={type}
                        onClick={() => onMoveToSection(type)}
                      >
                        <TargetIcon className={`h-4 w-4 mr-2 ${SECTION_DEFAULTS[type].color}`} />
                        {text(locale, 'Flytta till', 'Move to')} {sectionLabel(type, locale)}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isCardio ? (
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">{text(locale, 'Tid (mm:ss)', 'Time (mm:ss)')}</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={durationMinutes}
                  onChange={(e) => {
                    const m = Math.max(0, parseInt(e.target.value) || 0)
                    onUpdate('durationSec', m * 60 + durationRemainderSec)
                  }}
                  className="h-7 text-sm"
                  placeholder={text(locale, 'min', 'min')}
                />
                <span className="text-muted-foreground text-sm">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={durationRemainderSec}
                  onChange={(e) => {
                    const s = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                    onUpdate('durationSec', durationMinutes * 60 + s)
                  }}
                  className="h-7 text-sm"
                  placeholder={text(locale, 'sek', 'sec')}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{text(locale, 'Distans (km)', 'Distance (km)')}</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={exercise.distanceKm ?? ''}
                onChange={(e) => onUpdate('distanceKm', e.target.value)}
                className="h-7 text-sm"
                placeholder="—"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{text(locale, 'Intensitet', 'Intensity')}</Label>
              <Select
                value={exercise.intensity ?? 'MODERATE'}
                onValueChange={(v) => onUpdate('intensity', v as CardioIntensity)}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTENSITY_LABELS) as CardioIntensity[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {intensityLabel(key, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : hasSetRows ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Set</Label>
                <Input
                  type="number"
                  min={1}
                  value={exercise.sets}
                  onChange={(e) => handleSetsChange(e.target.value)}
                  className="h-7 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{text(locale, 'Vila (s)', 'Rest (s)')}</Label>
                <Input
                  type="number"
                  value={exercise.rest}
                  onChange={(e) => onUpdate('rest', parseInt(e.target.value) || 0)}
                  className="h-7 text-sm"
                />
              </div>
            </div>

            {isPercent && (
              <p className="text-[11px] text-muted-foreground -mt-1">
                {text(locale, 'Vikt anges som % av 1RM. Varje atlet får sin egen vikt baserat på sitt PR.', 'Weight is entered as % of 1RM. Each athlete gets their own weight based on their PR.')}
              </p>
            )}
            <div className="rounded-md border bg-muted/20 divide-y">
              {(exercise.setRows ?? []).map((row, idx) => (
                <div key={idx} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Set {idx + 1}
                  </span>
                  <Input
                    value={row.reps}
                    onChange={(e) => updateSetRow(idx, 'reps', e.target.value)}
                    className="h-7 text-sm"
                    placeholder="reps"
                  />
                  <Input
                    value={row.weight}
                    onChange={(e) => updateSetRow(idx, 'weight', e.target.value)}
                    className="h-7 text-sm"
                    placeholder={weightPlaceholder}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Set</Label>
              <Input
                type="number"
                value={exercise.sets}
                onChange={(e) => handleSetsChange(e.target.value)}
                className="h-7 text-sm"
              />
            </div>
            <div>
                <Label className="text-xs text-muted-foreground">
                {isCooldown ? text(locale, 'Tid', 'Time') : 'Reps'}
              </Label>
              <Input
                value={exercise.reps}
                onChange={(e) => onUpdate('reps', e.target.value)}
                className="h-7 text-sm"
                placeholder={isCooldown ? '30s' : '10'}
              />
            </div>
            {!isCooldown && (
              <div>
                <Label className="text-xs text-muted-foreground">{weightLabel}</Label>
                <Input
                  value={exercise.weight}
                  onChange={(e) => onUpdate('weight', e.target.value)}
                  className="h-7 text-sm"
                  placeholder={weightPlaceholder}
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">{text(locale, 'Vila (s)', 'Rest (s)')}</Label>
              <Input
                type="number"
                value={exercise.rest}
                onChange={(e) => onUpdate('rest', parseInt(e.target.value) || 0)}
                className="h-7 text-sm"
              />
            </div>
            {isPercent && !isCooldown && (
              <div className="col-span-4 flex flex-wrap gap-1">
                {PERCENT_PRESETS.map((pct) => {
                  const active = String(pct) === exercise.weight
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => onUpdate('weight', String(pct))}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                      }`}
                    >
                      {pct}%
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {notesOpen && (
          <Textarea
            value={exercise.notes ?? ''}
            onChange={(e) => onUpdate('notes', e.target.value)}
            placeholder={text(locale, 'Kommentar till övningen (valfritt)', 'Exercise note (optional)')}
            rows={2}
            className="text-sm"
          />
        )}

        {isMain && (followUps.length > 0 || canAddFollowUp) && (
          <div className="pl-4 border-l-2 border-dashed border-muted-foreground/30 space-y-2 mt-2">
            {followUps.map((fu, idx) => (
              <FollowUpRow
                key={fu.id}
                followUp={fu}
                index={idx}
                onUpdate={(field, value) => onUpdateFollowUp(fu.id, field, value)}
                onRemove={() => onRemoveFollowUp(fu.id)}
                locale={locale}
              />
            ))}

            {canAddFollowUp && (
              <Popover open={followUpPickerOpen} onOpenChange={setFollowUpPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    {followUps.length === 0
                      ? text(locale, 'Lägg till följdövning (superset / kontrast)', 'Add follow-up exercise (superset / contrast)')
                      : text(locale, 'Lägg till till', 'Add another')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={text(locale, 'Sök övning...', 'Search exercise...')} className="h-9" />
                    <CommandList>
                      <CommandEmpty>{text(locale, 'Inga övningar hittades', 'No exercises found')}</CommandEmpty>
                      <CommandGroup>
                        {availableExercises.map((ex) => (
                          <CommandItem
                            key={ex.id}
                            value={`${ex.name} ${ex.muscleGroup ?? ''} ${ex.category ?? ''}`}
                            onSelect={() => {
                              onAddFollowUp(ex.id)
                              setFollowUpPickerOpen(false)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm">{ex.name}</span>
                              {(ex.muscleGroup || ex.category) && (
                                <span className="text-[10px] text-muted-foreground">
                                  {ex.muscleGroup || ex.category}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Row for a follow-up exercise (superset / French-contrast pair member).
// Runs once per set of the primary exercise; `restBefore` is the pause
// between the previous exercise in the pair and this one.
function FollowUpRow({
  followUp,
  index,
  onUpdate,
  onRemove,
  locale,
}: {
  followUp: FollowUp
  index: number
  onUpdate: (field: keyof FollowUp, value: any) => void
  onRemove: () => void
  locale: AppLocale
}) {
  const [notesOpen, setNotesOpen] = useState(Boolean(followUp.notes))
  const isPercent = followUp.weightUnit === 'percent'

  return (
    <div className="bg-muted/30 rounded-md p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-[10px] shrink-0">
            {text(locale, 'Följd', 'Follow-up')} {index + 1}
          </Badge>
          <span className="font-medium text-sm truncate">{followUp.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate('weightUnit', isPercent ? 'kg' : 'percent')}
            className={`h-6 w-6 p-0 ${
              isPercent ? 'text-primary' : 'text-muted-foreground'
            } hover:text-foreground`}
            title={isPercent ? text(locale, 'Använd kg', 'Use kg') : text(locale, 'Använd % av 1RM (per atlet)', 'Use % of 1RM (per athlete)')}
          >
            <Percent className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotesOpen((v) => !v)}
            className={`h-6 w-6 p-0 ${
              followUp.notes ? 'text-primary' : 'text-muted-foreground'
            } hover:text-foreground`}
            title={text(locale, 'Kommentar', 'Comment')}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Reps</Label>
          <Input
            value={followUp.reps}
            onChange={(e) => onUpdate('reps', e.target.value)}
            className="h-7 text-sm"
            placeholder="5"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            {isPercent ? text(locale, 'Vikt (% av 1RM)', 'Weight (% of 1RM)') : text(locale, 'Vikt', 'Weight')}
          </Label>
          <Input
            value={followUp.weight}
            onChange={(e) => onUpdate('weight', e.target.value)}
            className="h-7 text-sm"
            placeholder={isPercent ? '%' : text(locale, 'kg / kroppsvikt', 'kg / bodyweight')}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{text(locale, 'Paus innan (s)', 'Pause before (s)')}</Label>
          <Input
            type="number"
            value={followUp.restBefore}
            onChange={(e) =>
              onUpdate('restBefore', parseInt(e.target.value) || 0)
            }
            className="h-7 text-sm"
            placeholder={text(locale, '0 = superset, 15-30 = kontrast', '0 = superset, 15-30 = contrast')}
          />
        </div>
      </div>

      {notesOpen && (
        <Textarea
          value={followUp.notes ?? ''}
          onChange={(e) => onUpdate('notes', e.target.value)}
          placeholder={text(locale, 'Kommentar (valfritt)', 'Comment (optional)')}
          rows={2}
          className="text-sm"
        />
      )}
    </div>
  )
}

