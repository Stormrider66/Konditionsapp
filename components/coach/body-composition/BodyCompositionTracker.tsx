'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Activity,
  Target,
  Calendar,
} from 'lucide-react'
import { BioimpedanceForm } from '@/components/forms/BioimpedanceForm'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

const copy = {
  en: {
    errors: {
      fetch: 'Could not fetch data',
      delete: 'Could not delete measurement',
      unknown: 'Unknown error',
      title: 'Error',
    },
    deletedTitle: 'Measurement deleted',
    deletedDescription: 'The measurement has been deleted.',
    title: 'Body composition',
    newMeasurement: 'New measurement',
    metrics: {
      weight: 'Weight',
      bodyFat: 'Body fat',
      muscleMass: 'Muscle mass',
      visceralFat: 'Visceral fat',
    },
    development: 'Progress',
    basedOn: (count: number, days: number) => `Based on ${count} measurements over ${days} days`,
    trends: {
      totalWeight: 'Total weight change',
      totalFat: 'Total fat change',
      totalMuscle: 'Total muscle change',
      weeklyWeight: 'Average weight change',
      perWeek: 'kg/week',
    },
    chartTitle: 'Progress chart',
    chart: {
      weight: 'Weight (kg)',
      fat: 'Body fat (%)',
      muscle: 'Muscle mass (kg)',
    },
    history: 'Measurement history',
    noMeasurements: 'No measurements registered yet.',
    addFirst: 'Add first measurement',
    historyLabels: {
      weight: 'Weight',
      fat: 'Fat',
      muscle: 'Muscle',
      visceral: 'Visc',
    },
    recommendations: 'Recommendations',
    editMeasurement: 'Edit measurement',
    deleteTitle: 'Delete measurement?',
    deleteDescription: 'This action cannot be undone. The measurement will be permanently deleted.',
    cancel: 'Cancel',
    delete: 'Delete',
  },
  sv: {
    errors: {
      fetch: 'Kunde inte hämta data',
      delete: 'Kunde inte ta bort mätning',
      unknown: 'Okänt fel',
      title: 'Fel',
    },
    deletedTitle: 'Mätning borttagen',
    deletedDescription: 'Mätningen har tagits bort.',
    title: 'Kroppssammansättning',
    newMeasurement: 'Ny mätning',
    metrics: {
      weight: 'Vikt',
      bodyFat: 'Kroppsfett',
      muscleMass: 'Muskelmassa',
      visceralFat: 'Visceralt fett',
    },
    development: 'Utveckling',
    basedOn: (count: number, days: number) => `Baserat på ${count} mätningar över ${days} dagar`,
    trends: {
      totalWeight: 'Total viktförändring',
      totalFat: 'Total fettförändring',
      totalMuscle: 'Total muskelförändring',
      weeklyWeight: 'Genomsnittlig viktförändring',
      perWeek: 'kg/vecka',
    },
    chartTitle: 'Utvecklingskurva',
    chart: {
      weight: 'Vikt (kg)',
      fat: 'Kroppsfett (%)',
      muscle: 'Muskelmassa (kg)',
    },
    history: 'Mäthistorik',
    noMeasurements: 'Inga mätningar registrerade ännu.',
    addFirst: 'Lägg till första mätningen',
    historyLabels: {
      weight: 'Vikt',
      fat: 'Fett',
      muscle: 'Muskel',
      visceral: 'Visc',
    },
    recommendations: 'Rekommendationer',
    editMeasurement: 'Redigera mätning',
    deleteTitle: 'Ta bort mätning?',
    deleteDescription: 'Denna åtgärd kan inte ångras. Mätningen kommer att tas bort permanent.',
    cancel: 'Avbryt',
    delete: 'Ta bort',
  },
} as const

function formatDate(date: Date | string, locale: AppLocale, options?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', options)
}

function formatCategory(category: string | undefined, locale: AppLocale) {
  if (!category || locale === 'sv') return category

  const categoryMap: Record<string, string> = {
    Normal: 'Normal',
    Förhöjd: 'Elevated',
    Hög: 'High',
    Låg: 'Low',
    Undervikt: 'Underweight',
    Normalvikt: 'Normal weight',
    Övervikt: 'Overweight',
    Fetma: 'Obesity',
    Atletisk: 'Athletic',
    Vältränad: 'Well trained',
    Genomsnittlig: 'Average',
  }

  return categoryMap[category] ?? category
}

function isElevatedVisceralFatCategory(category: string | undefined) {
  return category === 'Förhöjd' || category === 'Elevated'
}

interface BodyComposition {
  id: string
  measurementDate: string
  weightKg: number | null
  bodyFatPercent: number | null
  muscleMassKg: number | null
  visceralFat: number | null
  boneMassKg: number | null
  waterPercent: number | null
  bmrKcal: number | null
  metabolicAge: number | null
  bmi: number | null
  ffmi: number | null
  deviceBrand: string | null
  measurementTime: string | null
  notes: string | null
  changes?: {
    weightChange: number | null
    bodyFatChange: number | null
    muscleMassChange: number | null
    daysSincePrevious: number
  } | null
  analysis?: {
    bmiCategory?: string
    bodyFatCategory?: string
    visceralFatCategory?: string
    ffmiCategory?: string
    recommendations: string[]
  }
}

interface Trends {
  totalWeightChange: number | null
  totalBodyFatChange: number | null
  totalMuscleMassChange: number | null
  periodDays: number
  measurementCount: number
  weeklyWeightChange: number | null
}

interface BodyCompositionTrackerProps {
  clientId: string
  clientName?: string
}

export function BodyCompositionTracker({ clientId, clientName }: BodyCompositionTrackerProps) {
  const { toast } = useToast()
  const locale = useLocale() as AppLocale
  const t = copy[locale] ?? copy.en
  const [measurements, setMeasurements] = useState<BodyComposition[]>([])
  const [trends, setTrends] = useState<Trends | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<BodyComposition | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/body-composition?clientId=${clientId}&analysis=true`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t.errors.fetch)
      }

      setMeasurements(data.measurements)
      setTrends(data.trends)
    } catch (error) {
      toast({
        title: t.errors.title,
        description: error instanceof Error ? error.message : t.errors.unknown,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [clientId, t.errors.fetch, t.errors.title, t.errors.unknown, toast])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchData])

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/body-composition/${deleteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(t.errors.delete)
      }

      toast({
        title: t.deletedTitle,
        description: t.deletedDescription,
      })

      void fetchData()
    } catch (error) {
      toast({
        title: t.errors.title,
        description: error instanceof Error ? error.message : t.errors.unknown,
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  const chartData = measurements
    .slice()
    .reverse()
    .map((m) => ({
      date: formatDate(m.measurementDate, locale, { month: 'short', day: 'numeric' }),
      vikt: m.weightKg,
      fett: m.bodyFatPercent,
      muskel: m.muscleMassKg,
    }))

  const latestMeasurement = measurements[0]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-1.5">
            <Scale className="h-6 w-6" />
            {t.title} <InfoTooltip conceptKey="bodyComposition" />
          </h2>
          {clientName && <p className="text-muted-foreground">{clientName}</p>}
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t.newMeasurement}
        </Button>
      </div>

      {/* Summary cards */}
      {latestMeasurement && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Weight card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.metrics.weight}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {latestMeasurement.weightKg?.toFixed(1) || '-'}
                </span>
                <span className="text-muted-foreground">kg</span>
                {latestMeasurement.changes && latestMeasurement.changes.weightChange != null && (
                  <ChangeIndicator value={latestMeasurement.changes!.weightChange} unit="kg" invertColors />
                )}
              </div>
              {latestMeasurement.bmi && (
                <p className="text-sm text-muted-foreground mt-1">
                  BMI: {latestMeasurement.bmi} ({formatCategory(latestMeasurement.analysis?.bmiCategory, locale)})
                </p>
              )}
            </CardContent>
          </Card>

          {/* Body fat card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.metrics.bodyFat}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {latestMeasurement.bodyFatPercent?.toFixed(1) || '-'}
                </span>
                <span className="text-muted-foreground">%</span>
                {latestMeasurement.changes && latestMeasurement.changes.bodyFatChange != null && (
                  <ChangeIndicator value={latestMeasurement.changes.bodyFatChange} unit="%" invertColors />
                )}
              </div>
              {latestMeasurement.analysis?.bodyFatCategory && (
                <Badge variant="secondary" className="mt-1">
                  {formatCategory(latestMeasurement.analysis.bodyFatCategory, locale)}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Muscle mass card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.metrics.muscleMass}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {latestMeasurement.muscleMassKg?.toFixed(1) || '-'}
                </span>
                <span className="text-muted-foreground">kg</span>
                {latestMeasurement.changes && latestMeasurement.changes.muscleMassChange != null && (
                  <ChangeIndicator value={latestMeasurement.changes.muscleMassChange} unit="kg" />
                )}
              </div>
              {latestMeasurement.ffmi && (
                <p className="text-sm text-muted-foreground mt-1">
                  FFMI: {latestMeasurement.ffmi} ({formatCategory(latestMeasurement.analysis?.ffmiCategory, locale)})
                </p>
              )}
            </CardContent>
          </Card>

          {/* Visceral fat card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.metrics.visceralFat}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {latestMeasurement.visceralFat || '-'}
                </span>
              </div>
              {latestMeasurement.analysis?.visceralFatCategory && (
                <Badge
                  variant={
                    latestMeasurement.analysis.visceralFatCategory === 'Normal'
                      ? 'secondary'
                      : isElevatedVisceralFatCategory(latestMeasurement.analysis.visceralFatCategory)
                        ? 'outline'
                        : 'destructive'
                  }
                  className="mt-1"
                >
                  {formatCategory(latestMeasurement.analysis.visceralFatCategory, locale)}
                </Badge>
              )}
              {latestMeasurement.visceralFat && (
                <Progress
                  value={(latestMeasurement.visceralFat / 20) * 100}
                  className="h-1 mt-2"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends summary */}
      {trends && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t.development}
            </CardTitle>
            <CardDescription>
              {t.basedOn(trends.measurementCount, trends.periodDays)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TrendCard
                label={t.trends.totalWeight}
                value={trends.totalWeightChange}
                unit="kg"
                invertColors
              />
              <TrendCard
                label={t.trends.totalFat}
                value={trends.totalBodyFatChange}
                unit="%"
                invertColors
              />
              <TrendCard
                label={t.trends.totalMuscle}
                value={trends.totalMuscleMassChange}
                unit="kg"
              />
            </div>
            {trends.weeklyWeightChange !== null && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {t.trends.weeklyWeight}: {trends.weeklyWeightChange > 0 ? '+' : ''}{trends.weeklyWeightChange} {t.trends.perWeek}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.chartTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="vikt"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name={t.chart.weight}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="fett"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name={t.chart.fat}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="muskel"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name={t.chart.muscle}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurement history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t.history}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {measurements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.noMeasurements}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.addFirst}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {measurements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatDate(m.measurementDate, locale)}
                      </span>
                      {m.deviceBrand && (
                        <Badge variant="outline" className="text-xs">
                          {m.deviceBrand}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                      {m.weightKg && <span>{t.historyLabels.weight}: {m.weightKg} kg</span>}
                      {m.bodyFatPercent && <span>{t.historyLabels.fat}: {m.bodyFatPercent}%</span>}
                      {m.muscleMassKg && <span>{t.historyLabels.muscle}: {m.muscleMassKg} kg</span>}
                      {m.visceralFat && <span>{t.historyLabels.visceral}: {m.visceralFat}</span>}
                    </div>
                    {m.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {m.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingMeasurement(m)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {latestMeasurement?.analysis?.recommendations && latestMeasurement.analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t.recommendations}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {latestMeasurement.analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit dialog */}
      <Dialog
        open={showAddDialog || !!editingMeasurement}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingMeasurement(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMeasurement ? t.editMeasurement : t.newMeasurement}
            </DialogTitle>
          </DialogHeader>
          <BioimpedanceForm
            clientId={clientId}
            initialData={
              editingMeasurement
                ? {
                    id: editingMeasurement.id,
                    date: editingMeasurement.measurementDate.split('T')[0],
                    weight: editingMeasurement.weightKg ?? undefined,
                    bodyFatPercent: editingMeasurement.bodyFatPercent ?? undefined,
                    muscleMass: editingMeasurement.muscleMassKg ?? undefined,
                    visceralFat: editingMeasurement.visceralFat ?? undefined,
                    boneMass: editingMeasurement.boneMassKg ?? undefined,
                    waterPercent: editingMeasurement.waterPercent ?? undefined,
                    bmr: editingMeasurement.bmrKcal ?? undefined,
                    deviceBrand: editingMeasurement.deviceBrand ?? undefined,
                    measurementTime: editingMeasurement.measurementTime ?? undefined,
                    notes: editingMeasurement.notes ?? undefined,
                  }
                : undefined
            }
            onSuccess={() => {
              setShowAddDialog(false)
              setEditingMeasurement(null)
              void fetchData()
            }}
            onCancel={() => {
              setShowAddDialog(false)
              setEditingMeasurement(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Helper components
function ChangeIndicator({
  value,
  unit,
  invertColors = false,
}: {
  value: number
  unit: string
  invertColors?: boolean
}) {
  if (value === 0) {
    return (
      <span className="flex items-center text-muted-foreground text-sm">
        <Minus className="h-3 w-3 mr-1" />0
      </span>
    )
  }

  const isPositive = value > 0
  const isGood = invertColors ? !isPositive : isPositive

  return (
    <span
      className={`flex items-center text-sm ${
        isGood ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3 mr-1" />
      ) : (
        <TrendingDown className="h-3 w-3 mr-1" />
      )}
      {isPositive ? '+' : ''}
      {value}
      {unit}
    </span>
  )
}

function TrendCard({
  label,
  value,
  unit,
  invertColors = false,
}: {
  label: string
  value: number | null
  unit: string
  invertColors?: boolean
}) {
  if (value === null) {
    return (
      <div className="text-center p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">-</p>
      </div>
    )
  }

  const isPositive = value > 0
  const isGood = invertColors ? !isPositive : isPositive

  return (
    <div className="text-center p-4 bg-muted rounded-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`text-xl font-semibold ${
          value === 0
            ? 'text-muted-foreground'
            : isGood
              ? 'text-green-600'
              : 'text-red-600'
        }`}
      >
        {isPositive ? '+' : ''}
        {value.toFixed(1)}
        {unit}
      </p>
    </div>
  )
}
