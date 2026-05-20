'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SplitDriftChart } from './SplitDriftChart'
import { LactateCurveComparisonChart } from './LactateCurveComparisonChart'
import { TeamComparisonTable } from './TeamComparisonTable'
import { DetailedLapTable } from './DetailedLapTable'
import { AthleteSessionComparison } from './AthleteSessionComparison'
import { GarminSyncPanel } from './GarminSyncPanel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AnalysisData } from '@/lib/interval-session/analysis-service'
import { toast } from 'sonner'
import { useLocale } from 'next-intl'

interface IntervalAnalysisViewProps {
  sessionId: string
}

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

export function IntervalAnalysisView({ sessionId }: IntervalAnalysisViewProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/coach/interval-sessions/${sessionId}/analysis`
        )
        if (res.ok) {
          const analysisData = await res.json()
          setData(analysisData)
          // Auto-select first athlete for history tab
          if (analysisData.participants?.length > 0) {
            setSelectedAthleteId(analysisData.participants[0].clientId)
          }
        }
      } catch {
        toast.error(copy(locale, 'Could not fetch analysis data', 'Kunde inte hämta analysdata'))
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [sessionId, locale])

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
        {copy(locale, 'No data to show', 'Ingen data att visa')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <GarminSyncPanel sessionId={sessionId} />

      <Tabs defaultValue="splits" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="splits">{copy(locale, 'Splits', 'Splittider')}</TabsTrigger>
          <TabsTrigger value="lactate">Laktat</TabsTrigger>
          <TabsTrigger value="comparison">{copy(locale, 'Team comparison', 'Lagjämförelse')}</TabsTrigger>
          <TabsTrigger value="laps">{copy(locale, 'All laps', 'Alla varv')}</TabsTrigger>
          <TabsTrigger value="history">{copy(locale, 'History', 'Historik')}</TabsTrigger>
        </TabsList>

        <TabsContent value="splits">
          <SplitDriftChart data={data} />
        </TabsContent>

        <TabsContent value="lactate">
          <LactateCurveComparisonChart data={data} />
        </TabsContent>

        <TabsContent value="comparison">
          <TeamComparisonTable data={data} />
        </TabsContent>

        <TabsContent value="laps">
          <DetailedLapTable data={data} />
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            {data.participants.length > 1 && (
              <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder={copy(locale, 'Select athlete...', 'Välj atlet...')} />
                </SelectTrigger>
                <SelectContent>
                  {data.participants.map((p) => (
                    <SelectItem key={p.clientId} value={p.clientId}>
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedAthleteId && (
              <AthleteSessionComparison clientId={selectedAthleteId} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
