'use client'

/**
 * AthleteCardioClient Component
 *
 * Client component for athlete cardio sessions page.
 * Shows assigned sessions, allows browsing templates, and starting Focus Mode.
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  Activity,
  Library,
  History,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CardioSessionCard } from './CardioSessionCard'
import { CardioFocusModeWorkout } from './CardioFocusModeWorkout'
import { CardioWorkoutStartScreen } from './CardioWorkoutStartScreen'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

interface CardioSegment {
  type: SegmentType
  plannedDuration?: number
  plannedDistance?: number
  plannedZone?: number
  notes?: string
}

interface FocusModeSegment {
  id: string
  index: number
  type: SegmentType
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedPace?: number
  plannedZone?: number
  notes?: string
  actualDuration?: number
  actualDistance?: number
  actualPace?: number
  actualAvgHR?: number
  actualMaxHR?: number
  completed: boolean
  skipped: boolean
  logId?: string
}

interface CardioAssignment {
  id: string
  sessionId: string
  assignedDate: string
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'
  notes?: string
  // Scheduling fields
  startTime?: string | null
  endTime?: string | null
  locationId?: string | null
  locationName?: string | null
  location?: { id: string; name: string } | null
  session: {
    id: string
    name: string
    description?: string
    sport: string
    segments: CardioSegment[]
    totalDuration?: number
    totalDistance?: number
    tags: string[]
  }
}

interface AthleteCardioClientProps {
  clientId: string
  canAccessTemplates?: boolean
}

export function AthleteCardioClient({
  clientId,
  canAccessTemplates = false,
}: AthleteCardioClientProps) {
  const { toast } = useToast()

  // State
  const [assignments, setAssignments] = useState<CardioAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('history')

  // Focus mode state
  const [selectedAssignment, setSelectedAssignment] = useState<CardioAssignment | null>(null)
  const [showStartScreen, setShowStartScreen] = useState(false)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [focusModeData, setFocusModeData] = useState<{
    segments: FocusModeSegment[]
    sessionLogId?: string
  } | null>(null)

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/athletes/${clientId}/cardio-sessions`)
      const result = await response.json()

      if (result.success) {
        setAssignments(result.data.assignments || [])
      }
    } catch {
      toast({
        title: 'Fel',
        description: 'Kunde inte hämta dina cardiopass',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [clientId, toast])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // Start focus mode
  const handleStartFocusMode = async (assignmentId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId)
    if (!assignment) return

    setSelectedAssignment(assignment)
    setShowStartScreen(true)
  }

  // Segment type names in Swedish
  const SEGMENT_TYPE_NAMES: Record<SegmentType, string> = {
    WARMUP: 'Uppvärmning',
    COOLDOWN: 'Nedvarvning',
    INTERVAL: 'Intervall',
    STEADY: 'Jämnt tempo',
    RECOVERY: 'Återhämtning',
    HILL: 'Backar',
    DRILLS: 'Övningar',
  }

  // Transform raw segments to FocusModeSegment format
  const transformSegments = (
    segments: CardioSegment[],
    existingLogs?: { segmentIndex: number; completed: boolean; skipped: boolean; id: string }[]
  ): FocusModeSegment[] => {
    return segments.map((seg, index) => {
      const existingLog = existingLogs?.find((l) => l.segmentIndex === index)
      return {
        id: existingLog?.id || `seg-${index}`,
        index,
        type: seg.type,
        typeName: SEGMENT_TYPE_NAMES[seg.type] || seg.type,
        plannedDuration: seg.plannedDuration,
        plannedDistance: seg.plannedDistance,
        plannedZone: seg.plannedZone,
        notes: seg.notes,
        completed: existingLog?.completed || false,
        skipped: existingLog?.skipped || false,
        logId: existingLog?.id,
      }
    })
  }

  // Confirm start and fetch focus mode data
  const handleConfirmStart = async () => {
    if (!selectedAssignment) return

    try {
      const response = await fetch(
        `/api/cardio-sessions/${selectedAssignment.id}/focus-mode`,
        { method: 'GET' }
      )
      const result = await response.json()

      if (result.success) {
        const rawSegments = result.data.session?.segments || selectedAssignment.session.segments
        const segmentLogs = result.data.sessionLog?.segmentLogs || []
        const transformedSegments = transformSegments(rawSegments as CardioSegment[], segmentLogs)

        setFocusModeData({
          segments: transformedSegments,
          sessionLogId: result.data.sessionLog?.id,
        })
        setShowStartScreen(false)
        setShowFocusMode(true)

        // Start session if not already started
        if (!result.data.sessionLog) {
          await fetch(`/api/cardio-sessions/${selectedAssignment.id}/focus-mode`, {
            method: 'POST',
          })
        }
      }
    } catch {
      toast({
        title: 'Fel',
        description: 'Kunde inte starta Focus Mode',
        variant: 'destructive',
      })
    }
  }

  // Handle focus mode completion
  const handleFocusModeComplete = async (data: {
    sessionRPE: number
    notes?: string
  }) => {
    if (!selectedAssignment) return

    try {
      await fetch(`/api/cardio-sessions/${selectedAssignment.id}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          sessionRPE: data.sessionRPE,
          notes: data.notes,
        }),
      })

      toast({
        title: 'Pass slutfört!',
        description: 'Bra jobbat! Ditt pass har sparats.',
      })

      // Refresh assignments
      fetchAssignments()
    } catch {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara passet',
        variant: 'destructive',
      })
    } finally {
      handleCloseFocusMode()
    }
  }

  // Handle segment logging
  const handleSegmentComplete = async (
    segmentIndex: number,
    data: {
      actualDuration?: number
      actualDistance?: number
      actualPace?: number
      actualAvgHR?: number
      actualMaxHR?: number
      completed: boolean
      skipped: boolean
      notes?: string
    }
  ) => {
    if (!selectedAssignment) return

    try {
      await fetch(
        `/api/cardio-sessions/${selectedAssignment.id}/segments/${segmentIndex}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
    } catch {
      // Silent fail - segment logging is not critical
      console.error('Failed to log segment:', segmentIndex)
    }
  }

  // Close focus mode
  const handleCloseFocusMode = () => {
    setShowFocusMode(false)
    setShowStartScreen(false)
    setSelectedAssignment(null)
    setFocusModeData(null)
  }

  // Filter assignments by status
  const upcomingAssignments = assignments.filter(
    (a) => a.status === 'PENDING' || a.status === 'SCHEDULED'
  )
  const completedAssignments = assignments.filter((a) => a.status === 'COMPLETED')

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hours}h ${remainingMins}min`
    }
    return `${mins} min`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Helper to compute segments by type
  const computeSegmentsByType = (segments: CardioSegment[]) => {
    const result: Record<string, { count: number; totalDuration: number }> = {}
    segments.forEach((seg) => {
      if (!result[seg.type]) {
        result[seg.type] = { count: 0, totalDuration: 0 }
      }
      result[seg.type].count++
      result[seg.type].totalDuration += seg.plannedDuration || 0
    })
    return result
  }

  // Render focus mode screens
  if (showStartScreen && selectedAssignment) {
    const segmentsByType = computeSegmentsByType(selectedAssignment.session.segments)
    return (
      <CardioWorkoutStartScreen
        sessionName={selectedAssignment.session.name}
        description={selectedAssignment.session.description}
        sport={selectedAssignment.session.sport}
        segments={selectedAssignment.session.segments}
        segmentsByType={segmentsByType}
        totalDuration={selectedAssignment.session.totalDuration}
        totalDistance={selectedAssignment.session.totalDistance}
        onStart={handleConfirmStart}
        onCancel={() => {
          setShowStartScreen(false)
          setSelectedAssignment(null)
        }}
      />
    )
  }

  if (showFocusMode && selectedAssignment && focusModeData) {
    return (
      <CardioFocusModeWorkout
        assignmentId={selectedAssignment.id}
        sessionName={selectedAssignment.session.name}
        sessionDescription={selectedAssignment.session.description}
        sport={selectedAssignment.session.sport}
        segments={focusModeData.segments}
        onClose={handleCloseFocusMode}
        onComplete={handleFocusModeComplete}
        onSegmentComplete={handleSegmentComplete}
      />
    )
  }


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">Cardio Pass</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
          Dina löppass, cykelpass och andra konditionspass
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <TabsTrigger
            value="history"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all font-bold"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historik</span>
          </TabsTrigger>
          {canAccessTemplates && (
            <TabsTrigger
              value="templates"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all font-bold"
            >
              <Library className="h-4 w-4" />
              <span className="hidden sm:inline">Mallar</span>
            </TabsTrigger>
          )}
          <TabsTrigger
            value="upcoming"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all font-bold"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Tilldelade</span>
            {upcomingAssignments.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-100">
                {upcomingAssignments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Sessions */}
        <TabsContent value="upcoming" className="mt-8">
          {upcomingAssignments.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-3xl">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Inga kommande pass</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
                Din tränare har inte tilldelat några cardiopass ännu.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingAssignments.map((assignment) => (
                <CardioSessionCard
                  key={assignment.id}
                  id={assignment.id}
                  sessionId={assignment.sessionId}
                  sessionName={assignment.session.name}
                  description={assignment.session.description}
                  sport={assignment.session.sport}
                  assignedDate={assignment.assignedDate}
                  status={assignment.status}
                  totalDuration={assignment.session.totalDuration}
                  totalDistance={assignment.session.totalDistance}
                  segmentCount={assignment.session.segments.length}
                  notes={assignment.notes}
                  startTime={assignment.startTime}
                  endTime={assignment.endTime}
                  locationName={assignment.locationName}
                  location={assignment.location}
                  onStartFocusMode={handleStartFocusMode}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-8">
          {completedAssignments.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-3xl">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="h-8 w-8 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Ingen historik ännu</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Slutförda pass visas här.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-5 bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-2xl hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                      <Activity className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">{assignment.session.name}</h4>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(assignment.assignedDate).toLocaleDateString('sv-SE')}
                        </span>
                        {assignment.session.totalDuration && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {formatDuration(assignment.session.totalDuration)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 font-bold uppercase tracking-wide">Slutförd</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates (PRO+) */}
        {canAccessTemplates && (
          <TabsContent value="templates" className="mt-8">
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-3xl">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Library className="h-8 w-8 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Mallbibliotek</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
                Bläddra bland systemmallar och skapa egna pass.
              </p>
              <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 font-bold">
                Bläddra mallar
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default AthleteCardioClient