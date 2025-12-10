'use client'

import { useState, useEffect } from 'react'
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
  ReferenceLine,
} from 'recharts'
import {
  Scale,
  Percent,
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
import { BioimpedanceForm } from './BioimpedanceForm'

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
  const [measurements, setMeasurements] = useState<BodyComposition[]>([])
  const [trends, setTrends] = useState<Trends | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState<BodyComposition | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/body-composition?clientId=${clientId}&analysis=true`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta data')
      }

      setMeasurements(data.measurements)
      setTrends(data.trends)
    } catch (error) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [clientId])

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/body-composition/${deleteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Kunde inte ta bort mätning')
      }

      toast({
        title: 'Mätning borttagen',
        description: 'Mätningen har tagits bort.',
      })

      fetchData()
    } catch (error) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Okänt fel',
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
      date: new Date(m.measurementDate).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }),
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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Kroppssammansättning
          </h2>
          {clientName && <p className="text-muted-foreground">{clientName}</p>}
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ny mätning
        </Button>
      </div>

      {/* Summary cards */}
      {latestMeasurement && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Weight card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vikt
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
                  BMI: {latestMeasurement.bmi} ({latestMeasurement.analysis?.bmiCategory})
                </p>
              )}
            </CardContent>
          </Card>

          {/* Body fat card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Kroppsfett
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
                  {latestMeasurement.analysis.bodyFatCategory}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Muscle mass card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Muskelmassa
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
                  FFMI: {latestMeasurement.ffmi} ({latestMeasurement.analysis?.ffmiCategory})
                </p>
              )}
            </CardContent>
          </Card>

          {/* Visceral fat card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Visceralt fett
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
                      : latestMeasurement.analysis.visceralFatCategory === 'Förhöjd'
                        ? 'outline'
                        : 'destructive'
                  }
                  className="mt-1"
                >
                  {latestMeasurement.analysis.visceralFatCategory}
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
              Utveckling
            </CardTitle>
            <CardDescription>
              Baserat på {trends.measurementCount} mätningar över {trends.periodDays} dagar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TrendCard
                label="Total viktförändring"
                value={trends.totalWeightChange}
                unit="kg"
                invertColors
              />
              <TrendCard
                label="Total fettförändring"
                value={trends.totalBodyFatChange}
                unit="%"
                invertColors
              />
              <TrendCard
                label="Total muskelförändring"
                value={trends.totalMuscleMassChange}
                unit="kg"
              />
            </div>
            {trends.weeklyWeightChange !== null && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Genomsnittlig viktförändring: {trends.weeklyWeightChange > 0 ? '+' : ''}{trends.weeklyWeightChange} kg/vecka
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Utvecklingskurva</CardTitle>
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
                    name="Vikt (kg)"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="fett"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Kroppsfett (%)"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="muskel"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Muskelmassa (kg)"
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
            Mäthistorik
          </CardTitle>
        </CardHeader>
        <CardContent>
          {measurements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga mätningar registrerade ännu.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Lägg till första mätningen
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
                        {new Date(m.measurementDate).toLocaleDateString('sv-SE')}
                      </span>
                      {m.deviceBrand && (
                        <Badge variant="outline" className="text-xs">
                          {m.deviceBrand}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                      {m.weightKg && <span>Vikt: {m.weightKg} kg</span>}
                      {m.bodyFatPercent && <span>Fett: {m.bodyFatPercent}%</span>}
                      {m.muscleMassKg && <span>Muskel: {m.muscleMassKg} kg</span>}
                      {m.visceralFat && <span>Visc: {m.visceralFat}</span>}
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
              Rekommendationer
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
              {editingMeasurement ? 'Redigera mätning' : 'Ny mätning'}
            </DialogTitle>
          </DialogHeader>
          <BioimpedanceForm
            clientId={clientId}
            initialData={
              editingMeasurement
                ? {
                    id: editingMeasurement.id,
                    measurementDate: editingMeasurement.measurementDate.split('T')[0],
                    weightKg: editingMeasurement.weightKg,
                    bodyFatPercent: editingMeasurement.bodyFatPercent,
                    muscleMassKg: editingMeasurement.muscleMassKg,
                    visceralFat: editingMeasurement.visceralFat,
                    boneMassKg: editingMeasurement.boneMassKg,
                    waterPercent: editingMeasurement.waterPercent,
                    bmrKcal: editingMeasurement.bmrKcal,
                    metabolicAge: editingMeasurement.metabolicAge,
                    deviceBrand: editingMeasurement.deviceBrand,
                    measurementTime: editingMeasurement.measurementTime,
                    notes: editingMeasurement.notes,
                  }
                : undefined
            }
            onSuccess={() => {
              setShowAddDialog(false)
              setEditingMeasurement(null)
              fetchData()
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
            <AlertDialogTitle>Ta bort mätning?</AlertDialogTitle>
            <AlertDialogDescription>
              Denna åtgärd kan inte ångras. Mätningen kommer att tas bort permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Ta bort
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
