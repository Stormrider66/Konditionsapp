'use client'

import { useState, useRef } from 'react'
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
import { parseAIProgram, extractProgramMetadata, type ParsedProgram } from '@/lib/ai/program-parser'
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

// Intensity to color mapping
const intensityColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
  race_pace: 'bg-purple-100 text-purple-800',
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<string[]>([])
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const pdfContentRef = useRef<HTMLDivElement>(null)

  // Try to parse program from content
  const parseResult = parseAIProgram(content)
  const metadata = extractProgramMetadata(content)

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
        title: 'Välj en atlet',
        description: 'Du måste välja en atlet innan du kan spara programmet.',
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
        title: 'Program sparat!',
        description: data.message,
      })

      if (onProgramSaved) {
        onProgramSaved(data.program.id)
      }
    } catch (error) {
      toast({
        title: 'Kunde inte spara program',
        description: error instanceof Error ? error.message : 'Okänt fel',
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
        }
      )

      const filename = generateProgramPDFFilename(program.name)
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
              {program.totalWeeks} veckor
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
            <div className="text-xs text-muted-foreground">Veckor</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {program.phases.length}
            </div>
            <div className="text-xs text-muted-foreground">Faser</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {program.weeklySchedule?.sessionsPerWeek || '?'}
            </div>
            <div className="text-xs text-muted-foreground">Pass/vecka</div>
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
                          {['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'].map(
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
                                          ? 'Vila'
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
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel} disabled={exporting !== null}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportera till Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} disabled={exporting !== null}>
                <FileText className="h-4 w-4 mr-2" />
                Exportera till PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save Button */}
          {saved && savedProgramId ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                Program sparat!
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
            <Button
              onClick={handleSaveProgram}
              disabled={saving || !athleteId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Spara program
                </>
              )}
            </Button>
          )}
        </div>

        {!athleteId && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Välj en atlet i kontextpanelen för att kunna spara programmet
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
