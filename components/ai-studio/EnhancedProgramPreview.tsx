'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Heart,
  Download,
  FileSpreadsheet,
  FileText,
  List,
  Pencil,
  Send,
  X,
  Check,
  Plus,
  Wand2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { parseAIProgram, extractProgramMetadata, type ParsedProgram, type ParsedPhase, type ParsedWorkout } from '@/lib/ai/program-parser'
import { DraftWorkoutEditor } from './DraftWorkoutEditor'
import { generateProgramPDFFromElement, downloadProgramPDF, generateProgramPDFFilename } from '@/lib/exports/program-pdf-export'
import { ProgramPDFContent } from '@/components/exports/ProgramPDFContent'
import { cn } from '@/lib/utils'

interface EnhancedProgramPreviewProps {
  content: string
  athleteId?: string | null
  athleteName?: string | null
  coachName?: string | null
  conversationId?: string | null
  onProgramSaved?: (programId: string) => void
  onPublish?: () => void
  onFixFormat?: () => void
  isFixingFormat?: boolean
}

// Workout type to icon mapping
const workoutTypeIcons: Record<string, React.ReactNode> = {
  RUNNING: <Heart className="h-4 w-4 text-red-500" />,
  CYCLING: <Flame className="h-4 w-4 text-orange-500" />,
  SWIMMING: <Heart className="h-4 w-4 text-blue-500" />,
  STRENGTH: <Dumbbell className="h-4 w-4 text-purple-500" />,
  CROSS_TRAINING: <Flame className="h-4 w-4 text-teal-500" />,
  RECOVERY: <Clock className="h-4 w-4 text-green-500" />,
  REST: <Clock className="h-4 w-4 text-green-500" />,
  HYROX: <Flame className="h-4 w-4 text-amber-500" />,
  REHAB: <Heart className="h-4 w-4 text-pink-500" />,
}

// Workout type colors for calendar
const workoutTypeColors: Record<string, string> = {
  RUNNING: 'bg-red-100 border-red-300 text-red-800',
  CYCLING: 'bg-orange-100 border-orange-300 text-orange-800',
  SWIMMING: 'bg-blue-100 border-blue-300 text-blue-800',
  STRENGTH: 'bg-purple-100 border-purple-300 text-purple-800',
  CROSS_TRAINING: 'bg-teal-100 border-teal-300 text-teal-800',
  RECOVERY: 'bg-green-100 border-green-300 text-green-800',
  REST: 'bg-gray-100 border-gray-300 text-gray-600',
  HYROX: 'bg-amber-100 border-amber-300 text-amber-800',
  REHAB: 'bg-pink-100 border-pink-300 text-pink-800',
}

// Intensity to color mapping
const intensityColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
  race_pace: 'bg-purple-100 text-purple-800',
}

// Day names mapping
const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const dayLabels = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

interface DraftProgram {
  name: string
  description: string
  methodology?: string
  totalWeeks: number
  phases: ParsedPhase[]
  notes?: string
  weeklySchedule?: {
    sessionsPerWeek: number
    restDays?: number[]
  }
}

export function EnhancedProgramPreview({
  content,
  athleteId,
  athleteName,
  coachName,
  conversationId,
  onProgramSaved,
  onPublish,
  onFixFormat,
  isFixingFormat,
}: EnhancedProgramPreviewProps) {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<string[]>([])
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1])
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const pdfContentRef = useRef<HTMLDivElement>(null)

  // State for workout editor dialog
  const [editingWorkout, setEditingWorkout] = useState<{
    workout: ParsedWorkout
    phaseIndex: number
    dayName: string
    phaseName: string
  } | null>(null)

  // Try to parse program from content
  const parseResult = parseAIProgram(content)

  // Initialize draft from parsed program (must be before any early returns)
  const [draft, setDraft] = useState<DraftProgram>(() => {
    if (!parseResult.success || !parseResult.program) {
      return {
        name: '',
        description: '',
        totalWeeks: 0,
        phases: [],
      }
    }
    return {
      name: parseResult.program.name,
      description: parseResult.program.description || '',
      methodology: parseResult.program.methodology,
      totalWeeks: parseResult.program.totalWeeks,
      phases: parseResult.program.phases,
      notes: parseResult.program.notes,
      weeklySchedule: parseResult.program.weeklySchedule,
    }
  })

  const updateDraft = useCallback((updates: Partial<DraftProgram>) => {
    setDraft(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
  }, [])

  const updateWorkout = useCallback((
    phaseIndex: number,
    dayName: string,
    updates: Partial<ParsedWorkout>
  ) => {
    setDraft(prev => {
      const newPhases = [...prev.phases]
      const phase = { ...newPhases[phaseIndex] }
      if (phase.weeklyTemplate) {
        const currentWorkout = phase.weeklyTemplate[dayName as keyof typeof phase.weeklyTemplate]
        if (currentWorkout && currentWorkout.type !== 'REST') {
          phase.weeklyTemplate = {
            ...phase.weeklyTemplate,
            [dayName]: { ...currentWorkout, ...updates }
          }
        }
      }
      newPhases[phaseIndex] = phase
      return { ...prev, phases: newPhases }
    })
    setIsDirty(true)
  }, [])

  // Handler for saving edited workout from dialog
  const handleSaveEditedWorkout = useCallback((updatedWorkout: ParsedWorkout) => {
    if (!editingWorkout) return

    setDraft(prev => {
      const newPhases = [...prev.phases]
      const phase = { ...newPhases[editingWorkout.phaseIndex] }
      if (phase.weeklyTemplate) {
        phase.weeklyTemplate = {
          ...phase.weeklyTemplate,
          [editingWorkout.dayName]: updatedWorkout
        }
      }
      newPhases[editingWorkout.phaseIndex] = phase
      return { ...prev, phases: newPhases }
    })
    setIsDirty(true)
    setEditingWorkout(null)
  }, [editingWorkout])

  // Handler for opening workout editor
  const openWorkoutEditor = useCallback((
    workout: ParsedWorkout,
    phaseIndex: number,
    dayName: string,
    phaseName: string
  ) => {
    setEditingWorkout({
      workout,
      phaseIndex,
      dayName,
      phaseName,
    })
  }, [])

  // If no program found, don't render anything (after all hooks)
  if (!parseResult.success || !parseResult.program) {
    return null
  }

  // Check if program data is incomplete
  const isIncomplete = draft.totalWeeks === 0 || draft.phases.length === 0

  const togglePhase = (phaseName: string) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseName)
        ? prev.filter((p) => p !== phaseName)
        : [...prev, phaseName]
    )
  }

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) =>
      prev.includes(weekNum)
        ? prev.filter((w) => w !== weekNum)
        : [...prev, weekNum]
    )
  }

  // Get all weeks from phases
  const getWeeksFromPhases = () => {
    const weeks: { weekNum: number; phase: ParsedPhase; phaseIndex: number }[] = []
    draft.phases.forEach((phase, phaseIndex) => {
      const weekRange = phase.weeks.split('-').map(n => parseInt(n.trim()))
      const startWeek = weekRange[0] || 1
      const endWeek = weekRange[1] || weekRange[0] || 1
      for (let w = startWeek; w <= endWeek; w++) {
        weeks.push({ weekNum: w, phase, phaseIndex })
      }
    })
    return weeks
  }

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const { downloadProgramExcel } = await import('@/lib/exports/program-excel-export')
      await downloadProgramExcel({
        program: draft as ParsedProgram,
        athleteName: athleteName || undefined,
        coachName: coachName || undefined,
        startDate: new Date(),
      })
      toast({
        title: 'Excel exporterad!',
        description: 'Träningsprogrammet har laddats ner som Excel-fil.',
      })
    } catch (error) {
      toast({
        title: 'Kunde inte exportera',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      const pdfElement = pdfContentRef.current
      if (!pdfElement) {
        throw new Error('PDF content not found')
      }
      const pdfBlob = await generateProgramPDFFromElement(
        pdfElement,
        {
          program: draft as ParsedProgram,
          athleteName: athleteName || undefined,
          coachName: coachName || undefined,
          startDate: new Date(),
        }
      )
      const filename = generateProgramPDFFilename(draft.name)
      downloadProgramPDF(pdfBlob, filename)
      toast({
        title: 'PDF exporterad!',
        description: 'Träningsprogrammet har laddats ner som PDF.',
      })
    } catch (error) {
      toast({
        title: 'Kunde inte exportera',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  // Inline edit component
  const InlineEdit = ({
    value,
    fieldId,
    onSave,
    className,
    inputClassName,
  }: {
    value: string
    fieldId: string
    onSave: (value: string) => void
    className?: string
    inputClassName?: string
  }) => {
    const [tempValue, setTempValue] = useState(value)
    const isEditing = editingField === fieldId

    if (isEditing) {
      return (
        <div className={cn("flex items-center gap-1", className)}>
          <Input
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className={cn("h-7 text-sm", inputClassName)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSave(tempValue)
                setEditingField(null)
              } else if (e.key === 'Escape') {
                setTempValue(value)
                setEditingField(null)
              }
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              onSave(tempValue)
              setEditingField(null)
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              setTempValue(value)
              setEditingField(null)
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "group flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1",
          className
        )}
        onClick={() => setEditingField(fieldId)}
      >
        <span>{value || '(tomt)'}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
      </div>
    )
  }

  // Workout card for calendar view
  const WorkoutCard = ({
    workout,
    phaseIndex,
    dayName,
    phaseName,
  }: {
    workout: ParsedWorkout | { type: 'REST' }
    phaseIndex: number
    dayName: string
    phaseName: string
  }) => {
    if (workout.type === 'REST') {
      return (
        <div className="p-2 rounded border bg-gray-50 text-gray-500 text-xs text-center">
          Vila
        </div>
      )
    }

    const workoutData = workout as ParsedWorkout
    const colorClass = workoutTypeColors[workoutData.type] || 'bg-gray-100 border-gray-300'

    return (
      <div
        className={cn(
          "p-2 rounded border text-xs cursor-pointer hover:shadow-md transition-shadow group",
          colorClass
        )}
        onClick={() => openWorkoutEditor(workoutData, phaseIndex, dayName, phaseName)}
      >
        <div className="flex items-center gap-1 font-medium">
          {workoutTypeIcons[workoutData.type]}
          <span className="truncate">{workoutData.name || workoutData.type}</span>
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
        </div>
        {workoutData.duration && (
          <div className="text-[10px] opacity-75 mt-0.5">
            {workoutData.duration} min
          </div>
        )}
        {workoutData.intensity && (
          <Badge
            variant="outline"
            className={cn("text-[10px] mt-1 px-1 py-0", intensityColors[workoutData.intensity])}
          >
            {workoutData.intensity}
          </Badge>
        )}
      </div>
    )
  }

  // Calendar view component
  const CalendarView = () => {
    const weeks = getWeeksFromPhases()

    return (
      <div className="space-y-3">
        {weeks.map(({ weekNum, phase, phaseIndex }) => (
          <Collapsible
            key={weekNum}
            open={expandedWeeks.includes(weekNum)}
            onOpenChange={() => toggleWeek(weekNum)}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-2 bg-white rounded-lg border hover:bg-muted/50 transition">
                <div className="flex items-center gap-2">
                  {expandedWeeks.includes(weekNum) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium">Vecka {weekNum}</span>
                  <Badge variant="outline" className="text-xs">
                    {phase.name}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{phase.focus}</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {dayLabels.map((label, idx) => (
                  <div key={label} className="text-center">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {label}
                    </div>
                    {phase.weeklyTemplate?.[dayNames[idx]] ? (
                      <WorkoutCard
                        workout={phase.weeklyTemplate[dayNames[idx]]!}
                        phaseIndex={phaseIndex}
                        dayName={dayNames[idx]}
                        phaseName={phase.name}
                      />
                    ) : (
                      <button
                        className="w-full p-2 rounded border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition text-xs"
                        onClick={() => {
                          // TODO: Add workout
                          toast({
                            title: 'Kommer snart',
                            description: 'Lägg till pass-funktionen implementeras snart.',
                          })
                        }}
                      >
                        <Plus className="h-3 w-3 mx-auto" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    )
  }

  // List view component (similar to original)
  const ListView = () => (
    <div className="space-y-2">
      {draft.phases.map((phase, index) => (
        <Collapsible
          key={index}
          open={expandedPhases.includes(phase.name)}
          onOpenChange={() => togglePhase(phase.name)}
        >
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-muted/50 transition">
              <div className="flex items-center gap-3">
                {expandedPhases.includes(phase.name) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <div className="text-left">
                  <div className="font-medium">{phase.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Vecka {phase.weeks} - {phase.focus}
                  </div>
                </div>
              </div>
              {phase.keyWorkouts && phase.keyWorkouts.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {phase.keyWorkouts.length} nyckelpass
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 ml-7 p-3 bg-white rounded-lg border space-y-3">
              {/* Weekly Template */}
              {phase.weeklyTemplate && (
                <div>
                  <div className="text-sm font-medium mb-2">Veckoschema:</div>
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {dayLabels.map((day, dayIndex) => {
                      const workout = phase.weeklyTemplate?.[dayNames[dayIndex]]
                      const isRest = workout?.type === 'REST'
                      const isEditable = workout && !isRest
                      return (
                        <div
                          key={day}
                          className={cn(
                            "p-2 rounded text-center min-h-[60px] transition-all",
                            isRest
                              ? 'bg-green-50'
                              : 'bg-blue-50',
                            isEditable && 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-md group'
                          )}
                          onClick={() => {
                            if (isEditable && workout && 'name' in workout) {
                              openWorkoutEditor(workout as ParsedWorkout, index, dayNames[dayIndex], phase.name)
                            }
                          }}
                        >
                          <div className="font-medium uppercase text-[10px]">{day}</div>
                          {workout && (
                            <div className="mt-1 relative">
                              {workoutTypeIcons[workout.type] || (
                                <Heart className="h-3 w-3 mx-auto" />
                              )}
                              <div className="truncate mt-0.5 text-[10px]">
                                {workout.type === 'REST'
                                  ? 'Vila'
                                  : 'name' in workout
                                  ? workout.name
                                  : workout.type}
                              </div>
                              {isEditable && (
                                <Pencil className="h-3 w-3 absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Key Workouts */}
              {phase.keyWorkouts && phase.keyWorkouts.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Nyckelpass:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {phase.keyWorkouts.map((workout, i) => (
                      <li key={i}>{workout}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Volume Guidance */}
              {phase.volumeGuidance && (
                <div className="text-sm">
                  <span className="font-medium">Volymvägledning: </span>
                  <span className="text-muted-foreground">
                    {phase.volumeGuidance}
                  </span>
                </div>
              )}

              {/* Notes */}
              {phase.notes && (
                <div className="text-sm text-muted-foreground italic">
                  {phase.notes}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  )

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <InlineEdit
              value={draft.name}
              fieldId="program-name"
              onSave={(value) => updateDraft({ name: value })}
              className="font-semibold"
            />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {draft.totalWeeks} veckor
            </Badge>
            {draft.methodology && (
              <Badge variant="secondary">
                {draft.methodology}
              </Badge>
            )}
            {isDirty && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Osparade ändringar
              </Badge>
            )}
          </div>
        </div>
        {draft.description && (
          <p className="text-sm text-muted-foreground mt-1">
            <InlineEdit
              value={draft.description}
              fieldId="program-description"
              onSave={(value) => updateDraft({ description: value })}
            />
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar')} className="mb-4">
          <TabsList className="grid w-full max-w-[200px] grid-cols-2">
            <TabsTrigger value="list" className="text-xs">
              <List className="h-3 w-3 mr-1" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs">
              <CalendarDays className="h-3 w-3 mr-1" />
              Kalender
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Program Overview */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {draft.totalWeeks}
            </div>
            <div className="text-xs text-muted-foreground">Veckor</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {draft.phases.length}
            </div>
            <div className="text-xs text-muted-foreground">Faser</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {draft.weeklySchedule?.sessionsPerWeek || '?'}
            </div>
            <div className="text-xs text-muted-foreground">Pass/vecka</div>
          </div>
        </div>

        {/* Content View */}
        <ScrollArea className="max-h-[400px]">
          {viewMode === 'list' ? <ListView /> : <CalendarView />}
        </ScrollArea>

        {/* Notes */}
        {draft.notes && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">{draft.notes}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex justify-between items-center">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting !== null}>
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporterar...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportera
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleExportExcel} disabled={exporting !== null}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} disabled={exporting !== null}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save/Publish Buttons */}
          <div className="flex items-center gap-2">
            {saved && savedProgramId ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  Publicerat!
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/coach/programs/${savedProgramId}`, '_blank')}
                >
                  Visa program
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: 'Utkast sparat',
                      description: 'Ändringar sparas automatiskt under sessionen.',
                    })
                    setIsDirty(false)
                  }}
                  disabled={!isDirty}
                >
                  Spara utkast
                </Button>
                <Button
                  onClick={onPublish}
                  disabled={!athleteId || isIncomplete}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publicera
                </Button>
              </>
            )}
          </div>
        </div>

        {isIncomplete && (
          <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="text-sm text-red-700">
                  <strong>Programmet är ofullständigt.</strong> AI:n genererade inte korrekt JSON-format.
                </div>
              </div>
              {onFixFormat && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onFixFormat}
                  disabled={isFixingFormat}
                  className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
                >
                  {isFixingFormat ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Fixar...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-1" />
                      Fixa format
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {!athleteId && !isIncomplete && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Välj en atlet i kontextpanelen för att kunna publicera programmet
          </p>
        )}

        {/* Hidden PDF Content for export */}
        <div
          ref={pdfContentRef}
          className="absolute left-[-9999px] top-0"
          aria-hidden="true"
        >
          <ProgramPDFContent
            program={draft as ParsedProgram}
            athleteName={athleteName || undefined}
            coachName={coachName || undefined}
            startDate={new Date()}
          />
        </div>
      </CardContent>

      {/* Workout Editor Dialog */}
      {editingWorkout && (
        <DraftWorkoutEditor
          open={!!editingWorkout}
          onOpenChange={(open) => {
            if (!open) setEditingWorkout(null)
          }}
          workout={editingWorkout.workout}
          dayName={editingWorkout.dayName}
          phaseName={editingWorkout.phaseName}
          onSave={handleSaveEditedWorkout}
        />
      )}
    </Card>
  )
}
