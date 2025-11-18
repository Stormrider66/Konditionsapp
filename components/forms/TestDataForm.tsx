'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Save, Download, Info } from 'lucide-react'
import { createTestSchema, CreateTestFormData } from '@/lib/validations/schemas'
import { TestType, TestTemplate } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface TestDataFormProps {
  testType: TestType
  onSubmit: (data: CreateTestFormData) => void
  clientId?: string
}

export function TestDataForm({ testType, onSubmit, clientId }: TestDataFormProps) {
  const { toast } = useToast()
  const {
    register,
    control,
    handleSubmit,
    getValues,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTestFormData>({
    resolver: zodResolver(createTestSchema),
    defaultValues: {
      testType,
      testDate: new Date().toISOString().split('T')[0],
      inclineUnit: 'PERCENT',
      stages: [
        {
          duration: 4,
          heartRate: 120,
          lactate: 1.0,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 8 : undefined,
          power: testType === 'CYCLING' ? 100 : undefined,
          pace: testType === 'SKIING' ? 7.5 : undefined,
        },
        {
          duration: 4,
          heartRate: 140,
          lactate: 2.0,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 10 : undefined,
          power: testType === 'CYCLING' ? 150 : undefined,
          pace: testType === 'SKIING' ? 6.0 : undefined,
        },
        {
          duration: 4,
          heartRate: 160,
          lactate: 4.0,
          vo2: undefined,
          speed: testType === 'RUNNING' ? 12 : undefined,
          power: testType === 'CYCLING' ? 200 : undefined,
          pace: testType === 'SKIING' ? 4.5 : undefined,
        },
      ],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'stages',
  })

  const inclineUnit = watch('inclineUnit') || 'PERCENT'
  const inclineLabel = inclineUnit === 'DEGREES' ? 'Lutning (°)' : 'Lutning (%)'

  const [templates, setTemplates] = useState<TestTemplate[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`/api/templates?testType=${testType}`)
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }, [testType])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const addStage = () => {
    append({
      duration: 4,
      heartRate: 120,
      lactate: 1.0,
      vo2: undefined,
      speed: testType === 'RUNNING' ? 8 : undefined,
      power: testType === 'CYCLING' ? 100 : undefined,
      pace: testType === 'SKIING' ? 7.5 : undefined,
    })
  }

  const handleSaveTemplate = async () => {
    if (!templateName) {
      toast({
        title: 'Fel',
        description: 'Ange ett namn för mallen',
        variant: 'destructive',
      })
      return
    }

    try {
      const stages = getValues('stages')
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          testType,
          description: templateDescription,
          stages,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Mall sparad!',
          description: 'Testmallen har sparats.',
        })
        setShowSaveDialog(false)
        setTemplateName('')
        setTemplateDescription('')
        fetchTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte spara mall',
        variant: 'destructive',
      })
    }
  }

  const handleLoadTemplate = (template: TestTemplate) => {
    replace(template.stages as any)
    setShowLoadDialog(false)
    toast({
      title: 'Mall laddad!',
      description: `Mall "${template.name}" har laddats.`,
    })
  }

  const onSubmitHandler = async (data: CreateTestFormData) => {
    console.log('Form submitted with data:', data)
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Error in form submission:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="testDate">Testdatum</Label>
        <Input
          id="testDate"
          type="date"
          {...register('testDate')}
        />
        {errors.testDate && <p className="text-sm text-red-600">{errors.testDate.message}</p>}
      </div>

      {/* Incline Unit Selector (only for running tests) */}
      {testType === 'RUNNING' && (
        <div className="space-y-2">
          <Label htmlFor="inclineUnit">Lutningsenhet</Label>
          <select
            id="inclineUnit"
            {...register('inclineUnit')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="PERCENT">Procent (%)</option>
            <option value="DEGREES">Grader (°)</option>
          </select>
          <p className="text-xs text-gray-500">
            Välj om lutning mäts i procent eller grader
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold">Teststeg</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setShowLoadDialog(true)}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Ladda mall
            </Button>
            <Button
              type="button"
              onClick={() => setShowSaveDialog(true)}
              variant="outline"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Spara som mall
            </Button>
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
        </div>
        {errors.stages && <p className="text-sm text-red-600">{errors.stages.message}</p>}

        {/* D-max Guidelines */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 font-semibold">
            Krav för D-max laktattröskelberäkning
          </AlertTitle>
          <AlertDescription className="text-blue-800 text-sm space-y-2 mt-2">
            <p className="font-medium">För optimal tröskelberäkning behövs:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Minst 4 teststeg</strong> - fler steg ger bättre precision (5-7 steg rekommenderas)
              </li>
              <li>
                <strong>Stigande laktatvärden</strong> - laktat ska öka mellan stegen (undvik större minskningar)
              </li>
              <li>
                <strong>Brett intensitetsområde</strong> - från lätt aerob (1-2 mmol/L) till anaerob (4-6 mmol/L)
              </li>
              <li>
                <strong>Jämna stegökningar</strong> - helst lika stor ökning mellan varje steg (hastighet/watt)
              </li>
              <li>
                <strong>Komplett data</strong> - fyll i hastighet/watt, puls och laktat för varje steg
              </li>
              <li className="text-xs text-blue-700">
                <strong>VO₂ är valfritt</strong> - trösklar kan beräknas utan VO₂-mätning
              </li>
            </ul>
            <div className="mt-3 pt-2 border-t border-blue-200">
              <p className="font-medium mb-1">Konfidensgrad baseras på:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                <li>Hög konfidens: R² ≥ 0.95 och tröskel 2-4 mmol/L</li>
                <li>Medel konfidens: R² ≥ 0.90 eller tröskel 1.5-4.5 mmol/L</li>
                <li>Låg konfidens: R² &lt; 0.90 - faller tillbaka på 4.0 mmol/L-metoden</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Steg {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {testType === 'RUNNING' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.speed`} className="text-xs">
                        Hastighet (km/h)
                      </Label>
                      <Input
                        id={`stages.${index}.speed`}
                        type="number"
                        step="0.1"
                        {...register(`stages.${index}.speed`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.incline`} className="text-xs">
                        {inclineLabel}
                      </Label>
                      <Input
                        id={`stages.${index}.incline`}
                        type="number"
                        step="0.5"
                        {...register(`stages.${index}.incline`, { valueAsNumber: true })}
                      />
                    </div>
                  </>
                ) : testType === 'CYCLING' ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.power`} className="text-xs">
                        Effekt (watt)
                      </Label>
                      <Input
                        id={`stages.${index}.power`}
                        type="number"
                        {...register(`stages.${index}.power`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`stages.${index}.cadence`} className="text-xs">
                        Kadens (rpm)
                      </Label>
                      <Input
                        id={`stages.${index}.cadence`}
                        type="number"
                        {...register(`stages.${index}.cadence`, { valueAsNumber: true })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor={`stages.${index}.pace`} className="text-xs">
                      Tempo (min/km)
                    </Label>
                    <Input
                      id={`stages.${index}.pace`}
                      type="number"
                      step="0.1"
                      {...register(`stages.${index}.pace`, { valueAsNumber: true })}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.heartRate`} className="text-xs">
                    Puls (slag/min)
                  </Label>
                  <Input
                    id={`stages.${index}.heartRate`}
                    type="number"
                    {...register(`stages.${index}.heartRate`, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.lactate`} className="text-xs">
                    Laktat (mmol/L)
                  </Label>
                  <Input
                    id={`stages.${index}.lactate`}
                    type="number"
                    step="0.1"
                    {...register(`stages.${index}.lactate`, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.vo2`} className="text-xs">
                    VO₂ (ml/kg/min) <span className="text-gray-400 font-normal">(valfritt)</span>
                  </Label>
                  <Input
                    id={`stages.${index}.vo2`}
                    type="number"
                    step="0.1"
                    placeholder="Valfritt"
                    {...register(`stages.${index}.vo2`, { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`stages.${index}.duration`} className="text-xs">
                    Tid (min)
                  </Label>
                  <Input
                    id={`stages.${index}.duration`}
                    type="number"
                    step="0.5"
                    {...register(`stages.${index}.duration`, { valueAsNumber: true })}
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
          {...register('notes')}
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
      >
        Generera Rapport
      </Button>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spara testmall</DialogTitle>
            <DialogDescription>
              Spara de nuvarande teststegen som en mall för framtida tester
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Namn</Label>
              <Input
                id="template-name"
                placeholder="T.ex. Lag Cykelmall 2025"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Beskrivning (valfritt)</Label>
              <textarea
                id="template-description"
                placeholder="Beskriv denna mall..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSaveTemplate}>Spara mall</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ladda testmall</DialogTitle>
            <DialogDescription>
              Välj en sparad mall för att ladda teststeg
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inga mallar sparade för {testType === 'RUNNING' ? 'löpning' : testType === 'CYCLING' ? 'cykling' : 'skidåkning'}
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-accent" onClick={() => handleLoadTemplate(template)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {template.stages.length} steg
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
