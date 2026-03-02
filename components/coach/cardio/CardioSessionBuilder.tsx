'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Plus, Trash2, Timer, Activity, Footprints, Calendar, Heart, Gauge, Repeat, Download, Loader2, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { toast } from 'sonner'
import { SessionExportButton } from '@/components/exports/SessionExportButton'
import type { CardioSessionData, CardioSegment as CardioSegmentType } from '@/types'

// Types
type CardioSegment = {
  id: string
  type: 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'
  duration?: number // minutes
  distance?: number // km
  zone: string
  pace?: string // "5:30/km"
  heartRate?: string // "145-155 bpm"
  notes?: string
  repeats?: number // for intervals
  restDuration?: number // min, for interval repeats
  distanceUnit?: 'km' | 'm'
}

// Mock segments available to add
const AVAILABLE_SEGMENTS = [
  { id: 'seg1', name: 'Warmup (10 min)', type: 'WARMUP', defaultDuration: 10, defaultZone: '1' },
  { id: 'seg2', name: 'Steady Run (30 min)', type: 'STEADY', defaultDuration: 30, defaultZone: '2' },
  { id: 'seg3', name: 'Interval (3 min)', type: 'INTERVAL', defaultDuration: 3, defaultZone: '4' },
  { id: 'seg4', name: 'Recovery (2 min)', type: 'RECOVERY', defaultDuration: 2, defaultZone: '1' },
  { id: 'seg5', name: 'Cooldown (10 min)', type: 'COOLDOWN', defaultDuration: 10, defaultZone: '1' },
  { id: 'seg6', name: 'Hill Sprints', type: 'HILL', defaultDuration: 0, defaultZone: '5', notes: 'Max effort uphill' },
  { id: 'seg7', name: 'Running Drills', type: 'DRILLS', defaultDuration: 10, defaultZone: '1', notes: 'Focus on technique' },
]

// Helper functions for auto-calculation
const paceToDecimal = (pace: string): number | null => {
  if (!pace) return null
  // Handle 5.30 and 5,30 formats by replacing . and , with :
  const normalized = pace.replace(/[.,]/g, ':')
  const parts = normalized.split(':')
  if (parts.length !== 2) return null
  const min = parseInt(parts[0])
  const sec = parseInt(parts[1])
  if (isNaN(min) || isNaN(sec)) return null
  return min + (sec / 60)
}

const decimalToPace = (decimal: number): string => {
  const min = Math.floor(decimal)
  const sec = Math.round((decimal - min) * 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

interface CardioSessionBuilderProps {
  initialData?: CardioSessionData | null
  onSaved?: (sessionId?: string) => void
  onCancel?: () => void
}

export function CardioSessionBuilder({ initialData, onSaved, onCancel }: CardioSessionBuilderProps) {
  const searchParams = useSearchParams()
  const workoutId = searchParams.get('workoutId')
  const programId = searchParams.get('programId')

  const [sessionName, setSessionName] = useState('Nytt Konditionspass')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState('RUNNING')
  const [segments, setSegments] = useState<CardioSegment[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionDate, setSessionDate] = useState<Date | null>(null)
  const [repeatCount, setRepeatCount] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [userZones, setUserZones] = useState<any>(null)

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setSessionName(initialData.name)
      setDescription(initialData.description || '')
      setSport(initialData.sport || 'RUNNING')
      setSegments(
        initialData.segments.map((s) => ({
          id: s.id || Math.random().toString(36).substr(2, 9),
          type: s.type as CardioSegment['type'],
          duration: s.duration,
          distance: s.distance,
          zone: s.zone ? String(s.zone) : '1',
          pace: s.pace || '',
          notes: s.notes || '',
          distanceUnit: (s.distance && s.distance < 1) ? 'm' : 'km',
        }))
      )
    } else {
      // Reset form for new session
      setSessionName('Nytt Konditionspass')
      setDescription('')
      setSport('RUNNING')
      setSegments([])
    }
  }, [initialData])

  useEffect(() => {
    async function loadWorkout() {
      if (!workoutId) {
        // If new session, default to today if not set
        if (!sessionDate) setSessionDate(new Date())
        
        // Fetch zones if programId is available
        if (programId) {
            try {
                const res = await fetch(`/api/programs/${programId}/zones`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.zones) setUserZones(data.zones)
                }
            } catch (e) {
                console.error("Failed to load zones", e)
            }
        }
        return
      }

      try {
        const res = await fetch(`/api/workouts/${workoutId}`)
        if (!res.ok) throw new Error('Failed to load workout')
        
        const data = await res.json()
        setSessionName(data.name)
        if (data.zones) setUserZones(data.zones)
        
        if (data.day && data.day.date) {
          setSessionDate(new Date(data.day.date))
        }
        
        // Map segments
        const mappedSegments: CardioSegment[] = data.segments.map((s: any) => ({
          id: s.id,
          type: s.type as any,
          duration: s.duration || undefined,
          distance: s.distance || undefined,
          zone: s.zone ? s.zone.toString() : '1',
          pace: s.pace || '',
          heartRate: s.heartRate || '',
          notes: s.notes || '',
          distanceUnit: (s.distance && s.distance < 1) ? 'm' : 'km'
        }))
        
        setSegments(mappedSegments)
      } catch (error) {
        console.error('Error loading workout:', error)
        setSessionName('Error loading workout')
        toast.error('Fel', {
          description: 'Kunde inte ladda träningspasset.',
        })
      }
    }

    loadWorkout()
  }, [workoutId, programId, sessionDate])

  const handleSaveToLibrary = async () => {
    if (segments.length === 0) {
      toast.error('Lägg till segment', {
        description: 'Du måste lägga till minst ett segment för att spara passet.',
      })
      return
    }

    setIsSaving(true)
    try {
      const segmentData = segments.map((s) => ({
        id: s.id,
        type: s.type,
        duration: s.duration ? Math.round(s.duration * 60) : undefined, // Convert minutes to seconds
        distance: s.distance ? Math.round(s.distance * 1000) : undefined, // Convert km to meters
        zone: s.zone ? parseInt(s.zone) : undefined,
        pace: s.pace || undefined,
        notes: s.notes || undefined,
      }))

      const payload = {
        name: sessionName,
        description: description || undefined,
        sport,
        segments: segmentData,
      }

      const isEditing = initialData?.id
      const url = isEditing
        ? `/api/cardio-sessions/${initialData.id}`
        : '/api/cardio-sessions'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(isEditing ? 'Pass uppdaterat!' : 'Pass sparat!', {
          description: `"${sessionName}" har ${isEditing ? 'uppdaterats' : 'sparats'}.`,
        })
        onSaved?.(result.id || initialData?.id)
      } else {
        const data = await response.json()
        toast.error('Kunde inte spara', {
          description: data.error || 'Ett fel uppstod.',
        })
      }
    } catch (error) {
      console.error('Failed to save session:', error)
      toast.error('Kunde inte spara', {
        description: 'Ett oväntat fel uppstod.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSegments((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    setActiveId(null)
  }

  const addSegment = (templateId: string) => {
    const template = AVAILABLE_SEGMENTS.find(s => s.id === templateId)
    if (!template) return

    const newSegment: CardioSegment = {
      id: Math.random().toString(36).substr(2, 9),
      type: template.type as any,
      duration: template.defaultDuration || undefined,
      zone: template.defaultZone,
      notes: template.notes || '',
      distanceUnit: (template.type === 'INTERVAL' || template.type === 'HILL') ? 'm' : 'km'
    }

    setSegments([...segments, newSegment])
  }

  const removeSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id))
  }

  const updateSegment = (id: string, field: keyof CardioSegment, value: any) => {
    setSegments(segments.map(s => {
      if (s.id !== id) return s

      const updated = { ...s }

      // Handle distance unit conversion immediately so state is always in KM
      if (field === 'distance') {
        const distValue = typeof value === 'string' ? parseFloat(value) : value
        if (updated.distanceUnit === 'm') {
            updated.distance = distValue ? distValue / 1000 : undefined
        } else {
            updated.distance = distValue || undefined
        }
      } else {
        // Direct update for other fields
        // @ts-ignore
        updated[field] = value

        // Auto-calculate Heart Rate if Zone changes
        if (field === 'zone' && userZones) {
           const zoneVal = parseInt(value as string)
           if (!isNaN(zoneVal)) {
               let zoneData = null
               
               // Try array access (assuming index = zone - 1 if array)
               if (Array.isArray(userZones)) {
                   if (userZones[zoneVal - 1]) zoneData = userZones[zoneVal - 1]
               } else if (typeof userZones === 'object') {
                   // Try keys like "1", "zone1"
                   if (userZones[zoneVal]) zoneData = userZones[zoneVal]
                   else if (userZones[`zone${zoneVal}`]) zoneData = userZones[`zone${zoneVal}`]
                   else if (userZones[zoneVal.toString()]) zoneData = userZones[zoneVal.toString()]
               }
               
               if (zoneData) {
                   // Look for common property names for min/max HR
                   const min = zoneData.min ?? zoneData.from ?? zoneData.hrMin ?? zoneData.lower
                   const max = zoneData.max ?? zoneData.to ?? zoneData.hrMax ?? zoneData.upper
                   
                   if (min !== undefined && max !== undefined) {
                       updated.heartRate = `${min}-${max}`
                   }
               }
           }
        }
      }

      return updated
    }))
  }

  const calculateSegment = (id: string, triggeredField: keyof CardioSegment) => {
    setSegments(currentSegments => currentSegments.map(s => {
      if (s.id !== id) return s

      const updated = { ...s }
      
      // Auto-calculation logic triggered on blur
      // Relations: T = D * P  <=>  D = T / P  <=>  P = T / D

      if (triggeredField === 'duration') {
        const dur = updated.duration
        if (!dur || dur <= 0) return updated

        const p = updated.pace ? paceToDecimal(updated.pace) : null
        
        // If Pace exists, calculate Distance
        if (p && p > 0) {
           updated.distance = Number((dur / p).toFixed(3)) // High precision for km
        } 
        // Else if Distance exists, calculate Pace
        else if (updated.distance && updated.distance > 0) {
           const newPace = dur / updated.distance
           updated.pace = decimalToPace(newPace)
        }
      } 
      else if (triggeredField === 'distance') {
        const distKm = updated.distance
        if (!distKm || distKm <= 0) return updated
        
        const p = updated.pace ? paceToDecimal(updated.pace) : null

        // If Pace exists, calculate Duration
        if (p && p > 0) {
            updated.duration = Number((distKm * p).toFixed(1))
        } 
        // Else if Duration exists, calculate Pace
        else if (updated.duration && updated.duration > 0) {
            const newPace = updated.duration / distKm
            updated.pace = decimalToPace(newPace)
        }
      }
      else if (triggeredField === 'pace') {
        const pStr = updated.pace
        const p = pStr ? paceToDecimal(pStr) : null
        
        if (p && p > 0) {
             // If Duration exists, calculate Distance
             if (updated.duration && updated.duration > 0) {
                 updated.distance = Number((updated.duration / p).toFixed(3))
             } 
             // Else if Distance exists, calculate Duration
             else if (updated.distance && updated.distance > 0) {
                 updated.duration = Number((updated.distance * p).toFixed(1))
             }
        }
      }

      return updated
    }))
  }

  const getSessionData = () => {
    if (segments.length === 0) return null
    return {
      sessionName,
      sport,
      segments,
      date: sessionDate || new Date(),
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Builder Area */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>Passnamn</Label>
                  <Input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="text-lg font-semibold"
                    placeholder="Ge passet ett namn..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Beskrivning (valfritt)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Beskriv passets syfte eller anteckningar..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="space-y-2 w-[150px]">
                <Label>Sport</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUNNING">Löpning</SelectItem>
                    <SelectItem value="CYCLING">Cykling</SelectItem>
                    <SelectItem value="SWIMMING">Simning</SelectItem>
                    <SelectItem value="SKIING">Skidor</SelectItem>
                    <SelectItem value="TRIATHLON">Triathlon</SelectItem>
                    <SelectItem value="HYROX">HYROX</SelectItem>
                    <SelectItem value="GENERAL_FITNESS">Allmän Kondition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {onCancel && (
              <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                <span>Redigerar: {initialData?.name}</span>
                <Button variant="ghost" size="sm" onClick={onCancel} className="ml-auto">
                  <X className="h-4 w-4 mr-1" />
                  Avbryt
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 min-h-[400px] rounded-lg p-4 border-2 border-dashed border-muted-foreground/25">
              {segments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                  <Activity className="h-12 w-12 opacity-50" />
                  <p>Dra segment hit eller klicka &quot;+&quot; för att lägga till</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={segments.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {segments.map((segment) => (
                        <SortableSegmentItem
                          key={segment.id}
                          segment={segment}
                          onRemove={() => removeSegment(segment.id)}
                          onUpdate={updateSegment}
                          onCalculate={calculateSegment}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="opacity-50">
                        <SortableSegmentItem 
                          segment={segments.find(s => s.id === activeId)!} 
                          onRemove={() => {}}
                          onUpdate={() => {}}
                          onCalculate={() => {}}
                          isOverlay
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar / Tools */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Lägg till segment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {AVAILABLE_SEGMENTS.map(seg => (
              <Button
                key={seg.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addSegment(seg.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {seg.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sammanfattning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total tid:</span>
              <span className="font-medium">
                {segments.reduce((acc, s) => acc + (s.duration || 0), 0)} min
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total distans:</span>
              <span className="font-medium">
                {segments.reduce((acc, s) => acc + (s.distance || 0), 0).toFixed(1)} km
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Snittzon:</span>
              <span className="font-medium">
                Z{Math.round(segments.reduce((acc, s) => acc + parseInt(s.zone || '0'), 0) / (segments.length || 1))}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                onClick={handleSaveToLibrary}
                disabled={isSaving || segments.length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  initialData ? 'Uppdatera pass' : 'Spara pass'
                )}
              </Button>
              <SessionExportButton
                sessionType="cardio"
                getSessionData={getSessionData}
                disabled={segments.length === 0}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SortableSegmentItem({ 
  segment, 
  onRemove, 
  onUpdate,
  onCalculate,
  isOverlay = false 
}: { 
  segment: CardioSegment
  onRemove: () => void
  onUpdate: (id: string, field: keyof CardioSegment, value: any) => void
  onCalculate: (id: string, field: keyof CardioSegment) => void
  isOverlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: segment.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-md p-3 flex items-start gap-3 group ${isOverlay ? 'shadow-lg cursor-grabbing' : ''}`}
    >
      <div {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{segment.type}</Badge>
            {segment.type === 'INTERVAL' && (
                 <div className="flex items-center gap-4 ml-2">
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Upprepa:</Label>
                        <Input 
                            type="number" 
                            min={1}
                            className="h-6 w-12 text-xs px-1" 
                            value={segment.repeats || 1}
                            onChange={(e) => onUpdate(segment.id, 'repeats', parseInt(e.target.value) || 1)}
                        />
                        <span className="text-xs text-muted-foreground">ggr</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Vila:</Label>
                        <Input 
                            type="number"
                            min={0}
                            step={0.5}
                            className="h-6 w-14 text-xs px-1" 
                            value={segment.restDuration || ''}
                            onChange={(e) => onUpdate(segment.id, 'restDuration', parseFloat(e.target.value))}
                            placeholder="min"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                    </div>
                 </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Tid (min)</Label>
            <div className="flex items-center">
              <Timer className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input 
                type="number" 
                value={segment.duration || ''} 
                onChange={(e) => onUpdate(segment.id, 'duration', parseFloat(e.target.value))}
                onBlur={() => onCalculate(segment.id, 'duration')}
                className="h-7 text-sm" 
                placeholder="min"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Distans</Label>
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <Footprints className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  type="number"
                  value={segment.distance 
                    ? (segment.distanceUnit === 'm' ? Math.round(segment.distance * 1000) : segment.distance) 
                    : ''} 
                  onChange={(e) => onUpdate(segment.id, 'distance', parseFloat(e.target.value))}
                  onBlur={() => onCalculate(segment.id, 'distance')}
                  className="h-7 pl-7 text-sm" 
                  placeholder={segment.distanceUnit || 'km'}
                />
              </div>
              <Select 
                value={segment.distanceUnit || 'km'} 
                onValueChange={(v) => onUpdate(segment.id, 'distanceUnit', v)}
              >
                <SelectTrigger className="h-7 w-[60px] text-xs px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">km</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tempo (min/km)</Label>
            <div className="flex items-center">
              <Gauge className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input 
                value={segment.pace || ''} 
                onChange={(e) => onUpdate(segment.id, 'pace', e.target.value)}
                onBlur={() => onCalculate(segment.id, 'pace')}
                className="h-7 text-sm" 
                placeholder="5:30"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Puls (bpm/zon)</Label>
            <div className="flex items-center">
              <Heart className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input 
                value={segment.heartRate || ''} 
                onChange={(e) => onUpdate(segment.id, 'heartRate', e.target.value)}
                className="h-7 text-sm" 
                placeholder="145-155"
              />
            </div>
          </div>
           <div>
            <Label className="text-xs text-muted-foreground">Zon (1-5)</Label>
            <div className="flex items-center">
              <Activity className="h-3 w-3 mr-1 text-muted-foreground" />
              <Select 
                value={segment.zone} 
                onValueChange={(v) => onUpdate(segment.id, 'zone', v)}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(z => (
                    <SelectItem key={z} value={z.toString()}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
