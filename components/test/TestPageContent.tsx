'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { TestDataForm, type StageVideoSummary } from '@/components/forms/TestDataForm'
import { BioimpedanceForm } from '@/components/forms/BioimpedanceForm'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { PDFExportButton } from '@/components/reports/PDFExportButton'
import { EmailReportButton } from '@/components/reports/EmailReportButton'
import { performAllCalculations } from '@/lib/calculations'
import { Test, Client, TestCalculations, TestStage, TestType } from '@/types'
import { CreateTestFormData } from '@/lib/validations/schemas'
import { PLATFORM_NAME } from '@/lib/branding/types'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Printer, User, Home, Droplet, Scale, Zap, Timer, Dumbbell, Shuffle, Waves, Activity, Flame, Shield, Video, CheckCircle2, ExternalLink, AlertTriangle, Gauge, ClipboardList } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { useLocale } from '@/i18n/client'

// Sport test form imports
import { PowerTestForm } from '@/components/tests/power'
import { SpeedTestForm } from '@/components/tests/speed'
import { AgilityTestForm } from '@/components/tests/agility'
import { StrengthTestForm } from '@/components/tests/strength'
import { SwimmingCSSTestForm } from '@/components/tests/swimming'
import { YoYoTestForm } from '@/components/tests/endurance'
import { HYROXStationTestForm, HYROXRaceSimulationForm } from '@/components/tests/hyrox'
import { HockeyTestForm } from '@/components/coach/hockey-tests/HockeyTestForm'
import { getAthleteProfileConfig } from '@/lib/coach/athlete-profile-config'

type TestCategory = 'lactate' | 'body-composition' | 'power' | 'speed' | 'agility' | 'strength' | 'swimming' | 'endurance' | 'hyrox' | 'hockey'
type TestPageClient = Client & {
  sportProfile?: {
    primarySport?: string | null
    secondarySports?: string[] | null
  } | null
}

const TEST_CATEGORIES = [
  { value: 'lactate', labelSv: 'Laktattest', labelEn: 'Lactate test', icon: Droplet, available: true },
  { value: 'body-composition', labelSv: 'Bioimpedans', labelEn: 'Body composition', icon: Scale, available: true },
  { value: 'power', labelSv: 'Krafttest', labelEn: 'Power test', icon: Zap, available: true },
  { value: 'speed', labelSv: 'Hastighet', labelEn: 'Speed', icon: Timer, available: true },
  { value: 'agility', labelSv: 'Agility', labelEn: 'Agility', icon: Shuffle, available: true },
  { value: 'strength', labelSv: 'Styrka', labelEn: 'Strength', icon: Dumbbell, available: true },
  { value: 'swimming', labelSv: 'Simning', labelEn: 'Swimming', icon: Waves, available: true },
  { value: 'endurance', labelSv: 'Uthållighet', labelEn: 'Endurance', icon: Activity, available: true },
  { value: 'hyrox', labelSv: 'HYROX', labelEn: 'HYROX', icon: Flame, available: true },
  { value: 'hockey', labelSv: 'Hockey', labelEn: 'Hockey', icon: Shield, available: true },
] as const

interface TestPageContentProps {
  businessSlug: string
  organizationName?: string
  initialClientId?: string
  initialCategory?: string
}

function isTestCategory(value: string): value is TestCategory {
  return TEST_CATEGORIES.some((category) => category.value === value)
}

export function TestPageContent({ businessSlug, organizationName, initialClientId = '', initialCategory = '' }: TestPageContentProps) {
  const basePath = `/${businessSlug}/coach`
  const orgName = organizationName || PLATFORM_NAME
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const t = useCallback((svText: string, enText: string) => locale === 'sv' ? svText : enText, [locale])

  const [testCategory, setTestCategory] = useState<TestCategory>(isTestCategory(initialCategory) ? initialCategory : 'lactate')
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState<{
    client: Client
    test: Test
    calculations: TestCalculations
  } | null>(null)
  const [clients, setClients] = useState<TestPageClient[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [testType, setTestType] = useState<TestType>('RUNNING')
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')
  const [stageVideos, setStageVideos] = useState<StageVideoSummary[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const controller = new AbortController()
    const businessScopeHeaders = businessSlug ? { 'x-business-slug': businessSlug } : undefined

    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients', {
          signal: controller.signal,
          headers: businessScopeHeaders,
        })
        const data = await response.json()

        if (data.success && data.data.length > 0) {
          setClients(data.data)
          const requestedClient = data.data.find((client: TestPageClient) => client.id === initialClientId)
          setSelectedClientId(requestedClient?.id ?? data.data[0].id)
        }
        setLoading(false)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Error fetching clients:', error)
        toast({
          title: t('Fel', 'Error'),
          description: t('Kunde inte hämta klienter', 'Could not fetch clients'),
          variant: 'destructive',
        })
        setLoading(false)
      }
    }

    const fetchUserRole = async () => {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        try {
          const response = await fetch('/api/users/me', { signal: controller.signal })
          const result = await response.json()
          if (result.success) {
            if (result.data.name) setUserName(result.data.name)
          }
        } catch (error) {
          if (controller.signal.aborted) return
          console.error('Error fetching user role:', error)
        }
      }
    }

    void fetchClients()
    void fetchUserRole()

    return () => controller.abort()
  }, [businessSlug, initialClientId, toast, t])

  const teams = Array.from(
    new Map(
      clients
        .map((client) => client.team)
        .filter((team): team is NonNullable<TestPageClient['team']> => Boolean(team))
        .map((team) => [team.id, { id: team.id, name: team.name }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, locale === 'sv' ? 'sv' : 'en'))
  const filteredClients = selectedTeamId === 'all'
    ? clients
    : clients.filter((client) => client.teamId === selectedTeamId)
  const selectedClient = filteredClients.find((c) => c.id === selectedClientId)
  const isHockeyClient = (client: TestPageClient | undefined) => {
    if (!client) return false
    return getAthleteProfileConfig({ team: client.team, sportProfile: client.sportProfile }).isHockeyAthlete
  }
  const selectedClientIsHockey = isHockeyClient(selectedClient)
  const visibleTestCategories = TEST_CATEGORIES.filter((category) => category.value !== 'hockey' || selectedClientIsHockey || testCategory === 'hockey')
  const hasProfileContext = Boolean(initialClientId && clients.some((client) => client.id === initialClientId))
  const orderedClients = selectedClientId
    ? [...filteredClients].sort((a, b) => {
        if (a.id === selectedClientId) return -1
        if (b.id === selectedClientId) return 1
        return a.name.localeCompare(b.name, locale === 'sv' ? 'sv' : 'en')
      })
    : filteredClients
  const sportFormClients = orderedClients.map(c => ({
    id: c.id,
    name: c.name,
    weight: c.weight || 70,
    gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
  }))
  const hockeyTeams = teams.filter((team) =>
    clients.some((client) => client.teamId === team.id && isHockeyClient(client))
  )
  const profileHref = selectedClient ? `${basePath}/clients/${selectedClient.id}/profile` : null
  const relatedTestLinks = [
    {
      href: `${basePath}/ergometer-tests`,
      label: t('Ergometertester', 'Ergometer tests'),
      icon: Gauge,
    },
    {
      href: `${basePath}/test-protocols`,
      label: t('Testprotokoll', 'Test protocols'),
      icon: ClipboardList,
    },
  ]

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId)
    const nextClients = teamId === 'all'
      ? clients
      : clients.filter((client) => client.teamId === teamId)
    const nextSelectedClient = nextClients.find((client) => client.id === selectedClientId) ?? nextClients[0]
    setSelectedClientId(nextSelectedClient?.id ?? '')
    if (testCategory === 'hockey' && !isHockeyClient(nextSelectedClient)) {
      setTestCategory('lactate')
    }
  }

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId)
    const nextClient = clients.find((client) => client.id === clientId)
    if (testCategory === 'hockey' && !isHockeyClient(nextClient)) {
      setTestCategory('lactate')
    }
  }

  const handleSubmit = async (data: CreateTestFormData) => {
    if (!selectedClient) {
      toast({
        title: t('Fel', 'Error'),
        description: t('Ingen klient vald', 'No client selected'),
        variant: 'destructive',
      })
      return
    }

    try {
      // Convert stages with durationMinutes/durationSeconds to duration (in minutes)
      const transformedStages = data.stages.map((stage) => ({
        ...stage,
        duration: (stage.durationMinutes || 0) + ((stage.durationSeconds || 0) / 60),
      }))

      // Convert post-test measurements with timeMinutes/timeSeconds to timeMin
      const transformedPostMeasurements = data.postTestMeasurements
        ?.filter((m) => m.lactate !== undefined && !isNaN(m.lactate))
        .map((m) => ({
          timeMin: (m.timeMinutes || 0) + ((m.timeSeconds || 0) / 60),
          lactate: m.lactate,
        }))

      // Spara testet till databasen först
      const saveResponse = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({
          ...data,
          stages: transformedStages,
          testType: testType, // Include the test type from state
          clientId: selectedClient.id,
          restingLactate: data.restingLactate,
          postTestMeasurements: transformedPostMeasurements?.length ? transformedPostMeasurements : undefined,
          recommendedNextTestDate: data.recommendedNextTestDate || undefined,
        }),
      })

      const saveResult = await saveResponse.json()

      if (!saveResult.success) {
        throw new Error(saveResult.error || t('Kunde inte spara test', 'Could not save test'))
      }

      const savedTest = saveResult.data
      const lactateWarnings = Array.isArray(saveResult.warnings) ? saveResult.warnings : []

      // Skapa test-objekt för beräkningar med stages
      const testStages: TestStage[] = savedTest.testStages || data.stages.map((stage, index) => ({
        id: `stage-${index}`,
        testId: savedTest.id,
        sequence: index,
        duration: (stage.durationMinutes || 0) + ((stage.durationSeconds || 0) / 60),
        heartRate: stage.heartRate,
        lactate: stage.lactate,
        vo2: stage.vo2,
        speed: stage.speed,
        incline: stage.incline,
        power: stage.power,
        cadence: stage.cadence,
        pace: stage.pace,
      }))

      const test: Test = {
        id: savedTest.id,
        clientId: selectedClient.id,
        userId: savedTest.userId || 'user-1',
        testDate: new Date(savedTest.testDate),
        testType: savedTest.testType,
        status: 'COMPLETED',
        notes: savedTest.notes,
        testStages,
      }

      // Utför alla beräkningar
      const calculations = await performAllCalculations(test, selectedClient)

      // Spara beräkningsresultaten till testet
      const updateResponse = await fetch(`/api/tests/${savedTest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          vo2max: calculations.vo2max,
          maxHR: calculations.maxHR,
          maxLactate: calculations.maxLactate,
          aerobicThreshold: calculations.aerobicThreshold,
          anaerobicThreshold: calculations.anaerobicThreshold,
          trainingZones: calculations.trainingZones,
        }),
      })

      if (!updateResponse.ok && process.env.NODE_ENV === 'development') {
        console.warn('Could not update test with calculation results')
      }

      setReportData({
        client: selectedClient,
        test,
        calculations,
      })
      setShowReport(true)
      toast({
        title: lactateWarnings.length > 0 ? t('Test sparat med varning', 'Test saved with warning') : t('Test sparat!', 'Test saved!'),
        description: lactateWarnings.length > 0
          ? lactateWarnings[0].message || t('Rapporten är klar, men kontrollera laktatkurvan.', 'The report is ready, but check the lactate curve.')
          : t('Testet har sparats och rapporten är klar.', 'The test has been saved and the report is ready.'),
      })
      return { testId: savedTest.id }
    } catch (error) {
      console.error('Error during calculation:', error)
      toast({
        title: t('Fel', 'Error'),
        description: `${t('Kunde inte generera rapport', 'Could not generate report')}: ${error instanceof Error ? error.message : t('Okänt fel', 'Unknown error')}`,
        variant: 'destructive',
      })
    }
  }

  const renderTeamFilter = () => {
    if (teams.length === 0 || hasProfileContext) return null

    return (
      <div className="space-y-2">
        <Label htmlFor="team-select" className="text-slate-900 dark:text-white">{t('Lag', 'Team')}</Label>
        <Select value={selectedTeamId} onValueChange={handleTeamChange}>
          <SelectTrigger id="team-select" className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
            <SelectValue placeholder={t('Välj lag', 'Select team')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('Alla lag', 'All teams')}</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const renderClientSelector = () => (
    <GlassCard glow="blue">
      <GlassCardHeader>
        <GlassCardTitle>{t('Välj klient', 'Select client')}</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-4">
          {renderTeamFilter()}
          <Label htmlFor="client-select" className="text-slate-900 dark:text-white">{t('Klient', 'Client')}</Label>
          {loading ? (
            <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
          ) : clients.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('Inga klienter tillgängliga. Gå till', 'No clients available. Go to')}{' '}
              <Link href={`${basePath}/clients`} className="text-blue-600 hover:underline">
                {t('Klientregister', 'Client registry')}
              </Link>{' '}
              {t('för att lägga till en klient.', 'to add a client.')}
            </p>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('Inga klienter i valt lag.', 'No clients in the selected team.')}
            </p>
          ) : (
            <Select value={selectedClientId} onValueChange={handleClientChange}>
              <SelectTrigger id="client-select" className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                <SelectValue placeholder={t('Välj en klient', 'Select a client')} />
              </SelectTrigger>
              <SelectContent>
                {orderedClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  )

  const renderTeamFilterCard = () => {
    if (teams.length === 0 || hasProfileContext) return null

    return (
      <GlassCard glow="blue">
        <GlassCardHeader>
          <GlassCardTitle>{t('Filtrera atleter', 'Filter athletes')}</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          {renderTeamFilter()}
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
      {!showReport ? (
        <div className="space-y-6">
          {/* Test Category Tabs */}
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('Nytt Test', 'New Test')}</h1>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                {relatedTestLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link key={link.href} href={link.href}>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Icon className="mr-2 h-4 w-4" />
                        {link.label}
                      </Button>
                    </Link>
                  )
                })}
                {hasProfileContext && profileHref && (
                  <Link href={profileHref}>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t('Tillbaka till profil', 'Back to profile')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <Tabs value={testCategory} onValueChange={(v) => setTestCategory(v as TestCategory)}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 h-auto gap-1.5 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 backdrop-blur-md p-1.5 rounded-xl shadow-inner">
                {visibleTestCategories.map((category) => {
                  const Icon = category.icon
                  return (
                    <TabsTrigger
                      key={category.value}
                      value={category.value}
                      disabled={!category.available}
                      className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 px-3 text-xs sm:text-sm font-medium transition-all duration-300 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm dark:data-[state=active]:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden lg:inline">{locale === 'sv' ? category.labelSv : category.labelEn}</span>
                      <span className="lg:hidden text-[10px] sm:text-xs">{(locale === 'sv' ? category.labelSv : category.labelEn).split(' ')[0].slice(0, 6)}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {/* Lactate Test Content */}
              <TabsContent value="lactate" className="space-y-6 mt-6">
                <GlassCard glow="blue">
                  <GlassCardHeader>
                    <GlassCardTitle>{t('Laktattestinställningar', 'Lactate test settings')}</GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">
                    {renderTeamFilter()}

                    <div className="space-y-2">
                      <Label htmlFor="client-select" className="text-slate-900 dark:text-white">{t('Klient', 'Client')}</Label>
                      {loading ? (
                        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                      ) : clients.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {t('Inga klienter tillgängliga. Gå till', 'No clients available. Go to')}{' '}
                          <Link href={`${basePath}/clients`} className="text-blue-600 hover:underline">
                            {t('Klientregister', 'Client registry')}
                          </Link>{' '}
                          {t('för att lägga till en klient.', 'to add a client.')}
                        </p>
                      ) : filteredClients.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {t('Inga klienter i valt lag.', 'No clients in the selected team.')}
                        </p>
                      ) : (
                        <Select value={selectedClientId} onValueChange={handleClientChange}>
                          <SelectTrigger id="client-select" className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                            <SelectValue placeholder={t('Välj en klient', 'Select a client')} />
                          </SelectTrigger>
                          <SelectContent>
                            {orderedClients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">{t('Testtyp', 'Test type')}</Label>
                      <Tabs value={testType} onValueChange={(value) => setTestType(value as TestType)}>
                        <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-1 rounded-lg">
                          <TabsTrigger value="RUNNING" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{t('Löpning', 'Running')}</TabsTrigger>
                          <TabsTrigger value="CYCLING" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{t('Cykling', 'Cycling')}</TabsTrigger>
                          <TabsTrigger value="SKIING" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">{t('Skidåkning', 'Skiing')}</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                  </GlassCardContent>
                </GlassCard>

                {selectedClient && (
                  <GlassCard glow="emerald">
                    <GlassCardHeader>
                      <GlassCardTitle>{t('Mata in testdata', 'Enter test data')}</GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                      <TestDataForm
                        key={`${selectedClientId}-${testType}`}
                        testType={testType}
                        onSubmit={handleSubmit}
                        clientId={selectedClient.id}
                        videoAnalysisBasePath={`${basePath}/video-analysis`}
                        onStageVideosChange={setStageVideos}
                      />
                    </GlassCardContent>
                  </GlassCard>
                )}
              </TabsContent>

              {/* Body Composition Content */}
              <TabsContent value="body-composition" className="space-y-6 mt-6">
                {renderClientSelector()}

                {selectedClient && (
                  <GlassCard glow="purple">
                    <GlassCardHeader>
                      <GlassCardTitle>{t('Bioimpedansmätning', 'Bioimpedance measurement')}</GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                      <BioimpedanceForm
                        clientId={selectedClient.id}
                        clientName={selectedClient.name}
                      />
                    </GlassCardContent>
                  </GlassCard>
                )}
              </TabsContent>

              {/* Power Test Content */}
              <TabsContent value="power" className="mt-6 space-y-6">
                {renderTeamFilterCard()}
                <PowerTestForm
                  key={selectedTeamId}
                  clients={sportFormClients}
                />
              </TabsContent>

              {/* Speed Test Content */}
              <TabsContent value="speed" className="mt-6 space-y-6">
                {renderTeamFilterCard()}
                <SpeedTestForm
                  key={selectedTeamId}
                  clients={sportFormClients}
                />
              </TabsContent>

              {/* Agility Test Content */}
              <TabsContent value="agility" className="mt-6 space-y-6">
                {renderTeamFilterCard()}
                <AgilityTestForm
                  key={selectedTeamId}
                  clients={sportFormClients}
                />
              </TabsContent>

              {/* Strength Test Content */}
              <TabsContent value="strength" className="mt-6 space-y-6">
                {renderTeamFilterCard()}
                <StrengthTestForm
                  key={selectedTeamId}
                  clients={sportFormClients}
                />
              </TabsContent>

              {/* Swimming Test Content */}
              <TabsContent value="swimming" className="mt-6 space-y-6">
                {renderTeamFilterCard()}
                <SwimmingCSSTestForm
                  key={selectedTeamId}
                  clients={sportFormClients}
                />
              </TabsContent>

              {/* Endurance Test Content */}
              <TabsContent value="endurance" className="mt-6 space-y-6">
                {renderTeamFilterCard()}
                <YoYoTestForm
                  key={selectedTeamId}
                  clients={sportFormClients}
                />
              </TabsContent>

              {/* HYROX Test Content */}
              <TabsContent value="hyrox" className="mt-6 space-y-6">
                {renderTeamFilterCard()}
                <Tabs defaultValue="station" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="station">{t('Stationstest', 'Station test')}</TabsTrigger>
                    <TabsTrigger value="simulation">Race Simulation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="station">
                    <HYROXStationTestForm
                      key={`station-${selectedTeamId}`}
                      clients={sportFormClients}
                    />
                  </TabsContent>

                  <TabsContent value="simulation">
                    <HYROXRaceSimulationForm
                      key={`simulation-${selectedTeamId}`}
                      clients={sportFormClients}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {selectedClientIsHockey && (
                <TabsContent value="hockey" className="mt-6 space-y-6">
                  {renderTeamFilterCard()}
                  <HockeyTestForm
                    key={`${selectedTeamId}-${selectedClientId}`}
                    clients={orderedClients.map((client) => ({
                      id: client.id,
                      name: client.name,
                      teamId: client.teamId ?? null,
                    }))}
                    teams={hockeyTeams}
                    businessSlug={businessSlug}
                    initialClientId={selectedClientId}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex gap-2 sm:gap-3 lg:gap-4 print:hidden flex-wrap">
            <Link href={basePath ? `${basePath}/dashboard` : '/'} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
                <Home className="w-4 h-4 mr-2" />
                {t('Hem', 'Home')}
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowReport(false)} className="w-full sm:w-auto min-h-[44px]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('Tillbaka till formulär', 'Back to form')}
            </Button>
            {reportData && (
              <Link href={`${basePath}/clients/${reportData.client.id}`} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
                  <User className="w-4 h-4 mr-2" />
                  {t('Testhistorik', 'Test history')}
                </Button>
              </Link>
            )}
            <Button variant="secondary" onClick={() => window.print()} className="w-full sm:w-auto min-h-[44px]">
              <Printer className="w-4 h-4 mr-2" />
              {t('Skriv ut', 'Print')}
            </Button>
            {reportData && (
              <>
                <div className="w-full sm:w-auto">
                  <PDFExportButton
                    reportData={{
                      client: reportData.client,
                      test: reportData.test,
                      calculations: reportData.calculations,
                      testLeader: userName || t('Testledare', 'Test leader'),
                      organization: orgName,
                      reportDate: new Date(),
                    }}
                    variant="default"
                    size="md"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <EmailReportButton
                    reportData={{
                      client: reportData.client,
                      test: reportData.test,
                      calculations: reportData.calculations,
                      testLeader: userName || t('Testledare', 'Test leader'),
                      organization: orgName,
                      reportDate: new Date(),
                    }}
                    variant="outline"
                    size="default"
                  />
                </div>
              </>
            )}
          </div>
          {reportData && (
            <div className="space-y-6">
              {stageVideos.length > 0 && (
                <GlassCard glow="blue">
                  <GlassCardHeader>
                    <GlassCardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      {t('Löpvideo från testet', 'Running video from test')}
                    </GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {stageVideos.map((video) => (
                        <div key={`${video.stageIndex}-${video.analysisId || video.status}`} className="rounded-lg border bg-background p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{t('Steg', 'Stage')} {video.stageSequence}</p>
                              <p className="text-sm text-muted-foreground">
                                {video.speed ? `${video.speed} km/h` : t('Hastighet saknas', 'Speed missing')}
                                {video.cameraAngle ? ` · ${video.cameraAngle}` : ''}
                              </p>
                            </div>
                            {video.status === 'completed' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : video.status === 'failed' ? (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            ) : (
                              <Video className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <p className="mt-2 text-sm">
                            {video.status === 'uploading' && t('Sparar video...', 'Saving video...')}
                            {video.status === 'analyzing' && t('Gemini analyserar...', 'Gemini is analyzing...')}
                            {video.status === 'completed' && (
                              video.formScore != null
                                ? t(`Analys klar: ${video.formScore}/100`, `Analysis complete: ${video.formScore}/100`)
                                : t('Analys klar', 'Analysis complete')
                            )}
                            {video.status === 'failed' && (video.error || t('Videoanalys misslyckades', 'Video analysis failed'))}
                          </p>
                          {video.analysisId && (
                            <Link
                              href={`${basePath}/video-analysis?analysisId=${video.analysisId}`}
                              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              {t('Visa analys', 'View analysis')}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCardContent>
                </GlassCard>
              )}
              <ReportTemplate
                client={reportData.client}
                test={reportData.test}
                calculations={reportData.calculations}
                testLeader={userName || t('Testledare', 'Test leader')}
                organization={orgName}
              />
            </div>
          )}
        </div>
      )}
    </main>
  )
}
