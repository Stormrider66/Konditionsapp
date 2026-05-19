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

const CATEGORY_COLORS: Record<string, string> = {
  PHYSIOLOGICAL: '#2563eb',
  BODY_COMPOSITION: '#059669',
  TRAINING_LOAD: '#d97706',
  DAILY_MONITORING: '#7c3aed',
  PERFORMANCE: '#dc2626',
  STRENGTH: '#ea580c',
  RECOVERY: '#0891b2',
  GAIT: '#4f46e5',
  INTEGRATION: '#0d9488',
  TEMPORAL: '#9333ea',
}

const CATEGORY_LABELS: Record<'en' | 'sv', Record<string, string>> = {
  en: {
    PHYSIOLOGICAL: 'Physiological',
    BODY_COMPOSITION: 'Body composition',
    TRAINING_LOAD: 'Training load',
    DAILY_MONITORING: 'Daily monitoring',
    PERFORMANCE: 'Performance',
    STRENGTH: 'Strength',
    RECOVERY: 'Recovery',
    GAIT: 'Gait',
    INTEGRATION: 'Integrations',
    TEMPORAL: 'Trends',
  },
  sv: {
    PHYSIOLOGICAL: 'Fysiologiska',
    BODY_COMPOSITION: 'Kroppssammansättning',
    TRAINING_LOAD: 'Träningsbelastning',
    DAILY_MONITORING: 'Daglig uppföljning',
    PERFORMANCE: 'Prestation',
    STRENGTH: 'Styrka',
    RECOVERY: 'Återhämtning',
    GAIT: 'Löpteknik',
    INTEGRATION: 'Integrationer',
    TEMPORAL: 'Trender',
  },
}

interface VIPItem {
  variableId: string
  variableName: string
  vip: number
  coefficient: number
  category: string
}

interface VIPChartProps {
  vipScores: VIPItem[]
}

interface CustomTooltipProps {
  locale: 'en' | 'sv'
  active?: boolean
  payload?: { payload: { name: string; vip: number; coefficient: number; category: string } }[]
}

function CustomTooltip({ active, payload, locale }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  const direction = d.coefficient > 0
    ? (locale === 'sv' ? 'Positiv' : 'Positive')
    : d.coefficient < 0
      ? (locale === 'sv' ? 'Negativ' : 'Negative')
      : 'Neutral'
  return (
    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium dark:text-white">{d.name}</p>
      <p className="text-muted-foreground">VIP: {d.vip.toFixed(3)}</p>
      <p className="text-muted-foreground">{locale === 'sv' ? 'Koefficient' : 'Coefficient'}: {d.coefficient > 0 ? '+' : ''}{d.coefficient.toFixed(3)}</p>
      <p className="text-muted-foreground">{locale === 'sv' ? 'Riktning' : 'Direction'}: {direction}</p>
      <p className="text-muted-foreground">{CATEGORY_LABELS[locale][d.category] ?? d.category}</p>
    </div>
  )
}

export function VIPChart({ vipScores }: VIPChartProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const data = [...vipScores]
    .sort((a, b) => b.vip - a.vip)
    .map((v) => ({
      name: v.variableName,
      vip: +v.vip.toFixed(3),
      coefficient: v.coefficient,
      category: v.category,
    }))

  const presentCategories = new Set(data.map((d) => d.category))

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        {locale === 'sv' ? 'VIP-poäng' : 'VIP score'} (Variable Importance in Projection)
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {locale === 'sv'
          ? 'Variabler med VIP > 1.0 har störst inverkan på modellen. Färg indikerar kategori.'
          : 'Variables with VIP > 1.0 have the largest impact on the model. Color indicates category.'}
      </p>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
          <XAxis type="number" tick={{ fill: 'currentColor' }} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            width={110}
          />
          <Tooltip content={<CustomTooltip locale={locale} />} />
          <ReferenceLine
            x={1.0}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: 'VIP = 1.0', position: 'top', fill: '#ef4444', fontSize: 11 }}
          />
          <Bar dataKey="vip" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CATEGORY_COLORS[entry.category] ?? '#6b7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground justify-center flex-wrap">
        {Object.entries(CATEGORY_LABELS[locale])
          .filter(([key]) => presentCategories.has(key))
          .map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: CATEGORY_COLORS[key] }}
              />
              {label}
            </span>
          ))}
      </div>
    </div>
  )
}
