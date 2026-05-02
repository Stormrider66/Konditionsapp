'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface StageData {
  duration: number
  heartRate: number
  lactate: number
  vo2?: number | null
  speed?: number | null
  incline?: number | null
  power?: number | null
  cadence?: number | null
  pace?: number | null
}

interface EditTestFormData {
  testDate: string
  notes?: string
  restingLactate?: number | null
  restingHeartRate?: number | null
  stages: StageData[]
}

export default function EditTestPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const testId = params.testId as string
  const businessSlug = params.businessSlug as string | undefined
  const basePath = businessSlug ? `/${businessSlug}` : ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testType, setTestType] = useState<string>('RUNNING')
  const [clientName, setClientName] = useState('')

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EditTestFormData>()
  const { fields, append, remove } = useFieldArray({ control, name: 'stages' })

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`/api/tests/${testId}`)
        const result = await response.json()

        if (!result.success) {
          toast({ title: 'Fel', description: 'Kunde inte hämta test', variant: 'destructive' })
          return
        }

        const test = result.data
        setTestType(test.testType)
        setClientName(test.client?.name || '')

        reset({
          testDate: new Date(test.testDate).toISOString().split('T')[0],
          notes: test.notes || '',
          restingLactate: test.restingLactate,
          restingHeartRate: test.restingHeartRate,
          stages: test.testStages.map((s: any) => ({
            duration: s.duration,
            heartRate: s.heartRate,
            lactate: s.lactate,
            vo2: s.vo2,
            speed: s.speed,
            incline: s.incline,
            power: s.power,
            cadence: s.cadence,
            pace: s.pace,
          })),
        })
      } catch {
        toast({ title: 'Fel', description: 'Kunde inte hämta test', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    fetchTest()
  }, [testId, reset, toast])

  const onSubmit = async (data: EditTestFormData) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testDate: data.testDate,
          notes: data.notes,
          restingLactate: data.restingLactate ? Number(data.restingLactate) : null,
          restingHeartRate: data.restingHeartRate ? Number(data.restingHeartRate) : null,
          stages: data.stages.map((s) => ({
            duration: Number(s.duration),
            heartRate: Number(s.heartRate),
            lactate: Number(s.lactate),
            vo2: s.vo2 ? Number(s.vo2) : null,
            speed: s.speed ? Number(s.speed) : null,
            incline: s.incline ? Number(s.incline) : null,
            power: s.power ? Number(s.power) : null,
            cadence: s.cadence ? Number(s.cadence) : null,
            pace: s.pace ? Number(s.pace) : null,
          })),
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Kunde inte uppdatera test')
      }

      toast({ title: 'Sparat!', description: 'Testet har uppdaterats.' })
      router.push(`${basePath}/coach/tests/${testId}`)
    } catch (error) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte spara',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const intensityLabel = testType === 'RUNNING' ? 'Hastighet (km/h)' :
    testType === 'CYCLING' ? 'Effekt (W)' : 'Tempo (min/km)'
  const intensityField = testType === 'RUNNING' ? 'speed' :
    testType === 'CYCLING' ? 'power' : 'pace'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`${basePath}/coach/tests/${testId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Redigera test</h1>
          {clientName && <p className="text-sm text-muted-foreground">{clientName}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Test metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Testinformation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Testdatum</Label>
                <Input type="date" {...register('testDate')} />
              </div>
              <div className="space-y-2">
                <Label>Testtyp</Label>
                <Input value={testType === 'RUNNING' ? 'Löpning' : testType === 'CYCLING' ? 'Cykling' : 'Skidåkning'} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vilolaktat (mmol/L)</Label>
                <Input type="number" step="0.1" {...register('restingLactate')} />
              </div>
              <div className="space-y-2">
                <Label>Vilopuls (slag/min)</Label>
                <Input type="number" {...register('restingHeartRate')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Anteckningar</Label>
              <Input {...register('notes')} placeholder="Valfria anteckningar..." />
            </div>
          </CardContent>
        </Card>

        {/* Test stages */}
        <Card>
          <CardHeader>
            <CardTitle>Teststeg</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left">Steg</th>
                    <th className="px-2 py-2 text-left">Tid (min)</th>
                    <th className="px-2 py-2 text-left">Puls</th>
                    <th className="px-2 py-2 text-left">Laktat</th>
                    <th className="px-2 py-2 text-left">VO2</th>
                    <th className="px-2 py-2 text-left">{intensityLabel}</th>
                    {testType === 'RUNNING' && <th className="px-2 py-2 text-left">Lutning (%)</th>}
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-b">
                      <td className="px-2 py-2 font-medium">{index + 1}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          {...register(`stages.${index}.duration`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          className="w-20"
                          {...register(`stages.${index}.heartRate`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          {...register(`stages.${index}.lactate`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          placeholder="-"
                          {...register(`stages.${index}.vo2`, { valueAsNumber: true })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20"
                          {...register(`stages.${index}.${intensityField}` as any, { valueAsNumber: true })}
                        />
                      </td>
                      {testType === 'RUNNING' && (
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.1"
                            className="w-20"
                            placeholder="0"
                            {...register(`stages.${index}.incline`, { valueAsNumber: true })}
                          />
                        </td>
                      )}
                      <td className="px-2 py-2">
                        {fields.length > 3 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() =>
                append({
                  duration: 4,
                  heartRate: 0,
                  lactate: 0,
                  vo2: null,
                  speed: testType === 'RUNNING' ? 0 : null,
                  power: testType === 'CYCLING' ? 0 : null,
                  pace: testType === 'SKIING' ? 0 : null,
                  incline: null,
                  cadence: null,
                })
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Lägg till steg
            </Button>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="min-w-[140px]">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Spara ändringar</>
            )}
          </Button>
          <Link href={`${basePath}/coach/tests/${testId}`}>
            <Button type="button" variant="outline">Avbryt</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
