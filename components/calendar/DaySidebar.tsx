// components/calendar/DaySidebar.tsx
'use client'

/**
 * Day Sidebar Component
 * 
 * Shows details for the selected day including all events, workouts, etc.
 */

import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useLocale, useTranslations } from '@/i18n/client'
import {
  Plus,
  Clock,
  Activity,
  Heart,
  Target,
  ChevronRight,
  Thermometer,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { UnifiedCalendarItem } from './types'
import { PostEventMonitor } from './PostEventMonitor'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/GlassCard'

import { WODItem, WorkoutItem, RaceItem, CalendarEventItem, FieldTestItem, CheckInItem, AdHocItem, QuickErgItem } from './day-sidebar/item-cards'
import { WorkoutDetailPanel } from './day-sidebar/detail-panels/workout'
import { AdHocDetailPanel } from './day-sidebar/detail-panels/adhoc'
import { QuickErgDetailPanel } from './day-sidebar/detail-panels/quick-erg'
import { RaceDetailPanel } from './day-sidebar/detail-panels/race'
import { FieldTestDetailPanel } from './day-sidebar/detail-panels/field-test'

interface DaySidebarProps {
  clientId: string
  date: Date | null
  items: UnifiedCalendarItem[]
  selectedItem: UnifiedCalendarItem | null
  onItemClick: (item: UnifiedCalendarItem) => void
  onAddEvent: () => void
  onEditEvent: (item: UnifiedCalendarItem) => void
  onEventDeleted: () => void
  onCopyScheduledWorkout?: (item: UnifiedCalendarItem, targetDate: Date) => Promise<boolean | void> | boolean | void
  isCoachView?: boolean
  variant?: 'default' | 'glass'
  onViewWorkoutDetails?: (workoutId: string) => void
}

export function DaySidebar({
  clientId,
  date,
  items,
  selectedItem,
  onItemClick,
  onAddEvent,
  onEditEvent,
  onEventDeleted,
  onCopyScheduledWorkout,
  isCoachView,
  variant = 'default',
  onViewWorkoutDetails,
}: DaySidebarProps) {
  const isGlass = variant === 'glass'
  const t = useTranslations('components.daySidebar')
  const locale = useLocale()
  const dateLocale = locale?.startsWith('sv') ? sv : enUS

  if (!date) {
    if (isGlass) {
      return (
        <GlassCard className="w-full lg:w-80 shrink-0">
          <GlassCardContent className="p-12 text-center text-slate-500 font-medium h-[250px] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center">
              <ChevronRight className="h-6 w-6 text-slate-500 opacity-50" />
            </div>
            <p className="text-sm">{t('emptyState.selectDayHint')}</p>
          </GlassCardContent>
        </GlassCard>
      )
    }
    return (
      <Card className="w-full lg:w-80 shrink-0">
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>{t('emptyState.selectDayHint')}</p>
        </CardContent>
      </Card>
    )
  }

  const workouts = items.filter((i) => i.type === 'WORKOUT')
  const races = items.filter((i) => i.type === 'RACE')
  const events = items.filter((i) => i.type === 'CALENDAR_EVENT')
  const fieldTests = items.filter((i) => i.type === 'FIELD_TEST')
  const checkIns = items.filter((i) => i.type === 'CHECK_IN')
  const wods = items.filter((i) => i.type === 'WOD')
  const adHocWorkouts = items.filter((i) => i.type === 'AD_HOC')
  const quickErgSessions = items.filter((i) => i.type === 'QUICK_ERG')

  if (isGlass) {
    return (
      <GlassCard className="w-full lg:w-80 shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto">
        <GlassCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-xl font-black capitalize text-white tracking-tight">
              {format(date, 'EEEE d MMMM', { locale: dateLocale })}
            </GlassCardTitle>
            <Button variant="ghost" size="icon" onClick={onAddEvent} className="hover:bg-white/10 text-slate-400">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </GlassCardHeader>

        <GlassCardContent className="space-y-6 pt-2">
          {items.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-slate-500 gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-500/5 flex items-center justify-center">
                <Clock className="h-5 w-5 opacity-20" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-50">
                {t('emptyState.noEvents')}
              </p>
            </div>
          ) : (
            <>
              {workouts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    {t('sections.workouts')} ({workouts.length})
                  </h4>
                  <div className="space-y-2.5">
                    {workouts.map((workout) => (
                      <WorkoutItem
                        key={workout.id}
                        workout={workout}
                        isSelected={selectedItem?.id === workout.id}
                        onClick={() => onItemClick(workout)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {wods.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    {t('sections.aiWorkouts')} ({wods.length})
                  </h4>
                  <div className="space-y-2.5">
                    {wods.map((wod) => (
                      <WODItem
                        key={wod.id}
                        wod={wod}
                        isSelected={selectedItem?.id === wod.id}
                        onClick={() => onItemClick(wod)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {adHocWorkouts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-500" />
                    {t('sections.adhocWorkouts')} ({adHocWorkouts.length})
                  </h4>
                  <div className="space-y-2.5">
                    {adHocWorkouts.map((adHocWorkout) => (
                      <AdHocItem
                        key={adHocWorkout.id}
                        workout={adHocWorkout}
                        isSelected={selectedItem?.id === adHocWorkout.id}
                        onClick={() => onItemClick(adHocWorkout)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {quickErgSessions.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-lime-500" />
                    {t('sections.quickErg')} ({quickErgSessions.length})
                  </h4>
                  <div className="space-y-2.5">
                    {quickErgSessions.map((session) => (
                      <QuickErgItem
                        key={session.id}
                        session={session}
                        isSelected={selectedItem?.id === session.id}
                        onClick={() => onItemClick(session)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {races.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-500" />
                    {t('sections.races')}
                  </h4>
                  <div className="space-y-2.5">
                    {races.map((race) => (
                      <RaceItem
                        key={race.id}
                        race={race}
                        isSelected={selectedItem?.id === race.id}
                        onClick={() => onItemClick(race)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {events.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    {t('sections.events')}
                  </h4>
                  <div className="space-y-2.5">
                    {events.map((event) => (
                      <CalendarEventItem
                        key={event.id}
                        clientId={clientId}
                        event={event}
                        isSelected={selectedItem?.id === event.id}
                        onClick={() => onItemClick(event)}
                        onEdit={() => onEditEvent(event)}
                        onDeleted={onEventDeleted}
                        onCopyScheduledWorkout={onCopyScheduledWorkout}
                        isCoachView={isCoachView}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {fieldTests.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-green-500" />
                    {t('sections.fieldTests')}
                  </h4>
                  <div className="space-y-2.5">
                    {fieldTests.map((test) => (
                      <FieldTestItem
                        key={test.id}
                        test={test}
                        isSelected={selectedItem?.id === test.id}
                        onClick={() => onItemClick(test)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {checkIns.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    {t('sections.dailyCheckIns')}
                  </h4>
                  <div className="space-y-2.5">
                    {checkIns.map((checkIn) => (
                      <CheckInItem
                        key={checkIn.id}
                        checkIn={checkIn}
                        isSelected={selectedItem?.id === checkIn.id}
                        onClick={() => onItemClick(checkIn)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedItem?.type === 'CALENDAR_EVENT' &&
                (selectedItem.metadata.eventType === 'ILLNESS' ||
                  selectedItem.metadata.eventType === 'ALTITUDE_CAMP') && (
                  <div className="mt-6">
                    <PostEventMonitor
                      eventType={selectedItem.metadata.eventType as 'ILLNESS' | 'ALTITUDE_CAMP'}
                      eventData={{
                        startDate: new Date(selectedItem.date),
                        endDate: selectedItem.endDate ? new Date(selectedItem.endDate) : new Date(selectedItem.date),
                        illnessType: selectedItem.metadata.illnessType as string | undefined,
                        hadFever: selectedItem.metadata.hadFever as boolean | undefined,
                        feverDays: selectedItem.metadata.feverDays as number | undefined,
                        symptomsBelowNeck: selectedItem.metadata.symptomsBelowNeck as boolean | undefined,
                        medicalClearance: selectedItem.metadata.medicalClearance as boolean | undefined,
                        returnToTrainingDate: selectedItem.metadata.returnToTrainingDate
                          ? new Date(selectedItem.metadata.returnToTrainingDate as string)
                          : undefined,
                        altitude: selectedItem.metadata.altitude as number | undefined,
                      }}
                      variant="glass"
                    />
                  </div>
                )}

            {selectedItem?.type === 'WORKOUT' && (
              <WorkoutDetailPanel
                workout={selectedItem}
                isGlass={true}
                onViewWorkoutDetails={onViewWorkoutDetails}
              />
            )}

              {selectedItem?.type === 'AD_HOC' && (
                <AdHocDetailPanel workout={selectedItem} isGlass={true} />
              )}

              {selectedItem?.type === 'QUICK_ERG' && (
                <QuickErgDetailPanel session={selectedItem} isGlass={true} />
              )}

              {selectedItem?.type === 'RACE' && (
                <RaceDetailPanel race={selectedItem} isGlass={true} />
              )}

              {selectedItem?.type === 'FIELD_TEST' && (
                <FieldTestDetailPanel test={selectedItem} isGlass={true} />
              )}
            </>
          )}

          <div className="pt-4 mt-6 border-t border-white/5">
            <Button
              variant="ghost"
              className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all h-10"
              onClick={onAddEvent}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('actions.addEvent')}
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <Card className="w-full lg:w-80 shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">
            {format(date, 'EEEE d MMMM', { locale: dateLocale })}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onAddEvent}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('emptyState.noEventsToday')}
          </p>
        ) : (
          <>
            {workouts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  {t('sections.workouts')} ({workouts.length})
                </h4>
                <div className="space-y-2">
                  {workouts.map((workout) => (
                    <WorkoutItem
                      key={workout.id}
                      workout={workout}
                      isSelected={selectedItem?.id === workout.id}
                      onClick={() => onItemClick(workout)}
                    />
                  ))}
                </div>
              </div>
            )}

            {wods.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  {t('sections.aiWorkouts')} ({wods.length})
                </h4>
                <div className="space-y-2">
                  {wods.map((wod) => (
                    <WODItem
                      key={wod.id}
                      wod={wod}
                      isSelected={selectedItem?.id === wod.id}
                      onClick={() => onItemClick(wod)}
                    />
                  ))}
                </div>
              </div>
            )}

            {adHocWorkouts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-500" />
                  {t('sections.adhocWorkouts')} ({adHocWorkouts.length})
                </h4>
                <div className="space-y-2">
                  {adHocWorkouts.map((adHocWorkout) => (
                    <AdHocItem
                      key={adHocWorkout.id}
                      workout={adHocWorkout}
                      isSelected={selectedItem?.id === adHocWorkout.id}
                      onClick={() => onItemClick(adHocWorkout)}
                    />
                  ))}
                </div>
              </div>
            )}

            {quickErgSessions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-lime-500" />
                  {t('sections.quickErg')} ({quickErgSessions.length})
                </h4>
                <div className="space-y-2">
                  {quickErgSessions.map((session) => (
                    <QuickErgItem
                      key={session.id}
                      session={session}
                      isSelected={selectedItem?.id === session.id}
                      onClick={() => onItemClick(session)}
                    />
                  ))}
                </div>
              </div>
            )}

            {races.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-500" />
                  {t('sections.races')}
                </h4>
                <div className="space-y-2">
                  {races.map((race) => (
                    <RaceItem
                      key={race.id}
                      race={race}
                      isSelected={selectedItem?.id === race.id}
                      onClick={() => onItemClick(race)}
                    />
                  ))}
                </div>
              </div>
            )}

            {events.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  {t('sections.events')}
                </h4>
                <div className="space-y-2">
                  {events.map((event) => (
                    <CalendarEventItem
                      key={event.id}
                      clientId={clientId}
                      event={event}
                      isSelected={selectedItem?.id === event.id}
                      onClick={() => onItemClick(event)}
                      onEdit={() => onEditEvent(event)}
                      onDeleted={onEventDeleted}
                      onCopyScheduledWorkout={onCopyScheduledWorkout}
                      isCoachView={isCoachView}
                    />
                  ))}
                </div>
              </div>
            )}

            {fieldTests.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-green-500" />
                  {t('sections.fieldTests')}
                </h4>
                <div className="space-y-2">
                  {fieldTests.map((test) => (
                    <FieldTestItem
                      key={test.id}
                      test={test}
                      isSelected={selectedItem?.id === test.id}
                      onClick={() => onItemClick(test)}
                    />
                  ))}
                </div>
              </div>
            )}

            {checkIns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-gray-500" />
                  {t('sections.dailyCheckIns')}
                </h4>
                <div className="space-y-2">
                  {checkIns.map((checkIn) => (
                    <CheckInItem
                      key={checkIn.id}
                      checkIn={checkIn}
                      isSelected={selectedItem?.id === checkIn.id}
                      onClick={() => onItemClick(checkIn)}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedItem?.type === 'CALENDAR_EVENT' &&
              (selectedItem.metadata.eventType === 'ILLNESS' ||
                selectedItem.metadata.eventType === 'ALTITUDE_CAMP') && (
                <div className="mt-4">
                  <PostEventMonitor
                    eventType={selectedItem.metadata.eventType as 'ILLNESS' | 'ALTITUDE_CAMP'}
                    eventData={{
                      startDate: new Date(selectedItem.date),
                      endDate: selectedItem.endDate ? new Date(selectedItem.endDate) : new Date(selectedItem.date),
                      illnessType: selectedItem.metadata.illnessType as string | undefined,
                      hadFever: selectedItem.metadata.hadFever as boolean | undefined,
                      feverDays: selectedItem.metadata.feverDays as number | undefined,
                      symptomsBelowNeck: selectedItem.metadata.symptomsBelowNeck as boolean | undefined,
                      medicalClearance: selectedItem.metadata.medicalClearance as boolean | undefined,
                      returnToTrainingDate: selectedItem.metadata.returnToTrainingDate
                        ? new Date(selectedItem.metadata.returnToTrainingDate as string)
                        : undefined,
                      altitude: selectedItem.metadata.altitude as number | undefined,
                    }}
                  />
                </div>
              )}

            {selectedItem?.type === 'WORKOUT' && (
              <WorkoutDetailPanel
                workout={selectedItem}
                onViewWorkoutDetails={onViewWorkoutDetails}
              />
            )}

            {selectedItem?.type === 'AD_HOC' && (
              <AdHocDetailPanel workout={selectedItem} />
            )}

            {selectedItem?.type === 'QUICK_ERG' && (
              <QuickErgDetailPanel session={selectedItem} />
            )}

            {selectedItem?.type === 'RACE' && (
              <RaceDetailPanel race={selectedItem} />
            )}

            {selectedItem?.type === 'FIELD_TEST' && (
              <FieldTestDetailPanel test={selectedItem} />
            )}
          </>
        )}

        <Separator />

        <Button variant="outline" className="w-full" onClick={onAddEvent}>
          <Plus className="h-4 w-4 mr-2" />
          {t('actions.addEvent')}
        </Button>
      </CardContent>
    </Card>
  )
}

// Sub-components for different item types

// ── WOD Item ──────────────────────────────────────────────────────────────
