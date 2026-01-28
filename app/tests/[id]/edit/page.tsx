'use client'

import { useState, useEffect, useCallback } from 'react'
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
  // Manual threshold overrides
  const [manualLT1Lactate, setManualLT1Lactate] = useState<string>('')
  const [manualLT1Intensity, setManualLT1Intensity] = useState<string>('')
  const [manualLT2Lactate, setManualLT2Lactate] = useState<string>('')
  const [manualLT2Intensity, setManualLT2Intensity] = useState<string>('')
  // Pre-test baseline measurements
  const [restingLactate, setRestingLactate] = useState<string>('')
  const [restingHeartRate, setRestingHeartRate] = useState<string>('')
  // Post-test measurements (peak lactate)
  const [postTestMeasurements, setPostTestMeasurements] = useState<Array<{
    timeMin: number
    lactate: number
    heartRate?: number
  }>>([])
  const { toast } = useToast()

  const fetchTestAndClient = useCallback(async () => {
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
        // Load manual threshold overrides if they exist
        setManualLT1Lactate(testData.manualLT1Lactate?.toString() || '')
        setManualLT1Intensity(testData.manualLT1Intensity?.toString() || '')
        setManualLT2Lactate(testData.manualLT2Lactate?.toString() || '')
        setManualLT2Intensity(testData.manualLT2Intensity?.toString() || '')
        // Load pre-test baseline measurements
        setRestingLactate(testData.restingLactate?.toString() || '')
        setRestingHeartRate(testData.restingHeartRate?.toString() || '')
        // Load post-test measurements
        setPostTestMeasurements(testData.postTestMeasurements || [])
      } else {
        setError(result.error || 'Test not found')
      }
    } catch (err) {
      setError('Network error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTestAndClient()
    const supabase = createSupabaseClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [fetchTestAndClient])

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

  // Post-test measurement helpers
  const addPostTestMeasurement = () => {
    const lastTime = postTestMeasurements.length > 0
      ? postTestMeasurements[postTestMeasurements.length - 1].timeMin + 1
      : 1
    setPostTestMeasurements([...postTestMeasurements, { timeMin: lastTime, lactate: 0 }])
  }

  const removePostTestMeasurement = (index: number) => {
    setPostTestMeasurements(postTestMeasurements.filter((_, i) => i !== index))
  }

  const updatePostTestMeasurement = (index: number, field: string, value: any) => {
    const updated = [...postTestMeasurements]
    updated[index] = { ...updated[index], [field]: value }
    setPostTestMeasurements(updated)
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

      const updatedTest = {
        ...test,
        testDate: new Date(testDate),
        notes,
        testStages,
        // Include manual threshold overrides for calculation
        manualLT1Lactate: manualLT1Lactate ? parseFloat(manualLT1Lactate) : null,
        manualLT1Intensity: manualLT1Intensity ? parseFloat(manualLT1Intensity) : null,
        manualLT2Lactate: manualLT2Lactate ? parseFloat(manualLT2Lactate) : null,
        manualLT2Intensity: manualLT2Intensity ? parseFloat(manualLT2Intensity) : null,
      }

      // Perform calculations (will use manual overrides if provided)
      const calculations = await performAllCalculations(updatedTest, client)

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
          // Manual threshold overrides
          manualLT1Lactate: manualLT1Lactate ? parseFloat(manualLT1Lactate) : null,
          manualLT1Intensity: manualLT1Intensity ? parseFloat(manualLT1Intensity) : null,
          manualLT2Lactate: manualLT2Lactate ? parseFloat(manualLT2Lactate) : null,
          manualLT2Intensity: manualLT2Intensity ? parseFloat(manualLT2Intensity) : null,
          // Pre-test baseline measurements
          restingLactate: restingLactate ? parseFloat(restingLactate) : null,
          restingHeartRate: restingHeartRate ? parseInt(restingHeartRate) : null,
          // Post-test measurements
          postTestMeasurements: postTestMeasurements.length > 0 ? postTestMeasurements : null,
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

              {/* Pre-test baseline measurements */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-blue-600">🩸</span>
                    Vilolaktat (före test)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Mät vilovärden innan testet börjar för att etablera baslinje.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Vilolaktat (mmol/L)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="t.ex. 1.2"
                        value={restingLactate}
                        onChange={(e) => setRestingLactate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vilopuls (bpm)</Label>
                      <Input
                        type="number"
                        placeholder="t.ex. 60"
                        value={restingHeartRate}
                        onChange={(e) => setRestingHeartRate(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

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

              {/* Post-test measurements (peak lactate) */}
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-red-600">📈</span>
                    Maxlaktat efter test
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Mät laktat 1-5 minuter efter testet för att fånga det faktiska maxvärdet.
                    Laktat fortsätter ofta stiga efter avslutad belastning.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {postTestMeasurements.map((measurement, index) => (
                    <div key={index} className="flex items-end gap-3 p-3 bg-white rounded-lg border">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">Tid efter test (min)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          value={measurement.timeMin}
                          onChange={(e) =>
                            updatePostTestMeasurement(index, 'timeMin', parseFloat(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">Laktat (mmol/L)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={measurement.lactate || ''}
                          onChange={(e) =>
                            updatePostTestMeasurement(index, 'lactate', parseFloat(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">Puls (bpm)</Label>
                        <Input
                          type="number"
                          value={measurement.heartRate || ''}
                          onChange={(e) =>
                            updatePostTestMeasurement(index, 'heartRate', e.target.value ? parseInt(e.target.value) : undefined)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePostTestMeasurement(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPostTestMeasurement}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till mätning
                  </Button>
                </CardContent>
              </Card>

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

              {/* Manual Threshold Override Section */}
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-amber-600">⚡</span>
                    Manuell tröskelinställning
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Använd dessa fält för att manuellt ställa in tröskelvärden när algoritmen inte ger korrekta värden.
                    Lämna tom för automatisk beräkning.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* LT1 - Aerobic Threshold */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">LT1 (Aerob tröskel)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Laktat (mmol/L)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="t.ex. 2.0"
                          value={manualLT1Lactate}
                          onChange={(e) => setManualLT1Lactate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {test?.testType === 'RUNNING' ? 'Hastighet (km/h)' : 'Effekt (watt)'}
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder={test?.testType === 'RUNNING' ? 't.ex. 12.5' : 't.ex. 200'}
                          value={manualLT1Intensity}
                          onChange={(e) => setManualLT1Intensity(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* LT2 - Anaerobic Threshold */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">LT2 (Anaerob tröskel)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Laktat (mmol/L)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="t.ex. 4.0"
                          value={manualLT2Lactate}
                          onChange={(e) => setManualLT2Lactate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {test?.testType === 'RUNNING' ? 'Hastighet (km/h)' : 'Effekt (watt)'}
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder={test?.testType === 'RUNNING' ? 't.ex. 15.0' : 't.ex. 280'}
                          value={manualLT2Intensity}
                          onChange={(e) => setManualLT2Intensity(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
