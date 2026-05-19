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
  dmodx: number
  isOutlierDModX: boolean
}

interface DModXChartProps {
  diagnostics: AthleteDiag[]
  dmodxLimit: number
}

export function DModXChart({ diagnostics, dmodxLimit }: DModXChartProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const data = [...diagnostics]
    .sort((a, b) => b.dmodx - a.dmodx)
    .map((d) => ({
      name: d.clientName,
      dmodx: +d.dmodx.toFixed(3),
      outlier: d.isOutlierDModX,
    }))

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        {locale === 'sv' ? 'Avstånd till modellen' : 'Distance to model'} (DModX)
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {locale === 'sv'
          ? 'Hur väl varje spelare passar modellen. Höga värden = passar inte lagmönstret.'
          : 'How well each player fits the model. High values indicate a poor fit to the team pattern.'}
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
            formatter={(value: number) => [`${value}`, 'DModX']}
          />
          <ReferenceLine
            x={dmodxLimit}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: locale === 'sv' ? 'Gräns' : 'Limit', position: 'top', fill: '#ef4444', fontSize: 11 }}
          />
          <Bar dataKey="dmodx" radius={[0, 4, 4, 0]}>
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
