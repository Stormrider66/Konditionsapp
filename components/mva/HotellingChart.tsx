'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { useLocale } from '@/i18n/client'

interface AthleteDiag {
  clientName: string
  hotellingT2: number
  isOutlierT2: boolean
}

interface HotellingChartProps {
  diagnostics: AthleteDiag[]
  t2Limit95: number
  t2Limit99: number
}

export function HotellingChart({ diagnostics, t2Limit95, t2Limit99 }: HotellingChartProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const data = [...diagnostics]
    .sort((a, b) => b.hotellingT2 - a.hotellingT2)
    .map((d) => ({
      name: d.clientName,
      t2: +d.hotellingT2.toFixed(2),
      outlier: d.isOutlierT2,
    }))

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        Hotelling&apos;s T²
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {locale === 'sv'
          ? 'Avstånd från centrum i modellen. Höga värden indikerar ovanliga profiler.'
          : 'Distance from the model center. High values indicate unusual profiles.'}
      </p>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
          <XAxis type="number" tick={{ fill: 'currentColor' }} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            width={90}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background, #fff)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number) => [`${value}`, "Hotelling's T²"]}
          />
          <ReferenceLine
            x={t2Limit95}
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{ value: '95%', position: 'top', fill: '#f59e0b', fontSize: 11 }}
          />
          <ReferenceLine
            x={t2Limit99}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: '99%', position: 'top', fill: '#ef4444', fontSize: 11 }}
          />
          <Bar dataKey="t2" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.outlier ? '#ef4444' : '#2563eb'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
