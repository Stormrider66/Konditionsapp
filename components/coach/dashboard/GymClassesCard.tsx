'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
import { Badge } from '@/components/ui/badge'
import { CardLoadError } from '@/components/coach/dashboard/CardLoadError'
import {
  Calendar,
  Users,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'

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

export function GymClassesCard({ basePath: _basePath }: GymClassesCardProps) {
  const t = useTranslations('components.gymClassesCard')
  const locale = useLocale()
  const timeLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [classes, setClasses] = useState<ClassSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const fetchClasses = useCallback(async () => {
    setLoadFailed(false)
    try {
      // Classes come from synced gym platforms. (An internal classes API
      // was once planned — /api/coach/gym/classes/today — but never built;
      // there is no GymClass model.)
      const [syncedRes] = await Promise.allSettled([
        fetch('/api/coach/gym-platform/synced-classes'),
      ])

      const allClasses: ClassSchedule[] = []

      if (syncedRes.status === 'rejected' || !syncedRes.value.ok) {
        setLoadFailed(true)
      }

      if (syncedRes.status === 'fulfilled' && syncedRes.value.ok) {
        const data = await syncedRes.value.json()
        const synced = (data.classes || []).map((c: Record<string, unknown>) => ({
          id: c.id,
          className: c.name,
          classType: 'OTHER',
          startTime: c.startTime,
          endTime: c.endTime,
          coachName: c.instructor || '',
          locationName: c.location || null,
          maxCapacity: c.maxCapacity || 0,
          bookedCount: c.bookedCount || 0,
          checkedInCount: 0,
          status: 'SCHEDULED',
          color: null,
          source: c.provider,
        }))
        allClasses.push(...synced)
      }

      // Sort by start time
      allClasses.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      setClasses(allClasses)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchClasses()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchClasses])

  return (
    <GlassCard glow="purple" className="group">
      <GlassCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            {t('title')}
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
        ) : loadFailed ? (
          <CardLoadError onRetry={() => void fetchClasses()} />
        ) : classes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('empty.title')}</p>
            <p className="text-xs mt-1">{t('empty.description')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.slice(0, 5).map(cls => (
              <div key={cls.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                <div className={cn(
                  'w-1 h-10 rounded-full flex-shrink-0',
                  cls.color || classTypeColors[cls.classType] || 'bg-slate-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate dark:text-slate-200">{cls.className}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(cls.startTime).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}
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
                    <p className="text-[10px] text-green-600">{t('checkedIn', { count: cls.checkedInCount })}</p>
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
