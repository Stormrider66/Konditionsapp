'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'

export default function NewProgramPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [clientTests, setClientTests] = useState<any[]>([])
  const [selectedTest, setSelectedTest] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Program parameters
  const [goalType, setGoalType] = useState('fitness')
  const [durationWeeks, setDurationWeeks] = useState('12')
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState('4')
  const [experienceLevel, setExperienceLevel] = useState('intermediate')
  const [targetRaceDate, setTargetRaceDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchUser()
    fetchClients()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchClientTests(selectedClient)
    } else {
      setClientTests([])
      setSelectedTest('')
    }
  }, [selectedClient])

  const fetchUser = async () => {
    const supabase = createSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients')
      const result = await response.json()

      if (result.success) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte hämta klienter',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchClientTests = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      const result = await response.json()

      if (result.success && result.data.tests) {
        // Only show completed tests with training zones
        const validTests = result.data.tests.filter(
          (test: any) =>
            test.status === 'COMPLETED' &&
            test.trainingZones &&
            (test.trainingZones as any[]).length > 0
        )
        setClientTests(validTests)
      }
    } catch (error) {
      console.error('Error fetching tests:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClient || !selectedTest) {
      toast({
        title: 'Validering misslyckades',
        description: 'Välj både klient och test',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/programs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient,
          testId: selectedTest,
          goalType,
          durationWeeks: parseInt(durationWeeks),
          trainingDaysPerWeek: parseInt(trainingDaysPerWeek),
          experienceLevel,
          targetRaceDate: targetRaceDate || undefined,
          notes,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: 'Träningsprogram skapat!',
          description: 'Programmet har genererats och sparats',
        })
        router.push(`/clients/${selectedClient}`)
      } else {
        toast({
          title: 'Fel vid generering',
          description: result.error || 'Kunde inte skapa träningsprogram',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error generating program:', error)
      toast({
        title: 'Nätverksfel',
        description: 'Kunde inte skapa träningsprogram',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav user={user} />

      <main className="max-w-3xl mx-auto px-4 py-6 lg:py-12">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till startsidan
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold">Skapa träningsprogram</h1>
          <p className="text-muted-foreground mt-2">
            Generera ett personligt träningsprogram baserat på ett konditionstest
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Programinställningar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Välj klient *</Label>
                {loading ? (
                  <div className="text-sm text-muted-foreground">Laddar klienter...</div>
                ) : clients.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Inga klienter hittades.{' '}
                    <Link href="/clients/new" className="text-blue-600 hover:underline">
                      Skapa en ny klient
                    </Link>
                  </div>
                ) : (
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger id="client">
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

              {/* Test Selection */}
              {selectedClient && (
                <div className="space-y-2">
                  <Label htmlFor="test">Välj test *</Label>
                  {clientTests.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Inga genomförda tester med träningszoner hittades för denna klient.{' '}
                      <Link href="/test" className="text-blue-600 hover:underline">
                        Skapa ett nytt test
                      </Link>
                    </div>
                  ) : (
                    <Select value={selectedTest} onValueChange={setSelectedTest}>
                      <SelectTrigger id="test">
                        <SelectValue placeholder="Välj ett test" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientTests.map((test) => (
                          <SelectItem key={test.id} value={test.id}>
                            {format(new Date(test.testDate), 'PPP', { locale: sv })} -{' '}
                            {test.testType === 'RUNNING'
                              ? 'Löpning'
                              : test.testType === 'CYCLING'
                              ? 'Cykling'
                              : 'Skidåkning'}{' '}
                            {test.vo2max && `(VO2max: ${test.vo2max.toFixed(1)})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Goal Type */}
              <div className="space-y-2">
                <Label htmlFor="goalType">Träningsm

ål *</Label>
                <Select value={goalType} onValueChange={setGoalType}>
                  <SelectTrigger id="goalType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fitness">Allmän kondition</SelectItem>
                    <SelectItem value="marathon">Marathon</SelectItem>
                    <SelectItem value="halfMarathon">Halvmarathon</SelectItem>
                    <SelectItem value="10k">10 km</SelectItem>
                    <SelectItem value="5k">5 km</SelectItem>
                    <SelectItem value="cycling">Cykling</SelectItem>
                    <SelectItem value="skiing">Längdskidåkning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Programlängd (veckor) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="4"
                  max="52"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                  required
                />
              </div>

              {/* Training Days */}
              <div className="space-y-2">
                <Label htmlFor="trainingDays">Träningsdagar per vecka *</Label>
                <Select value={trainingDaysPerWeek} onValueChange={setTrainingDaysPerWeek}>
                  <SelectTrigger id="trainingDays">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 dagar/vecka</SelectItem>
                    <SelectItem value="4">4 dagar/vecka</SelectItem>
                    <SelectItem value="5">5 dagar/vecka</SelectItem>
                    <SelectItem value="6">6 dagar/vecka</SelectItem>
                    <SelectItem value="7">7 dagar/vecka</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <Label htmlFor="experience">Erfarenhetsnivå *</Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger id="experience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Nybörjare</SelectItem>
                    <SelectItem value="intermediate">Medel</SelectItem>
                    <SelectItem value="advanced">Avancerad</SelectItem>
                    <SelectItem value="elite">Elit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Race Date */}
              <div className="space-y-2">
                <Label htmlFor="raceDate">Måldatum (frivilligt)</Label>
                <Input
                  id="raceDate"
                  type="date"
                  value={targetRaceDate}
                  onChange={(e) => setTargetRaceDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ange ett datum för tävling eller mål om tillämpligt
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar (frivilligt)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Speciella instruktioner eller mål..."
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={submitting || !selectedClient || !selectedTest}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Genererar program...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Skapa träningsprogram
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push('/')}>
                  Avbryt
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 text-sm mb-2">
              Så här fungerar det:
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-blue-800">
              <li>Välj en klient med ett genomfört konditionstest</li>
              <li>Välj det test som ska ligga till grund för programmet</li>
              <li>Ange programmets mål och längd</li>
              <li>Systemet genererar automatiskt ett personligt träningsprogram</li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
