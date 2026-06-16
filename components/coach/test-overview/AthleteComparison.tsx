'use client'

import { useLocale } from 'next-intl'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'

interface AthleteSummary {
  id: string
  name: string
  teamName: string | null
  latestVo2max: number | null
  latestMaxHR: number | null
  latestMaxLactate: number | null
  latestQualityReviewStatus?: string | null
  reviewRequiredCount?: number
}

interface AthleteComparisonProps {
  athletes: AthleteSummary[]
}

export function AthleteComparison({ athletes }: AthleteComparisonProps) {
  const locale = useLocale()

  if (athletes.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {locale === 'sv' ? 'Välj minst 2 atleter för jämförelse' : 'Select at least 2 athletes for comparison'}
      </div>
    )
  }

  const vo2Data = athletes
    .filter((a) => a.latestVo2max)
    .map((a) => ({ name: a.name.split(' ')[0], VO2max: a.latestVo2max }))

  const hrData = athletes
    .filter((a) => a.latestMaxHR)
    .map((a) => ({ name: a.name.split(' ')[0], 'Max HR': a.latestMaxHR }))

  const lactateData = athletes
    .filter((a) => a.latestMaxLactate)
    .map((a) => ({
      name: a.name.split(' ')[0],
      [locale === 'sv' ? 'Max Laktat' : 'Max lactate']: a.latestMaxLactate,
    }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {vo2Data.length > 0 && (
        <GlassCard glow="blue">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm">VO2max (ml/kg/min)</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vo2Data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Bar dataKey="VO2max" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCardContent>
        </GlassCard>
      )}

      {hrData.length > 0 && (
        <GlassCard glow="red">
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-sm">Max HR (bpm)</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hrData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Bar dataKey="Max HR" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCardContent>
        </GlassCard>
      )}

      {lactateData.length > 0 && (
        <GlassCard glow="amber">
          <GlassCardHeader className="pb-2">
          <GlassCardTitle className="text-sm">
            {locale === 'sv' ? 'Max Laktat' : 'Max lactate'} (mmol/L)
          </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={lactateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey={locale === 'sv' ? 'Max Laktat' : 'Max lactate'} fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Data table */}
      <GlassCard className="md:col-span-2" glow="purple">
        <GlassCardHeader className="pb-2">
          <GlassCardTitle className="text-sm">
            {locale === 'sv' ? 'Detaljerad jämförelse' : 'Detailed comparison'}
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">{locale === 'sv' ? 'Atlet' : 'Athlete'}</th>
                <th className="text-left py-2 pr-4 font-medium">{locale === 'sv' ? 'Lag' : 'Team'}</th>
                <th className="text-left py-2 pr-4 font-medium">{locale === 'sv' ? 'Status' : 'Status'}</th>
                <th className="text-right py-2 pr-4 font-medium">VO2max</th>
                <th className="text-right py-2 pr-4 font-medium">Max HR</th>
                <th className="text-right py-2 font-medium">
                  {locale === 'sv' ? 'Max Laktat' : 'Max lactate'}
                </th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{a.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{a.teamName || '-'}</td>
                  <td className="py-2 pr-4">
                    {a.latestQualityReviewStatus === 'REVIEW_REQUIRED' || (a.reviewRequiredCount && a.reviewRequiredCount > 0) ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        {locale === 'sv' ? 'Behöver granskas' : 'Needs review'}
                      </span>
                    ) : a.latestQualityReviewStatus === 'APPROVED' ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                        {locale === 'sv' ? 'Godkänd' : 'Approved'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono">{a.latestVo2max?.toFixed(1) || '-'}</td>
                  <td className="py-2 pr-4 text-right font-mono">{a.latestMaxHR || '-'}</td>
                  <td className="py-2 text-right font-mono">{a.latestMaxLactate?.toFixed(1) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
