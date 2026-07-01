'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClipboardCheck, Library, Plus, Timer, Sparkles, BookOpen, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CardioSessionBuilder } from './CardioSessionBuilder'
import { CardioSessionLibrary } from './CardioSessionLibrary'
import { CardioTemplateLibrary } from './CardioTemplateLibrary'
import { AutoCardioDialog } from './AutoCardioDialog'
import type { CardioSessionData } from '@/types'
import { CalendarAssignDialog } from '@/components/calendar/CalendarAssignDialog'
import { ImportWorkoutDialog } from '@/components/workouts/import/ImportWorkoutDialog'
import { toCardioSessionData } from '@/components/workouts/import/converters'
import { TeamCalendarStudioContextBanner } from '@/components/coach/team-calendar/TeamCalendarStudioContextBanner'
import { useTeamCalendarWorkoutLink } from '@/lib/team-calendar/use-team-calendar-workout-link'
import { useLocale } from 'next-intl'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface CardioDashboardProps {
  businessId?: string
}

export function CardioDashboard({ businessId }: CardioDashboardProps = {}) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = React.useState(() =>
    searchParams.get('tab') === 'library' ? 'library' : 'builder'
  )
  const [editSession, setEditSession] = React.useState<CardioSessionData | null>(null)
  const [showAutoGenerate, setShowAutoGenerate] = React.useState(false)
  const [showImporter, setShowImporter] = React.useState(false)
  const teamCalendarLink = useTeamCalendarWorkoutLink('CARDIO')

  // Calendar assignment flow
  const fromCalendar = searchParams.get('fromCalendar') === 'true'
  const deployExisting = searchParams.get('deployExisting') === 'true'
  const calendarClientId = searchParams.get('clientId')
  const calendarDate = searchParams.get('date')
  const editSessionId = searchParams.get('editSessionId')
  const appliedEditSessionIdRef = React.useRef<string | null>(null)
  const [calendarAssignSessionId, setCalendarAssignSessionId] = useState<string | null>(null)

  const businessSlug = useMemo(() => {
    if (!pathname) return undefined
    const match = pathname.match(/^\/([^/]+)\/coach\//)
    if (match && match[1] !== 'coach') return match[1]
    return undefined
  }, [pathname])
  const businessHeaders = useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname])

  React.useEffect(() => {
    if (!editSessionId || appliedEditSessionIdRef.current === editSessionId) return
    appliedEditSessionIdRef.current = editSessionId

    let cancelled = false
    fetch(`/api/cardio-sessions/${editSessionId}`, {
      headers: businessHeaders,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || copy(locale, 'Could not open the cardio session', 'Kunde inte öppna konditionspasset'))
        }
        return res.json()
      })
      .then((session: CardioSessionData) => {
        if (cancelled) return
        setEditSession(session)
        setActiveTab('builder')
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(copy(locale, 'Could not open session', 'Kunde inte öppna passet'), {
          description: error instanceof Error ? error.message : undefined,
        })
      })

    return () => {
      cancelled = true
    }
  }, [businessHeaders, editSessionId, locale])

  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      <TeamCalendarStudioContextBanner />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Cardio Studio</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Design running sessions, manage intervals, and track endurance progression.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {businessSlug && (
            <Button asChild variant="outline" size="sm" className="sm:size-default">
              <Link href={`/${businessSlug}/coach/review-inbox`}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                {copy(locale, 'Review inbox', 'Granskningsinkorg')}
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowImporter(true)} size="sm" className="sm:size-default">
            <FileUp className="mr-2 h-4 w-4" />
            {copy(locale, 'Import session', 'Importera pass')}
          </Button>
          <Button variant="outline" onClick={() => setShowAutoGenerate(true)} size="sm" className="sm:size-default">
            <Sparkles className="mr-2 h-4 w-4" />
            {copy(locale, 'Auto-generate', 'Auto-generera')}
          </Button>
          <Button onClick={() => { setEditSession(null); setActiveTab('builder') }} size="sm" className="sm:size-default">
            <Plus className="mr-2 h-4 w-4" />
            {copy(locale, 'New session', 'Nytt pass')}
          </Button>
        </div>
      </div>

      <Tabs id="cardio-studio-tabs" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-1 rounded-xl gap-1">
          <TabsTrigger value="builder" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">
            <Timer className="h-4 w-4" />
            {copy(locale, 'Create session', 'Skapa pass')}
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">
            <Library className="h-4 w-4" />
            {copy(locale, 'My sessions', 'Mina pass')}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">
            <BookOpen className="h-4 w-4" />
            {copy(locale, 'Templates', 'Mallar')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <CardioSessionBuilder
            initialData={editSession}
            businessId={businessId}
            onSaved={async (sessionId, sessionName) => {
              if (teamCalendarLink.fromTeamCalendar && sessionId) {
                await teamCalendarLink.linkSavedWorkout(sessionId, sessionName)
                setEditSession(null)
                setActiveTab('library')
              } else if (fromCalendar && calendarClientId && calendarDate && sessionId) {
                setCalendarAssignSessionId(sessionId)
              } else {
                setEditSession(null)
                setActiveTab('library')
              }
            }}
            onCancel={editSession ? () => {
              setEditSession(null)
              setActiveTab('library')
            } : undefined}
          />
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <CardioSessionLibrary
            businessId={businessId}
            calendarAssignTarget={
              fromCalendar && deployExisting && calendarClientId && calendarDate
                ? { clientId: calendarClientId, date: calendarDate }
                : undefined
            }
            onCalendarAssignSession={(session) => {
              setCalendarAssignSessionId(session.id)
            }}
            onNewSession={() => {
              setEditSession(null)
              setActiveTab('builder')
            }}
            onEditSession={(session) => {
              setEditSession(session)
              setActiveTab('builder')
            }}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <CardioTemplateLibrary
            onTemplateSelect={(template) => {
              // Create a new session from template
              setEditSession({
                id: '',
                name: template.name,
                description: template.description,
                sport: template.sport,
                segments: template.segments,
                totalDuration: template.totalDuration,
                totalDistance: template.totalDistance,
                tags: template.tags,
              } as CardioSessionData)
              setActiveTab('builder')
            }}
          />
        </TabsContent>
      </Tabs>

      <AutoCardioDialog
        open={showAutoGenerate}
        onOpenChange={setShowAutoGenerate}
        onSessionGenerated={(session) => {
          setEditSession({
            id: '',
            name: session.name,
            description: session.description,
            sport: session.sport,
            segments: session.segments,
            totalDuration: session.totalDuration,
            totalDistance: session.totalDistance,
            tags: session.tags,
          } as CardioSessionData)
          setActiveTab('builder')
          setShowAutoGenerate(false)
        }}
      />

      <ImportWorkoutDialog
        workoutType="CARDIO"
        open={showImporter}
        onOpenChange={setShowImporter}
        onImported={({ workout }) => {
          if (workout.workoutType !== 'CARDIO') return
          setEditSession(toCardioSessionData(workout))
          setActiveTab('builder')
          toast.success(copy(locale, 'Session imported - review and save it in the builder', 'Pass importerat - granska och spara i byggaren'))
        }}
      />

      {/* Calendar Assignment Dialog */}
      {calendarAssignSessionId && calendarClientId && calendarDate && (
        <CalendarAssignDialog
          open={!!calendarAssignSessionId}
          onOpenChange={(open) => {
            if (!open) setCalendarAssignSessionId(null)
          }}
          sessionType="cardio"
          sessionId={calendarAssignSessionId}
          clientId={calendarClientId}
          date={calendarDate}
          businessSlug={businessSlug}
          businessId={businessId}
        />
      )}
    </div>
  )
}
