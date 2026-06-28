'use client'

import { useLocale } from 'next-intl'
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
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Calendar } from 'lucide-react'

interface TestRecord {
  clientId: string
  clientName: string
  testDate: string
  vo2max: number | null
  maxHR: number | null
  maxLactate: number | null
  qualityReviewStatus?: string | null
}

interface YearOverYearChartProps {
  tests: TestRecord[]
  selectedAthleteIds: string[]
  metric: 'vo2max' | 'maxHR' | 'maxLactate'
}

const getMetricConfig = (locale: string) => ({
  vo2max: { label: 'VO2max', unit: 'ml/kg/min', color: '#3B82F6' },
  maxHR: { label: 'Max HR', unit: 'bpm', color: '#EF4444' },
  maxLactate: {
    label: locale === 'sv' ? 'Max Laktat' : 'Max lactate',
    unit: 'mmol/L',
    color: '#F59E0B',
  },
})

const COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

export function YearOverYearChart({ tests, selectedAthleteIds, metric }: YearOverYearChartProps) {
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const config = getMetricConfig(locale)[metric]

  // Filter to selected athletes
  const filteredTests = tests.filter((t) =>
    selectedAthleteIds.length === 0 || selectedAthleteIds.includes(t.clientId)
  )
  const reviewRequiredCount = filteredTests.filter((t) => t.qualityReviewStatus === 'REVIEW_REQUIRED').length

  // Get unique athlete names
  const athleteNames = new Map<string, string>()
  filteredTests.forEach((t) => athleteNames.set(t.clientId, t.clientName))

  // Build timeline data: group by month
  const monthMap = new Map<string, Record<string, number | string>>()

  filteredTests.forEach((t) => {
    const value = t[metric]
    if (value === null) return

    const date = new Date(t.testDate)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString(dateLocale, { month: 'short', year: '2-digit' })

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { month: label })
    }
    const point = monthMap.get(monthKey)!

    // Use first name for chart key
    const name = t.clientName.split(' ')[0]
    // If multiple tests in same month, keep latest
    point[name] = value
  })

  const chartData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, data]) => data)

  const uniqueNames = Array.from(new Set(filteredTests.map((t) => t.clientName.split(' ')[0])))

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {locale === 'sv' ? 'Inga testresultat att visa över tid' : 'No test results to show over time'}
      </div>
    )
  }

  return (
    <RolePanel>
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-white/10">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          <Calendar className="h-4 w-4" />
          {config.label} {locale === 'sv' ? 'över tid' : 'over time'} ({config.unit})
          {reviewRequiredCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {locale === 'sv'
                ? `${reviewRequiredCount} behöver granskas`
                : `${reviewRequiredCount} need review`}
            </span>
          )}
        </h3>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ left: -10, right: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {uniqueNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </RolePanel>
  )
}
