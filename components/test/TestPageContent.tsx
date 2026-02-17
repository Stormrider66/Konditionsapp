'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TestDataForm } from '@/components/forms/TestDataForm'
import { BioimpedanceForm } from '@/components/forms/BioimpedanceForm'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { PDFExportButton } from '@/components/reports/PDFExportButton'
import { EmailReportButton } from '@/components/reports/EmailReportButton'
import { performAllCalculations } from '@/lib/calculations'
import { Test, Client, TestCalculations, TestStage, TestType } from '@/types'
import { CreateTestFormData } from '@/lib/validations/schemas'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Printer, User, Home, Droplet, Scale, Zap, Timer, Dumbbell, Shuffle, Waves, Activity, Flame } from 'lucide-react'
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
import { User as SupabaseUser } from '@supabase/supabase-js'

// Sport test form imports
import { PowerTestForm } from '@/components/tests/power'
import { SpeedTestForm } from '@/components/tests/speed'
import { AgilityTestForm } from '@/components/tests/agility'
import { StrengthTestForm } from '@/components/tests/strength'
import { SwimmingCSSTestForm } from '@/components/tests/swimming'
import { YoYoTestForm } from '@/components/tests/endurance'
import { HYROXStationTestForm, HYROXRaceSimulationForm } from '@/components/tests/hyrox'

type TestCategory = 'lactate' | 'body-composition' | 'power' | 'speed' | 'agility' | 'strength' | 'swimming' | 'endurance' | 'hyrox'

const TEST_CATEGORIES = [
  { value: 'lactate', label: 'Laktattest', icon: Droplet, available: true },
  { value: 'body-composition', label: 'Kroppssammansättning', icon: Scale, available: true },
  { value: 'power', label: 'Krafttest', icon: Zap, available: true },
  { value: 'speed', label: 'Hastighet', icon: Timer, available: true },
  { value: 'agility', label: 'Agility', icon: Shuffle, available: true },
  { value: 'strength', label: 'Styrka', icon: Dumbbell, available: true },
  { value: 'swimming', label: 'Simning', icon: Waves, available: true },
  { value: 'endurance', label: 'Uthållighet', icon: Activity, available: true },
  { value: 'hyrox', label: 'HYROX', icon: Flame, available: true },
] as const

interface TestPageContentProps {
  businessSlug?: string
  organizationName?: string
}

export function TestPageContent({ businessSlug, organizationName }: TestPageContentProps) {
  const basePath = businessSlug ? `/${businessSlug}/coach` : ''
  const orgName = organizationName || 'Trainomics'

  const [testCategory, setTestCategory] = useState<TestCategory>('lactate')
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState<{
    client: Client
    test: Test
    calculations: TestCalculations
  } | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [testType, setTestType] = useState<TestType>('RUNNING')
  const [location, setLocation] = useState<string>('Piteå')
  const [testLeader, setTestLeader] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userRole, setUserRole] = useState<'COACH' | 'ATHLETE' | 'ADMIN' | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const controller = new AbortController()

    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients', { signal: controller.signal })
        const data = await response.json()

        if (data.success && data.data.length > 0) {
          setClients(data.data)
          setSelectedClientId(data.data[0].id)
        }
        setLoading(false)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Error fetching clients:', error)
        toast({
          title: 'Fel',
          description: 'Kunde inte hämta klienter',
          variant: 'destructive',
        })
        setLoading(false)
      }
    }

    const fetchUserRole = async () => {
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        try {
          const response = await fetch('/api/users/me', { signal: controller.signal })
          const result = await response.json()
          if (result.success) {
            setUserRole(result.data.role)
          }
        } catch (error) {
          if (controller.signal.aborted) return
          console.error('Error fetching user role:', error)
        }
      }
    }

    fetchClients()
    fetchUserRole()

    return () => controller.abort()
  }, [toast])

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  const handleSubmit = async (data: CreateTestFormData) => {
    if (!selectedClient) {
      toast({
        title: 'Fel',
        description: 'Ingen klient vald',
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
        },
        body: JSON.stringify({
          ...data,
          stages: transformedStages,
          testType: testType, // Include the test type from state
          location: location,
          testLeader: testLeader,
          clientId: selectedClient.id,
          restingLactate: data.restingLactate,
          postTestMeasurements: transformedPostMeasurements?.length ? transformedPostMeasurements : undefined,
          recommendedNextTestDate: data.recommendedNextTestDate || undefined,
        }),
      })

      const saveResult = await saveResponse.json()

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Kunde inte spara test')
      }

      const savedTest = saveResult.data

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
        title: 'Test sparat!',
        description: 'Testet har sparats och rapporten är klar.',
      })
    } catch (error) {
      console.error('Fel vid beräkning:', error)
      toast({
        title: 'Fel',
        description: `Kunde inte generera rapport: ${error instanceof Error ? error.message : 'Okänt fel'}`,
        variant: 'destructive',
      })
    }
  }

  const ClientSelector = () => (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle>Välj klient</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="space-y-2">
          <Label htmlFor="client-select" className="text-slate-900 dark:text-white">Klient</Label>
          {loading ? (
            <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
          ) : clients.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Inga klienter tillgängliga. Gå till{' '}
              <Link href={`${basePath}/clients`} className="text-blue-600 hover:underline">
                Klientregister
              </Link>{' '}
              för att lägga till en klient.
            </p>
          ) : (
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger id="client-select" className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                <SelectValue placeholder="Välj en klient" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
      {!showReport ? (
        <div className="space-y-6">
          {/* Test Category Tabs */}
          <div>
            <h1 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Nytt Test</h1>
            <Tabs value={testCategory} onValueChange={(v) => setTestCategory(v as TestCategory)}>
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 h-auto gap-1 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm p-1">
                {TEST_CATEGORIES.map((category) => {
                  const Icon = category.icon
                  return (
                    <TabsTrigger
                      key={category.value}
                      value={category.value}
                      disabled={!category.available}
                      className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden lg:inline">{category.label}</span>
                      <span className="lg:hidden text-[10px] sm:text-xs">{category.label.split(' ')[0].slice(0, 6)}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {/* Lactate Test Content */}
              <TabsContent value="lactate" className="space-y-6 mt-6">
                <GlassCard>
                  <GlassCardHeader>
                    <GlassCardTitle>Laktattestinställningar</GlassCardTitle>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-select" className="text-slate-900 dark:text-white">Klient</Label>
                      {loading ? (
                        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                      ) : clients.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Inga klienter tillgängliga. Gå till{' '}
                          <Link href={`${basePath}/clients`} className="text-blue-600 hover:underline">
                            Klientregister
                          </Link>{' '}
                          för att lägga till en klient.
                        </p>
                      ) : (
                        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                          <SelectTrigger id="client-select" className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                            <SelectValue placeholder="Välj en klient" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">Testtyp</Label>
                      <Tabs value={testType} onValueChange={(value) => setTestType(value as TestType)}>
                        <TabsList className="grid w-full grid-cols-3 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                          <TabsTrigger value="RUNNING">Löpning</TabsTrigger>
                          <TabsTrigger value="CYCLING">Cykling</TabsTrigger>
                          <TabsTrigger value="SKIING">Skidåkning</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location-select" className="text-slate-900 dark:text-white">Plats</Label>
                        <Select value={location} onValueChange={setLocation}>
                          <SelectTrigger id="location-select" className="min-h-[44px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                            <SelectValue placeholder="Välj plats" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Piteå">Piteå</SelectItem>
                            <SelectItem value="Skellefteå">Skellefteå</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="test-leader" className="text-slate-900 dark:text-white">Testledare</Label>
                        <Select value={testLeader} onValueChange={setTestLeader}>
                          <SelectTrigger id="test-leader" className="min-h-[44px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                            <SelectValue placeholder="Välj testledare" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Henrik Lundholm">Henrik Lundholm</SelectItem>
                            <SelectItem value="Tommy Henriksson">Tommy Henriksson</SelectItem>
                            <SelectItem value="Elias Ståhl">Elias Ståhl</SelectItem>
                            <SelectItem value="Stefan Thomson">Stefan Thomson</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>

                {selectedClient && (
                  <GlassCard>
                    <GlassCardHeader>
                      <GlassCardTitle>Mata in testdata</GlassCardTitle>
                    </GlassCardHeader>
                    <GlassCardContent>
                      <TestDataForm
                        key={`${selectedClientId}-${testType}`}
                        testType={testType}
                        onSubmit={handleSubmit}
                        clientId={selectedClient.id}
                      />
                    </GlassCardContent>
                  </GlassCard>
                )}
              </TabsContent>

              {/* Body Composition Content */}
              <TabsContent value="body-composition" className="space-y-6 mt-6">
                <ClientSelector />

                {selectedClient && (
                  <GlassCard>
                    <GlassCardHeader>
                      <GlassCardTitle>Bioimpedansmätning</GlassCardTitle>
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
              <TabsContent value="power" className="mt-6">
                <PowerTestForm
                  clients={clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    weight: c.weight || 70,
                    gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
                  }))}
                />
              </TabsContent>

              {/* Speed Test Content */}
              <TabsContent value="speed" className="mt-6">
                <SpeedTestForm
                  clients={clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    weight: c.weight || 70,
                    gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
                  }))}
                />
              </TabsContent>

              {/* Agility Test Content */}
              <TabsContent value="agility" className="mt-6">
                <AgilityTestForm
                  clients={clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    weight: c.weight || 70,
                    gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
                  }))}
                />
              </TabsContent>

              {/* Strength Test Content */}
              <TabsContent value="strength" className="mt-6">
                <StrengthTestForm
                  clients={clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    weight: c.weight || 70,
                    gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
                  }))}
                />
              </TabsContent>

              {/* Swimming Test Content */}
              <TabsContent value="swimming" className="mt-6">
                <SwimmingCSSTestForm
                  clients={clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    weight: c.weight || 70,
                    gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
                  }))}
                />
              </TabsContent>

              {/* Endurance Test Content */}
              <TabsContent value="endurance" className="mt-6">
                <YoYoTestForm
                  clients={clients.map(c => ({
                    id: c.id,
                    name: c.name,
                    weight: c.weight || 70,
                    gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
                  }))}
                />
              </TabsContent>

              {/* HYROX Test Content */}
              <TabsContent value="hyrox" className="mt-6">
                <Tabs defaultValue="station" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="station">Stationstest</TabsTrigger>
                    <TabsTrigger value="simulation">Race Simulation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="station">
                    <HYROXStationTestForm
                      clients={clients.map(c => ({
                        id: c.id,
                        name: c.name,
                        weight: c.weight || 70,
                        gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
                      }))}
                    />
                  </TabsContent>

                  <TabsContent value="simulation">
                    <HYROXRaceSimulationForm
                      clients={clients.map(c => ({
                        id: c.id,
                        name: c.name,
                        weight: c.weight || 70,
                        gender: (c.gender as 'MALE' | 'FEMALE') || 'MALE',
                      }))}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex gap-2 sm:gap-3 lg:gap-4 print:hidden flex-wrap">
            <Link href={basePath ? `${basePath}/dashboard` : '/'} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
                <Home className="w-4 h-4 mr-2" />
                Hem
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowReport(false)} className="w-full sm:w-auto min-h-[44px]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till formulär
            </Button>
            {reportData && (
              <Link href={`${basePath}/clients/${reportData.client.id}`} className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
                  <User className="w-4 h-4 mr-2" />
                  Testhistorik
                </Button>
              </Link>
            )}
            <Button variant="secondary" onClick={() => window.print()} className="w-full sm:w-auto min-h-[44px]">
              <Printer className="w-4 h-4 mr-2" />
              Skriv ut
            </Button>
            {reportData && (
              <>
                <div className="w-full sm:w-auto">
                  <PDFExportButton
                    reportData={{
                      client: reportData.client,
                      test: reportData.test,
                      calculations: reportData.calculations,
                      testLeader: testLeader || 'Henrik Lundholm',
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
                      testLeader: testLeader || 'Henrik Lundholm',
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
            <ReportTemplate
              client={reportData.client}
              test={reportData.test}
              calculations={reportData.calculations}
              testLeader={testLeader || 'Henrik Lundholm'}
              organization={orgName}
            />
          )}
        </div>
      )}
    </main>
  )
}
