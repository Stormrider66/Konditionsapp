'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Users,
  Clock,
  MapPin,
  Loader2,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ClassSchedule {
  id: string
  className: string
  classType: string
  startTime: string
  endTime: string
  coachName: string
  locationName: string | null
  maxCapacity: number
  bookedCount: number
  checkedInCount: number
  status: string
  color: string | null
}

const classTypeLabels: Record<string, string> = {
  SPINNING: 'Spinning',
  HIIT: 'HIIT',
  YOGA: 'Yoga',
  CIRCUIT: 'Cirkelträning',
  CROSSFIT: 'CrossFit',
  BODY_PUMP: 'Body Pump',
  STRETCHING: 'Stretching',
  OTHER: 'Övrigt',
}

const classTypeColors: Record<string, string> = {
  SPINNING: 'bg-yellow-500',
  HIIT: 'bg-red-500',
  YOGA: 'bg-purple-500',
  CIRCUIT: 'bg-orange-500',
  CROSSFIT: 'bg-blue-500',
  BODY_PUMP: 'bg-green-500',
  STRETCHING: 'bg-teal-500',
  OTHER: 'bg-slate-500',
}

interface GymClassesCardProps {
  basePath: string
}

export function GymClassesCard({ basePath }: GymClassesCardProps) {
  const [classes, setClasses] = useState<ClassSchedule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClasses = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/coach/gym/classes/today?date=${today}`)
      if (res.ok) {
        const data = await res.json()
        setClasses(data.classes || [])
      }
    } catch {
      // ignore — API may not exist yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  return (
    <GlassCard>
      <GlassCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            Gruppträning idag
          </GlassCardTitle>
          {classes.length > 0 && (
            <Badge variant="secondary" className="text-xs">{classes.length}</Badge>
          )}
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Inga gruppklasser idag</p>
            <p className="text-xs mt-1">Skapa klasser för att visa dem här</p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.slice(0, 5).map(cls => (
              <div key={cls.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 dark:bg-white/5">
                <div className={cn(
                  'w-1 h-10 rounded-full flex-shrink-0',
                  cls.color || classTypeColors[cls.classType] || 'bg-slate-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate dark:text-slate-200">{cls.className}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(cls.startTime).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {cls.locationName && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {cls.locationName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className={cn(
                      'text-sm font-medium',
                      cls.bookedCount >= cls.maxCapacity ? 'text-red-500' : 'dark:text-slate-200'
                    )}>
                      {cls.bookedCount}/{cls.maxCapacity}
                    </span>
                  </div>
                  {cls.checkedInCount > 0 && (
                    <p className="text-[10px] text-green-600">{cls.checkedInCount} incheckade</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
