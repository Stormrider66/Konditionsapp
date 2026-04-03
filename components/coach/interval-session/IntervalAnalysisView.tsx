'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SplitDriftChart } from './SplitDriftChart'
import { LactateCurveComparisonChart } from './LactateCurveComparisonChart'
import { TeamComparisonTable } from './TeamComparisonTable'
import { DetailedLapTable } from './DetailedLapTable'
import { GarminSyncPanel } from './GarminSyncPanel'
import type { AnalysisData } from '@/lib/interval-session/analysis-service'
import { toast } from 'sonner'

interface IntervalAnalysisViewProps {
  sessionId: string
}

export function IntervalAnalysisView({ sessionId }: IntervalAnalysisViewProps) {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/coach/interval-sessions/${sessionId}/analysis`
        )
        if (res.ok) {
          setData(await res.json())
        }
      } catch {
        toast.error('Kunde inte hämta analysdata')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sessionId])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data || data.participants.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Ingen data att visa
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <GarminSyncPanel sessionId={sessionId} />

      <Tabs defaultValue="laps" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="laps">Alla varv</TabsTrigger>
          <TabsTrigger value="splits">Splittider</TabsTrigger>
          <TabsTrigger value="lactate">Laktat</TabsTrigger>
          <TabsTrigger value="comparison">Lagjämförelse</TabsTrigger>
        </TabsList>

        <TabsContent value="laps">
          <DetailedLapTable data={data} />
        </TabsContent>

        <TabsContent value="splits">
          <SplitDriftChart data={data} />
        </TabsContent>

        <TabsContent value="lactate">
          <LactateCurveComparisonChart data={data} />
        </TabsContent>

        <TabsContent value="comparison">
          <TeamComparisonTable data={data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
