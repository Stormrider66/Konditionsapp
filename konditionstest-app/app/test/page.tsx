'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TestDataForm } from '@/components/forms/TestDataForm'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { PDFExportButton } from '@/components/reports/PDFExportButton'
import { EmailReportButton } from '@/components/reports/EmailReportButton'
import { performAllCalculations } from '@/lib/calculations'
import { Test, Client, TestCalculations, TestStage, ReportData, TestType } from '@/types'
import { CreateTestFormData } from '@/lib/validations/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Printer, User, Home } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { User as SupabaseUser } from '@supabase/supabase-js'

export default function TestPage() {
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
  const { toast } = useToast()

  useEffect(() => {
    fetchClients()
    const supabase = createSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        setClients(data.data)
        setSelectedClientId(data.data[0].id)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte hämta klienter',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  const handleSubmit = async (data: CreateTestFormData) => {
    console.log('handleSubmit called with:', data)
    console.log('Selected testType from state:', testType)
    console.log('First stage data:', data.stages[0])

    if (!selectedClient) {
      toast({
        title: 'Fel',
        description: 'Ingen klient vald',
        variant: 'destructive',
      })
      return
    }

    try {
      // Spara testet till databasen först
      const saveResponse = await fetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          testType: testType, // Include the test type from state
          location: location,
          testLeader: testLeader,
          clientId: selectedClient.id,
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
        duration: stage.duration,
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

      console.log('Test saved, starting calculations...')

      // Utför alla beräkningar
      const calculations = await performAllCalculations(test, selectedClient)

      console.log('Calculations completed:', calculations)

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

      if (!updateResponse.ok) {
        console.warn('Could not update test with calculation results')
      } else {
        console.log('Calculation results saved to database')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav user={user} />

      <div className="lg:hidden gradient-primary text-white shadow-lg py-4 px-4">
        <h1 className="text-xl font-bold">Nytt Konditionstest</h1>
        <p className="text-white/90 text-sm mt-1">Skapa ny testrapport</p>
      </div>

      <div className="hidden lg:block gradient-primary text-white shadow-lg py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">Star by Thomson</h1>
          <p className="text-white/90 mt-1">Nytt Konditionstest</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        {!showReport ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Välj klient och testtyp</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-select">Klient</Label>
                  {loading ? (
                    <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                  ) : clients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Inga klienter tillgängliga. Gå till{' '}
                      <Link href="/clients" className="text-blue-600 hover:underline">
                        Klientregister
                      </Link>{' '}
                      för att lägga till en klient.
                    </p>
                  ) : (
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger id="client-select">
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
                  <Label>Testtyp</Label>
                  <Tabs value={testType} onValueChange={(value) => setTestType(value as TestType)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="RUNNING">Löpning</TabsTrigger>
                      <TabsTrigger value="CYCLING">Cykling</TabsTrigger>
                      <TabsTrigger value="SKIING">Skidåkning</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location-select">Plats</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger id="location-select">
                        <SelectValue placeholder="Välj plats" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Piteå">Piteå</SelectItem>
                        <SelectItem value="Skellefteå">Skellefteå</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-leader">Testledare</Label>
                    <Select value={testLeader} onValueChange={setTestLeader}>
                      <SelectTrigger id="test-leader">
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
              </CardContent>
            </Card>

            {selectedClient && (
              <Card>
                <CardHeader>
                  <CardTitle>Mata in testdata</CardTitle>
                </CardHeader>
                <CardContent>
                  <TestDataForm
                    key={`${selectedClientId}-${testType}`}
                    testType={testType}
                    onSubmit={handleSubmit}
                    clientId={selectedClient.id}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4 flex gap-4 print:hidden flex-wrap">
              <Link href="/">
                <Button variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Hem
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowReport(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka till formulär
              </Button>
              {reportData && (
                <Link href={`/clients/${reportData.client.id}`}>
                  <Button variant="outline">
                    <User className="w-4 h-4 mr-2" />
                    Testhistorik
                  </Button>
                </Link>
              )}
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Skriv ut
              </Button>
              {reportData && (
                <>
                  <PDFExportButton
                    reportData={{
                      client: reportData.client,
                      test: reportData.test,
                      calculations: reportData.calculations,
                      testLeader: testLeader || 'Henrik Lundholm',
                      organization: location === 'Skellefteå' ? 'Star by Thomson & Hallberg' : 'Star by Thomson',
                      reportDate: new Date(),
                    }}
                    variant="default"
                    size="md"
                  />
                  <EmailReportButton
                    reportData={{
                      client: reportData.client,
                      test: reportData.test,
                      calculations: reportData.calculations,
                      testLeader: testLeader || 'Henrik Lundholm',
                      organization: location === 'Skellefteå' ? 'Star by Thomson & Hallberg' : 'Star by Thomson',
                      reportDate: new Date(),
                    }}
                    variant="outline"
                    size="md"
                  />
                </>
              )}
            </div>
            {reportData && (
              <ReportTemplate
                client={reportData.client}
                test={reportData.test}
                calculations={reportData.calculations}
                testLeader={testLeader || 'Henrik Lundholm'}
                organization={location === 'Skellefteå' ? 'Star by Thomson & Hallberg' : 'Star by Thomson'}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
