// components/programs/ProgramGenerationForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const formSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testId: z.string().min(1, 'Välj ett test'),
  goalType: z.enum([
    'marathon',
    'half-marathon',
    '10k',
    '5k',
    'fitness',
    'cycling',
    'skiing',
    'custom',
  ]),
  targetRaceDate: z.date().optional(),
  durationWeeks: z.number().min(4).max(52),
  trainingDaysPerWeek: z.number().min(2).max(7),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  currentWeeklyVolume: z.number().min(0).optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface ProgramGenerationFormProps {
  clients: any[]
}

export function ProgramGenerationForm({ clients }: ProgramGenerationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goalType: 'marathon',
      durationWeeks: 16,
      trainingDaysPerWeek: 4,
      experienceLevel: 'intermediate',
    },
  })

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/programs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          targetRaceDate: data.targetRaceDate?.toISOString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att skapa program')
      }

      toast.success('Program skapat!', {
        description: 'Träningsprogrammet har genererats och är klart att användas.',
      })

      // Redirect to the new program
      router.push(`/coach/programs/${result.data.id}`)
    } catch (error: any) {
      console.error('Error generating program:', error)
      toast.error('Något gick fel', {
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Client & Test Selection */}
        <Card>
          <CardHeader>
            <CardTitle>1. Välj klient och test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Klient *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      setSelectedClientId(value)
                      form.setValue('testId', '')
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj klient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.tests.length} test
                          {client.tests.length !== 1 && 'er'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedClient && (
              <FormField
                control={form.control}
                name="testId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konditionstest *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj test" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedClient.tests.map((test: any) => (
                          <SelectItem key={test.id} value={test.id}>
                            {format(new Date(test.testDate), 'PPP', { locale: sv })} -{' '}
                            {test.testType}
                            {test.vo2max && ` (VO2max: ${test.vo2max.toFixed(1)})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Välj det test som programmet ska baseras på
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Goal Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>2. Målsättning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="goalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typ av mål *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="marathon">Marathon (42.2 km)</SelectItem>
                      <SelectItem value="half-marathon">Halvmaraton (21.1 km)</SelectItem>
                      <SelectItem value="10k">10K</SelectItem>
                      <SelectItem value="5k">5K</SelectItem>
                      <SelectItem value="fitness">Allmän kondition</SelectItem>
                      <SelectItem value="cycling">Cykling</SelectItem>
                      <SelectItem value="skiing">Skidåkning</SelectItem>
                      <SelectItem value="custom">Anpassad</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetRaceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tävlingsdatum (valfritt)</FormLabel>
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
                            format(field.value, 'PPP', { locale: sv })
                          ) : (
                            <span>Välj datum</span>
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
                        disabled={(date) =>
                          date < new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Om du har ett specifikt tävlingsdatum
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Program Structure */}
        <Card>
          <CardHeader>
            <CardTitle>3. Programstruktur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="durationWeeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Antal veckor *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={4}
                        max={52}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>4-52 veckor</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trainingDaysPerWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Träningsdagar per vecka *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        max={7}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>2-7 dagar</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Erfarenhetsnivå *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">
                        <div>
                          <div className="font-medium">Nybörjare</div>
                          <div className="text-sm text-muted-foreground">
                            0-1 år av regelbunden träning
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="intermediate">
                        <div>
                          <div className="font-medium">Medel</div>
                          <div className="text-sm text-muted-foreground">
                            1-3 år av regelbunden träning
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="advanced">
                        <div>
                          <div className="font-medium">Avancerad</div>
                          <div className="text-sm text-muted-foreground">
                            3+ år av regelbunden träning
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Används för att justera träningsvolym och intensitet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentWeeklyVolume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuvarande veckvolym (valfritt)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="t.ex. 40"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Nuvarande träningsvolym i km/vecka (för löpning)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>4. Anteckningar (valfritt)</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Lägg till eventuella anteckningar om programmet, speciella hänsyn, eller mål..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Avbryt
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generera program
          </Button>
        </div>
      </form>
    </Form>
  )
}
