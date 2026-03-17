'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity } from 'lucide-react'
import { MuscleGroupRadarChart } from './MuscleGroupRadarChart'
import { MuscleGroupStackedBarChart } from './MuscleGroupStackedBarChart'
import { CANONICAL_MUSCLE_GROUPS, type CanonicalMuscleGroup } from '@/lib/muscle-group-normalizer'

interface MuscleGroupDashboardProps {
  businessId?: string
}

interface ClientOption {
  id: string
  name: string
}

interface PeriodData {
  label: string
  muscleGroups: Record<CanonicalMuscleGroup, { volume: number; sets: number }>
}

interface MuscleGroupResponse {
  periods: PeriodData[]
  summary: {
    muscleGroups: Record<CanonicalMuscleGroup, { volume: number; sets: number }>
    totalVolume: number
    totalSets: number
  }
}

export function MuscleGroupDashboard({ businessId }: MuscleGroupDashboardProps) {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [data, setData] = useState<MuscleGroupResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [clientsLoading, setClientsLoading] = useState(true)

  // Fetch athlete list
  useEffect(() => {
    async function fetchClients() {
      try {
        const url = businessId
          ? `/api/business/${businessId}/clients`
          : '/api/coach/clients'
        const res = await fetch(url)
        if (res.ok) {
          const result = await res.json()
          const list = (result.clients || result || []).map((c: any) => ({
            id: c.id,
            name: c.name || 'Okänd atlet',
          }))
          setClients(list)
          if (list.length > 0) setSelectedClientId(list[0].id)
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setClientsLoading(false)
      }
    }
    fetchClients()
  }, [businessId])

  // Fetch muscle group data when client or period changes
  useEffect(() => {
    if (!selectedClientId) return

    async function fetchData() {
      setIsLoading(true)
      try {
        const count = period === 'week' ? 8 : 6
        const url = businessId
          ? `/api/business/${businessId}/strength/muscle-groups?clientId=${selectedClientId}&period=${period}&count=${count}`
          : `/api/athlete/muscle-groups?period=${period}&count=${count}`
        const res = await fetch(url)
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch (error) {
        console.error('Error fetching muscle group data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [selectedClientId, period, businessId])

  // Compute balance score: 100 - coefficient of variation (capped 0-100)
  const balanceScore = (() => {
    if (!data) return null
    const volumes = CANONICAL_MUSCLE_GROUPS
      .filter((g) => g !== 'Helkropp')
      .map((g) => data.summary.muscleGroups[g].volume)
      .filter((v) => v > 0)

    if (volumes.length < 2) return null
    const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length
    const variance = volumes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / volumes.length
    const cv = Math.sqrt(variance) / mean
    return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)))
  })()

  // Find most/least trained groups
  const topGroups = (() => {
    if (!data) return { most: '-', least: '-' }
    const entries = CANONICAL_MUSCLE_GROUPS
      .filter((g) => g !== 'Helkropp')
      .map((g) => ({ group: g, volume: data.summary.muscleGroups[g].volume }))
      .filter((e) => e.volume > 0)
      .sort((a, b) => b.volume - a.volume)

    return {
      most: entries[0]?.group || '-',
      least: entries[entries.length - 1]?.group || '-',
    }
  })()

  if (clientsLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Muskelgruppsfördelning
            </CardTitle>
            <CardDescription>Volymbalans och trender per muskelgrupp</CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {/* Client selector */}
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Välj atlet" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period toggle */}
            <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="week">Vecka</TabsTrigger>
                <TabsTrigger value="month">Månad</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : !data || data.summary.totalSets === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border-dashed border-2 rounded-lg">
            <Activity className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Ingen styrkedata</p>
            <p className="text-sm">Vald atlet har inga loggade set under denna period</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Charts in 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Balans</h4>
                <MuscleGroupRadarChart summary={data.summary} />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Trender</h4>
                <MuscleGroupStackedBarChart periods={data.periods} />
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Total volym</p>
                <p className="text-lg font-bold">
                  {data.summary.totalVolume >= 1000
                    ? `${(data.summary.totalVolume / 1000).toFixed(1)}t`
                    : data.summary.totalVolume.toLocaleString('sv-SE')}{' '}
                  kg
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Totalt set</p>
                <p className="text-lg font-bold">{data.summary.totalSets}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mest tränad</p>
                <p className="text-lg font-bold">{topGroups.most}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balanspoäng</p>
                <p className="text-lg font-bold">
                  {balanceScore != null ? `${balanceScore}/100` : '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
