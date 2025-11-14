'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { performAllCalculations } from '@/lib/calculations'
import { Test, Client, TestStage } from '@/types'
import { CreateTestFormData } from '@/lib/validations/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Home, Plus, Trash2 } from 'lucide-react'
import { MobileNav } from '@/components/navigation/MobileNav'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { User as SupabaseUser } from '@supabase/supabase-js'

export default function EditTestPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [test, setTest] = useState<Test | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [stages, setStages] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  const [testDate, setTestDate] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchTestAndClient()
    const supabase = createSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [id])

  const fetchTestAndClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tests/${id}`)
      const result = await response.json()

      if (result.success && result.data) {
        const testData = result.data
        setTest(testData)
        setClient(testData.client)

        // Pre-populate form
        const dateStr = testData.testDate instanceof Date
          ? testData.testDate.toISOString().split('T')[0]
          : new Date(testData.testDate).toISOString().split('T')[0]
        setTestDate(dateStr)
        setNotes(testData.notes || '')
        setStages(testData.testStages || [])
      } else {
        setError(result.error || 'Test not found')
      }
    } catch (err) {
      setError('Network error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addStage = () => {
    const newStage = {
      duration: 4,
      heartRate: 120,
      lactate: 1.0,
      vo2: undefined,
      speed: test?.testType === 'RUNNING' ? 8 : undefined,
      power: test?.testType === 'CYCLING' ? 100 : undefined,
      incline: undefined,
      cadence: undefined,
    }
    setStages([...stages, newStage])
  }

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index))
  }

  const updateStage = (index: number, field: string, value: any) => {
    const updated = [...stages]
    updated[index] = { ...updated[index], [field]: value }
    setStages(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!test || !client) {
      toast({
        title: 'Fel',
        description: 'Test eller klient kunde inte laddas',
        variant: 'destructive',
      })
      return
    }

    if (stages.length === 0) {
      toast({
        title: 'Fel',
        description: 'Lägg till minst ett teststeg',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      // Create test stages from form data
      const testStages: TestStage[] = stages.map((stage, index) => ({
        id: stage.id || `stage-${index}`,
        testId: test.id,
        sequence: index,
        duration: parseFloat(stage.duration),
        heartRate: parseInt(stage.heartRate),
        lactate: parseFloat(stage.lactate),
        vo2: stage.vo2 ? parseFloat(stage.vo2) : undefined,
        speed: stage.speed ? parseFloat(stage.speed) : undefined,
        incline: stage.incline ? parseFloat(stage.incline) : undefined,
        power: stage.power ? parseInt(stage.power) : undefined,
        cadence: stage.cadence ? parseInt(stage.cadence) : undefined,
      }))

      const updatedTest: Test = {
        ...test,
        testDate: new Date(testDate),
        notes,
        testStages,
      }

      console.log('Starting recalculation...')

      // Perform calculations
      const calculations = await performAllCalculations(updatedTest, client)

      console.log('Calculations completed:', calculations)

      // Update test in database with new stages and calculations
      const updateResponse = await fetch(`/api/tests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testDate,
          notes,
          stages,
          vo2max: calculations.vo2max,
          maxHR: calculations.maxHR,
          maxLactate: calculations.maxLactate,
          aerobicThreshold: calculations.aerobicThreshold,
          anaerobicThreshold: calculations.anaerobicThreshold,
          trainingZones: calculations.trainingZones,
        }),
      })

      if (!updateResponse.ok) {
        const result = await updateResponse.json()
        throw new Error(result.error || 'Kunde inte uppdatera test')
      }

      toast({
        title: 'Test uppdaterat!',
        description: 'Testet har uppdaterats med nya beräkningar.',
      })

      // Redirect to test detail page
      router.push(`/tests/${id}`)
    } catch (error) {
      console.error('Error updating test:', error)
      toast({
        title: 'Fel',
        description: `Kunde inte uppdatera test: ${error instanceof Error ? error.message : 'Okänt fel'}`,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileNav user={user} />
        <main className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-gray-600">Laddar test...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !test || !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileNav user={user} />
        <main className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Fel</h2>
            <p className="text-red-700">{error || 'Kunde inte ladda test'}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Hem
              </Button>
            </Link>
            <Link href="/clients">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka till klienter
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav user={user} />

      <main className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        <div className="mb-4 flex gap-4">
          <Link href={`/tests/${test.id}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till test
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Hem
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Redigera testdata</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="testDate">Testdatum</Label>
                <Input
                  id="testDate"
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Teststeg</h3>
                  <Button
                    type="button"
                    onClick={addStage}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till steg
                  </Button>
                </div>

                {stages.map((stage, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Steg {index + 1}</h4>
                        {stages.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeStage(index)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        {test.testType === 'RUNNING' ? (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Hastighet (km/h)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={stage.speed || ''}
                                onChange={(e) =>
                                  updateStage(index, 'speed', e.target.value ? parseFloat(e.target.value) : undefined)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Lutning (%)</Label>
                              <Input
                                type="number"
                                step="0.5"
                                value={stage.incline || ''}
                                onChange={(e) =>
                                  updateStage(index, 'incline', e.target.value ? parseFloat(e.target.value) : undefined)
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Effekt (watt)</Label>
                              <Input
                                type="number"
                                value={stage.power || ''}
                                onChange={(e) =>
                                  updateStage(index, 'power', e.target.value ? parseInt(e.target.value) : undefined)
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Kadens (rpm)</Label>
                              <Input
                                type="number"
                                value={stage.cadence || ''}
                                onChange={(e) =>
                                  updateStage(index, 'cadence', e.target.value ? parseInt(e.target.value) : undefined)
                                }
                              />
                            </div>
                          </>
                        )}

                        <div className="space-y-1">
                          <Label className="text-xs">Puls (slag/min)</Label>
                          <Input
                            type="number"
                            value={stage.heartRate || ''}
                            onChange={(e) =>
                              updateStage(index, 'heartRate', parseInt(e.target.value))
                            }
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Laktat (mmol/L)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={stage.lactate || ''}
                            onChange={(e) =>
                              updateStage(index, 'lactate', parseFloat(e.target.value))
                            }
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">VO₂ (ml/kg/min)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={stage.vo2 || ''}
                            onChange={(e) =>
                              updateStage(index, 'vo2', e.target.value ? parseFloat(e.target.value) : undefined)
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Tid (min)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={stage.duration || ''}
                            onChange={(e) =>
                              updateStage(index, 'duration', parseFloat(e.target.value))
                            }
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? 'Uppdaterar test...' : 'Uppdatera Test'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
