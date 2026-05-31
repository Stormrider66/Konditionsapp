'use client'

import { useState, useEffect, useMemo } from 'react'
import { SportType } from '@prisma/client'
import { useLocale } from 'next-intl'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarIcon, Loader2, Info, Sparkles, AlertTriangle, Plane, Briefcase, Palmtree, Mountain, Activity, Gauge, ShieldCheck } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import {
  storeProgramContext,
  type WizardFormData,
  type ProgramContext,
} from '@/lib/ai/program-context-builder'
import { addWeeks } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  configSchema,
  type ConfigFormData,
  type CalendarConstraintsResponse,
  type ConfigurationFormProps,
} from './configuration-form/schema'
import { getDefaultDuration, getSuggestedMethodology, type AppLocale } from './configuration-form/helpers'
import { HyroxStationTimes } from './configuration-form/HyroxStationTimes'
import { StrengthPRs } from './configuration-form/StrengthPRs'
import { StrengthCoreIntegration } from './configuration-form/StrengthCoreIntegration'
import { ProgramAudienceSelector } from './configuration-form/ProgramAudienceSelector'
import { HockeyTestEvidencePanel } from './configuration-form/HockeyTestEvidencePanel'
import { buildTeamSportPlanningSummary, type TeamSportPlanningSummary } from '@/lib/program-generator/team-sports/explainability'
import {
  buildCourtSportSettingsPayload,
  CourtSportSettings,
  getCourtSportProfileSettings,
  isCourtSportProgram,
} from './configuration-form/CourtSportSettings'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const getDateLocale = (locale: AppLocale) => (locale === 'sv' ? sv : enUS)

const getSportProgramLabel = (sport: SportType, locale: AppLocale) => {
  switch (sport) {
    case 'RUNNING':
      return t(locale, 'löpprogram', 'running program')
    case 'CYCLING':
      return t(locale, 'cykelprogram', 'cycling program')
    case 'SKIING':
      return t(locale, 'skidprogram', 'skiing program')
    case 'SWIMMING':
      return t(locale, 'simprogram', 'swimming program')
    case 'TRIATHLON':
      return t(locale, 'triathlonprogram', 'triathlon program')
    case 'HYROX':
      return t(locale, 'HYROX-program', 'HYROX program')
    case 'STRENGTH':
      return t(locale, 'styrkeprogram', 'strength program')
    case 'GENERAL_FITNESS':
      return t(locale, 'träningsprogram', 'general fitness program')
    case 'TEAM_ICE_HOCKEY':
      return t(locale, 'hockeyprogram', 'hockey program')
    case 'TEAM_FOOTBALL':
      return t(locale, 'fotbollsprogram', 'football program')
    case 'TEAM_BASKETBALL':
      return t(locale, 'basketprogram', 'basketball program')
    case 'TEAM_HANDBALL':
      return t(locale, 'handbollsprogram', 'handball program')
    case 'TEAM_FLOORBALL':
      return t(locale, 'innebandyprogram', 'floorball program')
    case 'TEAM_VOLLEYBALL':
      return t(locale, 'volleybollprogram', 'volleyball program')
    case 'TENNIS':
      return t(locale, 'tennisprogram', 'tennis program')
    case 'PADEL':
      return t(locale, 'padelprogram', 'padel program')
    default:
      return t(locale, 'träningsprogram', 'training program')
  }
}

const getSessionDescription = (sport: SportType, locale: AppLocale) => {
  if (sport === 'RUNNING') return t(locale, 'Löppass per vecka', 'Runs per week')
  if (sport === 'CYCLING') return t(locale, 'Cykelpass per vecka', 'Cycling sessions per week')
  if (sport === 'TEAM_ICE_HOCKEY') return t(locale, 'Planerade pass per vecka', 'Planned sessions per week')
  if (sport === 'TEAM_FOOTBALL') return t(locale, 'Planerade pass per vecka', 'Planned sessions per week')
  if (isCourtSportProgram(sport)) return t(locale, 'Sportpass inklusive match/teknik per vecka', 'Sport sessions including match/skill work per week')
  return t(locale, 'Träningspass per vecka', 'Training sessions per week')
}

const getImpactLabel = (impact: string, locale: AppLocale) => {
  if (impact === 'NO_TRAINING') return t(locale, 'Ingen träning', 'No training')
  if (impact === 'REDUCED') return t(locale, 'Reducerad', 'Reduced')
  if (impact === 'MODIFIED') return t(locale, 'Anpassad', 'Modified')
  return impact
}

export function ConfigurationForm({
  sport,
  goal,
  dataSource,
  clients,
  teams = [],
  selectedTeamId,
  onTeamChange,
  selectedClientId,
  onClientChange,
  onSubmit,
  isSubmitting,
}: ConfigurationFormProps) {
  const locale = getAppLocale(useLocale())
  const router = useRouter()
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''

  const isHyroxSport = sport === 'HYROX'

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema) as unknown as Resolver<ConfigFormData>,
    defaultValues: {
      clientId: selectedClientId || '',
      clientIds: selectedClientId ? [selectedClientId] : [],
      assignmentScope: 'INDIVIDUAL',
      teamId: selectedTeamId || '',
      hockeyTestId: undefined,
      hockeyTestIdsByClient: {},
      durationWeeks: getDefaultDuration(sport, goal),
      sessionsPerWeek: 4,
      methodology: 'AUTO',
      includeStrength: isHyroxSport, // HYROX always includes strength training
      strengthSessionsPerWeek: isHyroxSport ? 2 : 2,
      technique: 'both',
      poolLength: '25',
      bikeType: 'road',
      courtPosition: undefined,
      courtPlayStyle: undefined,
      seasonPhase: undefined,
      matchesPerWeek: undefined,
      notes: '',
      // New defaults
      experienceLevel: 'intermediate',
      currentWeeklyVolume: undefined,
      recentRaceDistance: 'NONE',
      recentRaceTime: '',
      targetTime: '',
      coreSessionsPerWeek: 0,
      alternativeTrainingSessionsPerWeek: 0,
      scheduleStrengthAfterRunning: false,
      scheduleCoreAfterRunning: false,
      hasLactateMeter: false,
      hasPowerMeter: false,
      // HYROX specific
      hyroxStationTimes: {
        skierg: '',
        sledPush: '',
        sledPull: '',
        burpeeBroadJump: '',
        rowing: '',
        farmersCarry: '',
        sandbagLunge: '',
        wallBalls: '',
        averageRunPace: '',
      },
      hyroxDivision: 'open',
      hyroxGender: undefined,
      hyroxBodyweight: undefined,
      // Strength PRs
      strengthPRs: {
        deadlift: undefined,
        backSquat: undefined,
        benchPress: undefined,
        overheadPress: undefined,
        barbellRow: undefined,
        pullUps: undefined,
      },
    },
  })

  const watchClientId = useWatch({ control: form.control, name: 'clientId' })
  const rawWatchClientIds = useWatch({ control: form.control, name: 'clientIds' })
  const watchClientIds = useMemo(() => rawWatchClientIds ?? [], [rawWatchClientIds])
  const watchAssignmentScope = useWatch({ control: form.control, name: 'assignmentScope' }) ?? 'INDIVIDUAL'
  const watchTeamId = useWatch({ control: form.control, name: 'teamId' })
  const watchHockeyTestId = useWatch({ control: form.control, name: 'hockeyTestId' })
  const watchHockeyTestIdsByClient = useWatch({ control: form.control, name: 'hockeyTestIdsByClient' }) ?? {}
  const selectedClient = clients.find((c) => c.id === watchClientId)
  const selectedTeam = teams.find((team) => team.id === watchTeamId)
  const courtSportProfileSettings = useMemo(
    () => getCourtSportProfileSettings(selectedClient?.sportProfile, sport),
    [selectedClient?.sportProfile, sport]
  )
  const watchTargetDate = useWatch({ control: form.control, name: 'targetRaceDate' })
  const watchIncludeStrength = useWatch({ control: form.control, name: 'includeStrength' })
  const watchRaceDistance = useWatch({ control: form.control, name: 'recentRaceDistance' })
  const watchExperienceLevel = useWatch({ control: form.control, name: 'experienceLevel' })

  // Check if sport needs running-specific fields
  const needsRunningFields = sport === 'RUNNING' || sport === 'HYROX' || sport === 'TRIATHLON'
  const needsPowerMeter = sport === 'CYCLING' || sport === 'TRIATHLON'
  const isHyrox = sport === 'HYROX'
  const isHockeyProgram = sport === 'TEAM_ICE_HOCKEY'

  // Calendar constraints state
  const [calendarData, setCalendarData] = useState<CalendarConstraintsResponse | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  const watchDurationWeeks = useWatch({ control: form.control, name: 'durationWeeks' })
  const watchSessionsPerWeek = useWatch({ control: form.control, name: 'sessionsPerWeek' })
  const teamSportPlanningSummary = useMemo(() => buildTeamSportPlanningSummary({
    sport,
    goal,
    sessionsPerWeek: watchSessionsPerWeek,
    locale,
    hockeySettings: selectedClient?.sportProfile?.hockeySettings,
    footballSettings: selectedClient?.sportProfile?.footballSettings,
  }), [goal, locale, selectedClient?.sportProfile?.footballSettings, selectedClient?.sportProfile?.hockeySettings, sport, watchSessionsPerWeek])

  const selectedHockeyTest = useMemo(() => {
    if (!selectedClient?.hockeyTests?.length) return undefined
    return selectedClient.hockeyTests.find((test) => test.id === watchHockeyTestId) ?? selectedClient.hockeyTests[0]
  }, [selectedClient, watchHockeyTestId])

  const selectedTargetClientIds = useMemo(() => {
    if (watchAssignmentScope === 'TEAM') {
      return selectedTeam?.members.map((member) => member.id) ?? []
    }
    if (watchAssignmentScope === 'SELECTED') {
      return watchClientIds
    }
    return watchClientId ? [watchClientId] : []
  }, [selectedTeam?.members, watchAssignmentScope, watchClientId, watchClientIds])

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])

  const latestHockeyTestIdsByClient = useMemo(() => {
    const entries = selectedTargetClientIds
      .map((clientId) => {
        const latest = clientById.get(clientId)?.hockeyTests?.[0]
        return latest ? [clientId, latest.id] as const : null
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry))
    return Object.fromEntries(entries)
  }, [clientById, selectedTargetClientIds])

  useEffect(() => {
    if (selectedTeamId && selectedTeamId !== watchTeamId) {
      form.setValue('teamId', selectedTeamId)
    }
  }, [form, selectedTeamId, watchTeamId])

  useEffect(() => {
    if (!watchTeamId && teams.length > 0) {
      form.setValue('teamId', teams[0].id)
    }
  }, [form, teams, watchTeamId])

  useEffect(() => {
    if (!isHockeyProgram || dataSource !== 'TEST') return

    if (watchAssignmentScope === 'INDIVIDUAL') {
      const latest = selectedClient?.hockeyTests?.[0]
      if (latest && !watchHockeyTestId) {
        form.setValue('hockeyTestId', latest.id, { shouldValidate: true })
      }
      return
    }

    form.setValue('hockeyTestIdsByClient', latestHockeyTestIdsByClient, { shouldValidate: true })
  }, [
    dataSource,
    form,
    isHockeyProgram,
    latestHockeyTestIdsByClient,
    selectedClient?.hockeyTests,
    watchAssignmentScope,
    watchHockeyTestId,
  ])

  // Fetch calendar constraints when client or duration changes
  useEffect(() => {
    async function fetchCalendarConstraints() {
      if (!watchClientId) {
        setCalendarData(null)
        return
      }

      setCalendarLoading(true)

      try {
        const startDate = new Date()
        const endDate = watchTargetDate || addWeeks(startDate, watchDurationWeeks || 12)

        // Fetch constraints and upcoming events in parallel
        const [constraintsRes, eventsRes] = await Promise.all([
          fetch(
            `/api/calendar/constraints?clientId=${watchClientId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&includeContext=true`
          ),
          fetch(
            `/api/calendar-events?clientId=${watchClientId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
          )
        ])

        if (!constraintsRes.ok) {
          // Calendar might not exist yet - this is okay
          if (constraintsRes.status === 404) {
            setCalendarData(null)
            return
          }
          throw new Error(t(locale, 'Kunde inte hämta kalenderdata', 'Could not fetch calendar data'))
        }

        const constraintsData = await constraintsRes.json()

        // Parse upcoming events if available
        let upcomingEvents: CalendarConstraintsResponse['upcomingEvents'] = []
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          upcomingEvents = (eventsData.events || eventsData || [])
            .filter((e: { trainingImpact: string }) => e.trainingImpact !== 'NORMAL')
            .slice(0, 5)
            .map((e: { title: string; type: string; startDate: string; endDate: string; trainingImpact: string }) => ({
              title: e.title,
              type: e.type,
              startDate: e.startDate,
              endDate: e.endDate,
              impact: e.trainingImpact,
            }))
        }

        setCalendarData({
          ...constraintsData,
          upcomingEvents,
        })
      } catch (error) {
        console.error('Calendar fetch error:', error)
        // Don't show error to user - calendar is optional
        setCalendarData(null)
      } finally {
        setCalendarLoading(false)
      }
    }

    void fetchCalendarConstraints()
  }, [locale, watchClientId, watchTargetDate, watchDurationWeeks])

  // Auto-calculate duration from target date
  useEffect(() => {
    if (watchTargetDate) {
      const today = new Date()
      const diffTime = watchTargetDate.getTime() - today.getTime()
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
      const clampedWeeks = Math.max(4, Math.min(52, diffWeeks))
      form.setValue('durationWeeks', clampedWeeks)
    }
  }, [watchTargetDate, form])

  // Notify parent when client selection changes
  useEffect(() => {
    if (watchClientId && onClientChange) {
      onClientChange(watchClientId)
    }
  }, [watchClientId, onClientChange])

  // Wrap submit to include calendar constraints
  const handleSubmit = form.handleSubmit((data) => {
    const assignmentScope = data.assignmentScope ?? 'INDIVIDUAL'
    const teamClientIds = selectedTeam?.members.map((member) => member.id) ?? data.clientIds ?? []
    const targetClientIds = assignmentScope === 'TEAM'
      ? teamClientIds
      : assignmentScope === 'SELECTED'
        ? data.clientIds ?? []
        : data.clientId
          ? [data.clientId]
          : []
    const courtSportSettings = buildCourtSportSettingsPayload(
      sport,
      goal,
      data,
      courtSportProfileSettings
    )

    // Add calendar constraints to submission if available
    const submissionData = {
      ...data,
      ...courtSportSettings,
      clientId: targetClientIds[0] ?? data.clientId,
      clientIds: targetClientIds.length > 1 ? targetClientIds : undefined,
      assignmentScope,
      teamId: assignmentScope !== 'INDIVIDUAL' ? data.teamId : undefined,
      hockeyTestId: sport === 'TEAM_ICE_HOCKEY' && dataSource === 'TEST' && targetClientIds.length <= 1
        ? data.hockeyTestId
        : undefined,
      hockeyTestIdsByClient: sport === 'TEAM_ICE_HOCKEY' && dataSource === 'TEST' && targetClientIds.length > 1
        ? { ...latestHockeyTestIdsByClient, ...watchHockeyTestIdsByClient }
        : undefined,
      calendarConstraints: calendarData?.constraints ? {
        blockedDates: calendarData.constraints.blockedDates,
        reducedDates: calendarData.constraints.reducedDates,
        altitudePeriods: calendarData.constraints.altitudePeriods.map(p => ({
          start: p.start,
          end: p.end,
          altitude: p.altitude,
        })),
      } : undefined,
    }
    return onSubmit(submissionData)
  })

  // Handle "Continue with AI Studio" button
  const handleContinueWithAI = () => {
    const formData = form.getValues()
    const selectedClient = clients.find(c => c.id === formData.clientId)
    const courtSportProfileSettings = getCourtSportProfileSettings(selectedClient?.sportProfile, sport)
    const courtSportSettings = buildCourtSportSettingsPayload(
      sport,
      goal,
      formData,
      courtSportProfileSettings
    )

    // Build the wizard form data
    const wizardFormData: WizardFormData = {
      sport,
      goal,
      dataSource,
      clientId: formData.clientId,
      clientName: selectedClient?.name || t(locale, 'Okänd atlet', 'Unknown athlete'),
      testId: formData.testId,
      durationWeeks: formData.durationWeeks,
      targetRaceDate: formData.targetRaceDate,
      sessionsPerWeek: formData.sessionsPerWeek,
      methodology: formData.methodology,
      manualFtp: formData.manualFtp,
      manualCss: formData.manualCss,
      manualVdot: formData.manualVdot,
      weeklyHours: formData.weeklyHours,
      bikeType: formData.bikeType,
      technique: formData.technique,
      poolLength: formData.poolLength,
      experienceLevel: formData.experienceLevel,
      currentWeeklyVolume: formData.currentWeeklyVolume,
      recentRaceDistance: formData.recentRaceDistance,
      recentRaceTime: formData.recentRaceTime,
      targetTime: formData.targetTime,
      includeStrength: formData.includeStrength,
      strengthSessionsPerWeek: formData.strengthSessionsPerWeek,
      coreSessionsPerWeek: formData.coreSessionsPerWeek,
      alternativeTrainingSessionsPerWeek: formData.alternativeTrainingSessionsPerWeek,
      scheduleStrengthAfterRunning: formData.scheduleStrengthAfterRunning,
      scheduleCoreAfterRunning: formData.scheduleCoreAfterRunning,
      hasLactateMeter: formData.hasLactateMeter,
      hasPowerMeter: formData.hasPowerMeter,
      hyroxStationTimes: formData.hyroxStationTimes,
      hyroxDivision: formData.hyroxDivision,
      hyroxGender: formData.hyroxGender,
      hyroxBodyweight: formData.hyroxBodyweight,
      strengthPRs: formData.strengthPRs,
      hockeySettings: selectedClient?.sportProfile?.hockeySettings ?? undefined,
      footballSettings: selectedClient?.sportProfile?.footballSettings ?? undefined,
      basketballSettings: courtSportSettings.basketballSettings ?? selectedClient?.sportProfile?.basketballSettings ?? undefined,
      handballSettings: courtSportSettings.handballSettings ?? selectedClient?.sportProfile?.handballSettings ?? undefined,
      floorballSettings: courtSportSettings.floorballSettings ?? selectedClient?.sportProfile?.floorballSettings ?? undefined,
      volleyballSettings: courtSportSettings.volleyballSettings ?? selectedClient?.sportProfile?.volleyballSettings ?? undefined,
      tennisSettings: courtSportSettings.tennisSettings ?? selectedClient?.sportProfile?.tennisSettings ?? undefined,
      padelSettings: courtSportSettings.padelSettings ?? selectedClient?.sportProfile?.padelSettings ?? undefined,
      notes: formData.notes,
    }

    // Build the context
    const context: ProgramContext = {
      wizardData: wizardFormData,
      hockeySettings: selectedClient?.sportProfile?.hockeySettings ?? undefined,
      footballSettings: selectedClient?.sportProfile?.footballSettings ?? undefined,
      basketballSettings: courtSportSettings.basketballSettings ?? selectedClient?.sportProfile?.basketballSettings ?? undefined,
      handballSettings: courtSportSettings.handballSettings ?? selectedClient?.sportProfile?.handballSettings ?? undefined,
      floorballSettings: courtSportSettings.floorballSettings ?? selectedClient?.sportProfile?.floorballSettings ?? undefined,
      volleyballSettings: courtSportSettings.volleyballSettings ?? selectedClient?.sportProfile?.volleyballSettings ?? undefined,
      tennisSettings: courtSportSettings.tennisSettings ?? selectedClient?.sportProfile?.tennisSettings ?? undefined,
      padelSettings: courtSportSettings.padelSettings ?? selectedClient?.sportProfile?.padelSettings ?? undefined,
    }

    // Store context in sessionStorage
    storeProgramContext(context)

    // Navigate to AI Studio in program mode
    router.push(`${basePath}/coach/ai-studio?mode=program&clientId=${formData.clientId}`)
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">{t(locale, 'Konfigurera program', 'Configure program')}</h2>
          <p className="text-muted-foreground">
            {t(locale, 'Finjustera inställningarna för ditt', 'Fine-tune settings for your')} {getSportProgramLabel(sport, locale)}
          </p>
        </div>

        <ProgramAudienceSelector
          form={form}
          clients={clients}
          teams={teams}
          sport={sport}
          locale={locale}
          onTeamChange={onTeamChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Selection */}
          {watchAssignmentScope === 'INDIVIDUAL' && (
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Atlet *', 'Athlete *')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t(locale, 'Välj atlet', 'Choose athlete')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                          {client.position ? ` · ${client.position}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Test Selection (if dataSource is TEST) */}
          {dataSource === 'TEST' && selectedClient && sport !== 'TEAM_ICE_HOCKEY' && (
            <FormField
              control={form.control}
              name="testId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Konditionstest *', 'Fitness test *')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t(locale, 'Välj test', 'Choose test')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedClient.tests.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {format(new Date(test.testDate), 'PPP', { locale: getDateLocale(locale) })} -{' '}
                          {test.testType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {dataSource === 'TEST' && selectedClient && sport === 'TEAM_ICE_HOCKEY' && watchAssignmentScope === 'INDIVIDUAL' && (
            <FormField
              control={form.control}
              name="hockeyTestId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Hockeytest *', 'Hockey test *')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t(locale, 'Välj hockeytest', 'Choose hockey test')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(selectedClient.hockeyTests ?? []).map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {format(new Date(test.testDate), 'PPP', { locale: getDateLocale(locale) })} ·{' '}
                          {t(locale, `${test.metricCount} mätvärden`, `${test.metricCount} metrics`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(locale, 'Tar med is-sprint, 5-10-5, 7x40, styrka, power, Wingate och aerob profil när data finns.', 'Includes ice sprint, 5-10-5, 7x40, strength, power, Wingate, and aerobic profile when available.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Manual Values (if dataSource is MANUAL) */}
          {dataSource === 'MANUAL' && sport === 'CYCLING' && (
            <FormField
              control={form.control}
              name="manualFtp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FTP (Functional Threshold Power) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t(locale, 't.ex. 280', 'e.g. 280')}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === '' ? undefined : parseInt(val))
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t(locale, 'Watt vid tröskel (1 timmes max)', 'Watts at threshold (1-hour max)')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {dataSource === 'MANUAL' && sport === 'SWIMMING' && (
            <FormField
              control={form.control}
              name="manualCss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CSS (Critical Swim Speed) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(locale, 't.ex. 1:45', 'e.g. 1:45')}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                    />
                  </FormControl>
                  <FormDescription>{t(locale, 'Tid per 100m (MM:SS)', 'Time per 100m (MM:SS)')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {dataSource === 'MANUAL' && sport === 'RUNNING' && (
            <FormField
              control={form.control}
              name="manualVdot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VDOT</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t(locale, 't.ex. 45', 'e.g. 45')}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === '' ? undefined : parseInt(val))
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t(locale, 'Daniels VDOT (valfritt)', 'Daniels VDOT (optional)')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Target Date */}
          <FormField
            control={form.control}
            name="targetRaceDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t(locale, 'Måldatum (valfritt)', 'Target date (optional)')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: getDateLocale(locale) })
                        ) : (
                          <span>{t(locale, 'Välj datum', 'Choose date')}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  {t(locale, 'Programlängden beräknas automatiskt', 'Program length is calculated automatically')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Target Time / Goal Time (Running only) */}
          {needsRunningFields && (
            <FormField
              control={form.control}
              name="targetTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Mål-tid för tävling', 'Race goal time')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        goal === 'marathon' ? t(locale, 'H:MM:SS (t.ex. 3:30:00)', 'H:MM:SS (e.g. 3:30:00)') :
                        goal === 'half-marathon' ? t(locale, 'H:MM:SS (t.ex. 1:45:00)', 'H:MM:SS (e.g. 1:45:00)') :
                        goal === '10k' ? t(locale, 'MM:SS (t.ex. 45:00)', 'MM:SS (e.g. 45:00)') :
                        goal === '5k' ? t(locale, 'MM:SS (t.ex. 22:00)', 'MM:SS (e.g. 22:00)') :
                        'H:MM:SS'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t(locale, 'Programmet bygger gradvis upp tempo från nuvarande form till måltempo', 'The program gradually builds pace from current fitness to goal pace')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Duration */}
          <FormField
            control={form.control}
            name="durationWeeks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(locale, 'Antal veckor *', 'Number of weeks *')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={4}
                    max={52}
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value)
                      field.onChange(isNaN(val as number) ? undefined : val)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sessions per week */}
          <FormField
            control={form.control}
            name="sessionsPerWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(locale, 'Pass per vecka *', 'Sessions per week *')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={2}
                    max={14}
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value)
                      field.onChange(isNaN(val as number) ? undefined : val)
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {getSessionDescription(sport, locale)}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Methodology (Running only) */}
          {sport === 'RUNNING' && (
            <FormField
              control={form.control}
              name="methodology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Träningsmetodik', 'Training methodology')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AUTO">{t(locale, 'Automatiskt val', 'Automatic choice')}</SelectItem>
                      <SelectItem value="POLARIZED">Polarized (80/20)</SelectItem>
                      <SelectItem value="NORWEGIAN">Norwegian ({t(locale, 'Dubbel tröskel', 'Double threshold')})</SelectItem>
                      <SelectItem value="NORWEGIAN_SINGLES">Norwegian Singles ({t(locale, 'Enkel tröskel', 'Single threshold')})</SelectItem>
                      <SelectItem value="CANOVA">Canova (Marathon-specialist)</SelectItem>
                      <SelectItem value="PYRAMIDAL">Pyramidal</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Show suggestion when AUTO is selected */}
                  {field.value === 'AUTO' && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-medium text-blue-800">
                            {t(locale, 'Rekommendation:', 'Recommendation:')} {getSuggestedMethodology(watchExperienceLevel, goal, locale).name}
                          </span>
                          <p className="text-blue-700 mt-1">
                            {getSuggestedMethodology(watchExperienceLevel, goal, locale).reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Experience Level (Running/HYROX/Triathlon) - 4 tiers aligned with vLT2 */}
          {needsRunningFields && (
            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Prestationsnivå', 'Performance level')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t(locale, 'Välj nivå', 'Choose level')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="recreational">
                        <div className="flex flex-col">
                          <span>{t(locale, 'Motionär', 'Recreational')}</span>
                          <span className="text-xs text-muted-foreground">{t(locale, 'Maraton 4:30+, tröskel >6:00/km', 'Marathon 4:30+, threshold >6:00/km')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="intermediate">
                        <div className="flex flex-col">
                          <span>{t(locale, 'Medel', 'Intermediate')}</span>
                          <span className="text-xs text-muted-foreground">{t(locale, 'Maraton 3:30-4:30, tröskel 4:37-6:00/km', 'Marathon 3:30-4:30, threshold 4:37-6:00/km')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="advanced">
                        <div className="flex flex-col">
                          <span>{t(locale, 'Avancerad', 'Advanced')}</span>
                          <span className="text-xs text-muted-foreground">{t(locale, 'Maraton 3:00-3:30, tröskel 3:45-4:37/km', 'Marathon 3:00-3:30, threshold 3:45-4:37/km')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="elite">
                        <div className="flex flex-col">
                          <span>{t(locale, 'Elit', 'Elite')}</span>
                          <span className="text-xs text-muted-foreground">{t(locale, 'Maraton sub-3h, tröskel <3:45/km', 'Marathon sub-3h, threshold <3:45/km')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(locale, 'Påverkar tempo och progressionshastighet i programmet', 'Affects pace and progression rate in the program')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Current Weekly Volume (Running/HYROX/Triathlon) */}
          {needsRunningFields && (
            <FormField
              control={form.control}
              name="currentWeeklyVolume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Nuvarande veckodistans (km)', 'Current weekly distance (km)')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t(locale, 't.ex. 40', 'e.g. 40')}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === '' ? undefined : parseInt(val))
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t(locale, 'Genomsnittlig km/vecka senaste månaden', 'Average km/week over the past month')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {isHockeyProgram && dataSource === 'TEST' && (
          <HockeyTestEvidencePanel
            locale={locale}
            assignmentScope={watchAssignmentScope}
            selectedClient={selectedClient}
            selectedTeam={selectedTeam}
            selectedClientIds={selectedTargetClientIds}
            selectedTest={selectedHockeyTest}
          />
        )}

        {teamSportPlanningSummary && (
          <TeamSportPlanningPanel summary={teamSportPlanningSummary} locale={locale} />
        )}

        {isCourtSportProgram(sport) && (
          <CourtSportSettings
            form={form}
            sport={sport}
            goal={goal}
            locale={locale}
            profileSettings={courtSportProfileSettings}
          />
        )}

        {/* Calendar Constraints Section */}
        {watchClientId && (
          <div className="border rounded-lg p-4 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">{t(locale, 'Kalenderinformation', 'Calendar information')}</h3>
              {calendarLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {calendarData && calendarData.recommendation.shouldUse ? (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {calendarData.availability.blockedCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded-md">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{calendarData.availability.blockedCount} {t(locale, 'blockerade dagar', 'blocked days')}</span>
                    </div>
                  )}
                  {calendarData.availability.reducedCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-md">
                      <Info className="h-3.5 w-3.5" />
                      <span>{calendarData.availability.reducedCount} {t(locale, 'reducerade dagar', 'reduced days')}</span>
                    </div>
                  )}
                  {calendarData.constraints.altitudePeriods.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                      <Mountain className="h-3.5 w-3.5" />
                      <span>{calendarData.constraints.altitudePeriods.length} {t(locale, 'höghöjdsläger', 'altitude camps')}</span>
                    </div>
                  )}
                </div>

                {/* Upcoming events list */}
                {calendarData.upcomingEvents && calendarData.upcomingEvents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{t(locale, 'Kommande händelser:', 'Upcoming events:')}</p>
                    <div className="space-y-1.5">
                      {calendarData.upcomingEvents.slice(0, 5).map((event, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm pl-2 border-l-2 border-muted">
                          {event.type === 'TRAVEL' && <Plane className="h-3.5 w-3.5 text-muted-foreground" />}
                          {event.type === 'WORK_BLOCKER' && <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />}
                          {event.type === 'VACATION' && <Palmtree className="h-3.5 w-3.5 text-muted-foreground" />}
                          {event.type === 'ALTITUDE_CAMP' && <Mountain className="h-3.5 w-3.5 text-muted-foreground" />}
                          {!['TRAVEL', 'WORK_BLOCKER', 'VACATION', 'ALTITUDE_CAMP'].includes(event.type) && (
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="font-medium">{event.title}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(event.startDate), 'd MMM', { locale: getDateLocale(locale) })}
                            {event.startDate !== event.endDate && ` - ${format(new Date(event.endDate), 'd MMM', { locale: getDateLocale(locale) })}`}
                          </span>
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            event.impact === 'NO_TRAINING' && 'bg-red-100 text-red-700',
                            event.impact === 'REDUCED' && 'bg-amber-100 text-amber-700',
                            event.impact === 'MODIFIED' && 'bg-blue-100 text-blue-700'
                          )}>
                            {getImpactLabel(event.impact, locale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    {t(locale, 'Programmet kommer automatiskt anpassas efter dessa kalenderbegränsningar. Träningspass schemaläggs inte på blockerade dagar.', 'The program will automatically adapt to these calendar constraints. Training sessions will not be scheduled on blocked days.')}
                  </AlertDescription>
                </Alert>
              </div>
            ) : !calendarLoading ? (
              <div className="text-sm text-muted-foreground">
                <p>{t(locale, 'Inga kalenderbegränsningar hittades för denna period.', 'No calendar constraints were found for this period.')}</p>
                <p className="mt-1">
                  {t(locale, 'Atleten kan lägga till resor, semester och andra blockerare i sin kalender under', 'The athlete can add travel, vacation, and other blockers in their calendar under')}{' '}
                  <span className="font-medium">{t(locale, 'Atlet', 'Athlete')} &rarr; {t(locale, 'Kalender', 'Calendar')}</span>.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Race Results Section (for VDOT calculation) */}
        {needsRunningFields && (
          <div className="border rounded-lg p-4 mt-6">
            <h3 className="font-medium mb-3">{t(locale, 'Tävlingsresultat för tempokalkylering', 'Race result for pace calculation')}</h3>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {sport === 'HYROX'
                  ? t(locale, 'Ange ett resultat från en ren löptävling (5K, 10K, etc.) - EJ HYROX-tid. HYROX-tid inkluderar stationstider och kan inte användas för löptempo.', 'Enter a result from a pure running race (5K, 10K, etc.), not a HYROX time. HYROX time includes station times and cannot be used for running pace.')
                  : t(locale, 'Ange ditt bästa tävlingsresultat från de senaste 12 månaderna för att beräkna VDOT och optimala träningstempo.', 'Enter your best race result from the past 12 months to calculate VDOT and optimal training paces.')}
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recentRaceDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(locale, 'Tävlingsdistans', 'Race distance')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t(locale, 'Välj distans', 'Choose distance')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">{t(locale, 'Inget tävlingsresultat', 'No race result')}</SelectItem>
                        <SelectItem value="5K">5 km</SelectItem>
                        <SelectItem value="10K">10 km</SelectItem>
                        <SelectItem value="HALF">{t(locale, 'Halvmaraton (21,1 km)', 'Half marathon (21.1 km)')}</SelectItem>
                        <SelectItem value="MARATHON">{t(locale, 'Maraton (42,2 km)', 'Marathon (42.2 km)')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchRaceDistance && watchRaceDistance !== 'NONE' && (
                <FormField
                  control={form.control}
                  name="recentRaceTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t(locale, 'Sluttid', 'Finish time')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={watchRaceDistance === '5K' || watchRaceDistance === '10K' ? 'MM:SS' : 'H:MM:SS'}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {watchRaceDistance === '5K' && 't.ex. 22:30'}
                        {watchRaceDistance === '10K' && 't.ex. 47:15'}
                        {watchRaceDistance === 'HALF' && 't.ex. 1:45:00'}
                        {watchRaceDistance === 'MARATHON' && 't.ex. 3:45:00'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        )}

        {isHyrox && (
          <HyroxStationTimes form={form} watchRaceDistance={watchRaceDistance} />
        )}

        {(isHyrox || watchIncludeStrength) && (
          <StrengthPRs form={form} isHyrox={isHyrox} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cycling specific: Weekly hours */}
          {sport === 'CYCLING' && (
            <FormField
              control={form.control}
              name="weeklyHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Veckotimmar', 'Weekly hours')}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t(locale, 'Välj timmar', 'Choose hours')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="6">6 {t(locale, 'timmar', 'hours')}</SelectItem>
                      <SelectItem value="8">8 {t(locale, 'timmar', 'hours')}</SelectItem>
                      <SelectItem value="10">10 {t(locale, 'timmar', 'hours')}</SelectItem>
                      <SelectItem value="12">12 {t(locale, 'timmar', 'hours')}</SelectItem>
                      <SelectItem value="15">15 {t(locale, 'timmar', 'hours')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Skiing specific: Technique */}
          {sport === 'SKIING' && (
            <FormField
              control={form.control}
              name="technique"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Teknik', 'Technique')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="classic">{t(locale, 'Klassisk', 'Classic')}</SelectItem>
                      <SelectItem value="skating">Skating</SelectItem>
                      <SelectItem value="both">{t(locale, 'Båda', 'Both')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Swimming specific: Pool length */}
          {sport === 'SWIMMING' && (
            <FormField
              control={form.control}
              name="poolLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Bassänglängd', 'Pool length')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="25">25 {t(locale, 'meter', 'meters')}</SelectItem>
                      <SelectItem value="50">50 {t(locale, 'meter', 'meters')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <StrengthCoreIntegration
          form={form}
          sport={sport}
          watchIncludeStrength={watchIncludeStrength}
        />

        {/* Cross-training / Alternative Training */}
        {needsRunningFields && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-medium mb-4">{t(locale, 'Alternativ träning', 'Alternative training')}</h3>
            <FormField
              control={form.control}
              name="alternativeTrainingSessionsPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(locale, 'Pass per vecka med annan sport', 'Sessions per week with another sport')}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString() || '0'}
                  >
                    <FormControl>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="0" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>{t(locale, 'Cykling, skidåkning, simning, etc. för variation och aktiv återhämtning', 'Cycling, skiing, swimming, etc. for variety and active recovery')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Equipment - Lactate Meter (Running only, enables Norwegian method) */}
        {sport === 'RUNNING' && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-medium mb-4">{t(locale, 'Utrustning', 'Equipment')}</h3>
            <FormField
              control={form.control}
              name="hasLactateMeter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t(locale, 'Har laktatmätare', 'Has lactate meter')}</FormLabel>
                    <FormDescription>
                      {t(locale, 'Möjliggör Norwegian-metoden med tröskelträning baserad på laktatvärden', 'Enables the Norwegian method with threshold training based on lactate values')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Power Meter (Cycling/Triathlon only) */}
        {needsPowerMeter && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-medium mb-4">{t(locale, 'Utrustning', 'Equipment')}</h3>
            <FormField
              control={form.control}
              name="hasPowerMeter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t(locale, 'Har wattmätare', 'Has power meter')}</FormLabel>
                    <FormDescription>
                      {t(locale, 'Aktiverar wattbaserad träning och power zones', 'Enables watt-based training and power zones')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t(locale, 'Anteckningar', 'Notes')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t(locale, 'Eventuella anteckningar om programmet...', 'Any notes about the program...')}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleContinueWithAI}
            disabled={!watchClientId || isSubmitting}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {t(locale, 'Fortsätt med AI Studio', 'Continue with AI Studio')}
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedTargetClientIds.length > 1
              ? t(locale, `Generera ${selectedTargetClientIds.length} program`, `Generate ${selectedTargetClientIds.length} programs`)
              : t(locale, 'Generera program', 'Generate program')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function TeamSportPlanningPanel({
  summary,
  locale,
}: {
  summary: TeamSportPlanningSummary
  locale: AppLocale
}) {
  const hasLoadGuidance = summary.loadGuidance.length > 0
  return (
    <div className="border rounded-lg p-4 mt-6 bg-muted/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-medium">{summary.title}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{summary.description}</p>
        </div>
        <Badge variant={hasLoadGuidance ? 'secondary' : 'outline'} className="w-fit">
          <Gauge className="mr-1 h-3.5 w-3.5" />
          {hasLoadGuidance
            ? t(locale, 'Belastning anpassas', 'Load adjusted')
            : t(locale, 'Normal belastning', 'Normal load')}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {summary.assumptions.map((item) => (
          <div key={item.label} className="rounded-md border bg-background/70 p-3">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-sm font-medium">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {t(locale, 'Prioriterad prevention', 'Priority prevention')}
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.prevention.map((item) => (
              <Badge key={item} variant="outline">{item}</Badge>
            ))}
          </div>
        </div>

        <div className="rounded-md border bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Gauge className="h-4 w-4 text-amber-600" />
            {t(locale, 'Belastningssignal', 'Load signal')}
          </div>
          {hasLoadGuidance ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {summary.loadGuidance.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(locale, 'Ingen extra reducering behövs utifrån profilen.', 'No extra reduction is needed from the profile.')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
