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
  const [activeTab, setActiveTab] = useState('upcoming')

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cardio Pass</h1>
          <p className="text-muted-foreground">
            Dina löppass, cykelpass och andra konditionspass
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Kommande</span>
            {upcomingAssignments.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {upcomingAssignments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historik</span>
          </TabsTrigger>
          {canAccessTemplates && (
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              <span className="hidden sm:inline">Mallar</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Upcoming Sessions */}
        <TabsContent value="upcoming" className="mt-6">
          {upcomingAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Inga kommande pass</h3>
              <p className="text-muted-foreground">
                Din tränare har inte tilldelat några cardiopass ännu.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  onStartFocusMode={handleStartFocusMode}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-6">
          {completedAssignments.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Ingen historik ännu</h3>
              <p className="text-muted-foreground">
                Slutförda pass visas här.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <h4 className="font-medium">{assignment.session.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(assignment.assignedDate).toLocaleDateString('sv-SE')}
                        {assignment.session.totalDuration && (
                          <>
                            <Clock className="h-3 w-3 ml-2" />
                            {formatDuration(assignment.session.totalDuration)}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Slutförd</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates (PRO+) */}
        {canAccessTemplates && (
          <TabsContent value="templates" className="mt-6">
            <div className="text-center py-12">
              <Library className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Mallbibliotek</h3>
              <p className="text-muted-foreground mb-4">
                Bläddra bland systemmallar och skapa egna pass.
              </p>
              <Button variant="outline">
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