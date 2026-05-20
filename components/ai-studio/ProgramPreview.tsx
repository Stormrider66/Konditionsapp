'use client'

import { useState, useRef } from 'react'
import { useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Heart,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { parseAIProgram } from '@/lib/ai/program-parser'
import { generateProgramPDFFromElement, downloadProgramPDF, generateProgramPDFFilename } from '@/lib/exports/program-pdf-export'
import { ProgramPDFContent } from '@/components/exports/ProgramPDFContent'

interface ProgramPreviewProps {
  content: string
  athleteId?: string | null
  athleteName?: string | null
  coachName?: string | null
  conversationId?: string | null
  onProgramSaved?: (programId: string) => void
}

// Workout type to icon mapping
const workoutTypeIcons: Record<string, React.ReactNode> = {
  RUNNING: <Heart className="h-4 w-4 text-red-500" />,
  CYCLING: <Flame className="h-4 w-4 text-orange-500" />,
  SWIMMING: <Heart className="h-4 w-4 text-blue-500" />,
  STRENGTH: <Dumbbell className="h-4 w-4 text-purple-500" />,
  REST: <Clock className="h-4 w-4 text-green-500" />,
  HYROX: <Flame className="h-4 w-4 text-amber-500" />,
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  chooseAthleteTitle: string
  chooseAthleteDescription: string
  savedTitle: string
  saveErrorTitle: string
  unknownError: string
  excelExportedTitle: string
  excelExportedDescription: string
  pdfExportedTitle: string
  pdfExportedDescription: string
  exportErrorTitle: string
  weeksLower: string
  weeks: string
  phases: string
  sessionsPerWeek: string
  week: string
  keyWorkouts: string
  weeklySchedule: string
  rest: string
  volumeGuidance: string
  exporting: string
  export: string
  exportExcel: string
  exportPdf: string
  programSaved: string
  viewProgram: string
  saving: string
  saveProgram: string
  selectAthleteHint: string
  dayLabels: string[]
}> = {
  en: {
    chooseAthleteTitle: 'Choose an athlete',
    chooseAthleteDescription: 'You need to choose an athlete before saving the program.',
    savedTitle: 'Program saved!',
    saveErrorTitle: 'Could not save program',
    unknownError: 'Unknown error',
    excelExportedTitle: 'Excel exported!',
    excelExportedDescription: 'The training program has been downloaded as an Excel file.',
    pdfExportedTitle: 'PDF exported!',
    pdfExportedDescription: 'The training program has been downloaded as a PDF.',
    exportErrorTitle: 'Could not export',
    weeksLower: 'weeks',
    weeks: 'Weeks',
    phases: 'Phases',
    sessionsPerWeek: 'Sessions/week',
    week: 'Week',
    keyWorkouts: 'key workouts',
    weeklySchedule: 'Weekly schedule:',
    rest: 'Rest',
    volumeGuidance: 'Volume guidance:',
    exporting: 'Exporting...',
    export: 'Export',
    exportExcel: 'Export to Excel',
    exportPdf: 'Export to PDF',
    programSaved: 'Program saved!',
    viewProgram: 'View program',
    saving: 'Saving...',
    saveProgram: 'Save program',
    selectAthleteHint: 'Choose an athlete in the context panel before saving the program',
    dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  sv: {
    chooseAthleteTitle: 'Välj en atlet',
    chooseAthleteDescription: 'Du måste välja en atlet innan du kan spara programmet.',
    savedTitle: 'Program sparat!',
    saveErrorTitle: 'Kunde inte spara program',
    unknownError: 'Okänt fel',
    excelExportedTitle: 'Excel exporterad!',
    excelExportedDescription: 'Träningsprogrammet har laddats ner som Excel-fil.',
    pdfExportedTitle: 'PDF exporterad!',
    pdfExportedDescription: 'Träningsprogrammet har laddats ner som PDF.',
    exportErrorTitle: 'Kunde inte exportera',
    weeksLower: 'veckor',
    weeks: 'Veckor',
    phases: 'Faser',
    sessionsPerWeek: 'Pass/vecka',
    week: 'Vecka',
    keyWorkouts: 'nyckelpass',
    weeklySchedule: 'Veckoschema:',
    rest: 'Vila',
    volumeGuidance: 'Volymvägledning:',
    exporting: 'Exporterar...',
    export: 'Exportera',
    exportExcel: 'Exportera till Excel',
    exportPdf: 'Exportera till PDF',
    programSaved: 'Program sparat!',
    viewProgram: 'Visa program',
    saving: 'Sparar...',
    saveProgram: 'Spara program',
    selectAthleteHint: 'Välj en atlet i kontextpanelen för att kunna spara programmet',
    dayLabels: ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'],
  },
}

export function ProgramPreview({
  content,
  athleteId,
  athleteName,
  coachName,
  conversationId,
  onProgramSaved,
}: ProgramPreviewProps) {
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<string[]>([])
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const pdfContentRef = useRef<HTMLDivElement>(null)

  // Try to parse program from content
  const parseResult = parseAIProgram(content)

  // If no program found, don't render anything
  if (!parseResult.success || !parseResult.program) {
    return null
  }

  const program = parseResult.program

  const togglePhase = (phaseName: string) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseName)
        ? prev.filter((p) => p !== phaseName)
        : [...prev, phaseName]
    )
  }

  const handleSaveProgram = async () => {
    if (!athleteId) {
      toast({
        title: copy.chooseAthleteTitle,
        description: copy.chooseAthleteDescription,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/ai/save-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiOutput: content,
          clientId: athleteId,
          conversationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save program')
      }

      setSaved(true)
      setSavedProgramId(data.program.id)
      toast({
        title: copy.savedTitle,
        description: data.message,
      })

      if (onProgramSaved) {
        onProgramSaved(data.program.id)
      }
    } catch (error) {
      toast({
        title: copy.saveErrorTitle,
        description: error instanceof Error ? error.message : copy.unknownError,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const { downloadProgramExcel } = await import('@/lib/exports/program-excel-export')
      await downloadProgramExcel({
        program,
        athleteName: athleteName || undefined,
        coachName: coachName || undefined,
        startDate: new Date(),
        locale,
      })
      toast({
        title: copy.excelExportedTitle,
        description: copy.excelExportedDescription,
      })
    } catch (error) {
      toast({
        title: copy.exportErrorTitle,
        description: error instanceof Error ? error.message : copy.unknownError,
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      // Wait a tick for the hidden PDF content to render
      await new Promise(resolve => setTimeout(resolve, 100))

      const pdfElement = pdfContentRef.current
      if (!pdfElement) {
        throw new Error('PDF content not found')
      }

      const pdfBlob = await generateProgramPDFFromElement(
        pdfElement,
        {
          program,
          athleteName: athleteName || undefined,
          coachName: coachName || undefined,
          startDate: new Date(),
          locale,
        }
      )

      const filename = generateProgramPDFFilename(program.name, locale)
      downloadProgramPDF(pdfBlob, filename)

      toast({
        title: copy.pdfExportedTitle,
        description: copy.pdfExportedDescription,
      })
    } catch (error) {
      toast({
        title: copy.exportErrorTitle,
        description: error instanceof Error ? error.message : copy.unknownError,
        variant: 'destructive',
      })
    } finally {
      setExporting(null)
    }
  }

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            {program.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {program.totalWeeks} {copy.weeksLower}
            </Badge>
            {program.methodology && (
              <Badge variant="secondary">
                {program.methodology}
              </Badge>
            )}
          </div>
        </div>
        {program.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {program.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Program Overview */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {program.totalWeeks}
            </div>
            <div className="text-xs text-muted-foreground">{copy.weeks}</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {program.phases.length}
            </div>
            <div className="text-xs text-muted-foreground">{copy.phases}</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {program.weeklySchedule?.sessionsPerWeek || '?'}
            </div>
            <div className="text-xs text-muted-foreground">{copy.sessionsPerWeek}</div>
          </div>
        </div>

        {/* Phases */}
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {program.phases.map((phase, index) => (
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
                          {copy.week} {phase.weeks} - {phase.focus}
                        </div>
                      </div>
                    </div>
                    {phase.keyWorkouts && phase.keyWorkouts.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {phase.keyWorkouts.length} {copy.keyWorkouts}
                      </Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 ml-7 p-3 bg-white rounded-lg border space-y-3">
                    {/* Weekly Template */}
                    {phase.weeklyTemplate && (
                      <div>
                        <div className="text-sm font-medium mb-2">{copy.weeklySchedule}</div>
                        <div className="grid grid-cols-7 gap-1 text-xs">
                          {copy.dayLabels.map(
                            (day, dayIndex) => {
                              const dayNames = [
                                'monday',
                                'tuesday',
                                'wednesday',
                                'thursday',
                                'friday',
                                'saturday',
                                'sunday',
                              ]
                              const workout = phase.weeklyTemplate?.[dayNames[dayIndex]]
                              return (
                                <div
                                  key={day}
                                  className={`p-2 rounded text-center ${
                                    workout?.type === 'REST'
                                      ? 'bg-green-100'
                                      : 'bg-blue-100'
                                  }`}
                                >
                                  <div className="font-medium uppercase">{day}</div>
                                  {workout && (
                                    <div className="mt-1">
                                      {workoutTypeIcons[workout.type] || (
                                        <Heart className="h-3 w-3 mx-auto" />
                                      )}
                                      <div className="truncate mt-0.5">
                                        {workout.type === 'REST'
                                          ? copy.rest
                                          : 'name' in workout
                                          ? workout.name
                                          : workout.type}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {/* Key Workouts */}
                    {phase.keyWorkouts && phase.keyWorkouts.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">{copy.keyWorkouts}:</div>
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
                        <span className="font-medium">{copy.volumeGuidance} </span>
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
        </ScrollArea>

        {/* Notes */}
        {program.notes && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">{program.notes}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex justify-end gap-2">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting !== null}>
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {copy.exporting}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {copy.export}
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel} disabled={exporting !== null}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {copy.exportExcel}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} disabled={exporting !== null}>
                <FileText className="h-4 w-4 mr-2" />
                {copy.exportPdf}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save Button */}
          {saved && savedProgramId ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                {copy.programSaved}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/coach/programs/${savedProgramId}`, '_blank')}
              >
                {copy.viewProgram}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSaveProgram}
              disabled={saving || !athleteId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {copy.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {copy.saveProgram}
                </>
              )}
            </Button>
          )}
        </div>

        {!athleteId && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {copy.selectAthleteHint}
          </p>
        )}

        {/* Hidden PDF Content for export */}
        <div
          ref={pdfContentRef}
          className="absolute left-[-9999px] top-0"
          aria-hidden="true"
        >
          <ProgramPDFContent
            program={program}
            athleteName={athleteName || undefined}
            coachName={coachName || undefined}
            startDate={new Date()}
          />
        </div>
      </CardContent>
    </Card>
  )
}
