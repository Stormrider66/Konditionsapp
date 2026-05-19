'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { useLocale } from '@/i18n/client'

interface LoadingPlotProps {
  loadings: number[][]
  variableIds: string[]
  variableNames: string[]
  explainedVariance: number[]
  variableCategories?: Record<string, string>
}

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

interface CustomTooltipProps {
  locale: 'en' | 'sv'
  active?: boolean
  payload?: { payload: { name: string; l1: number; l2: number; category: string } }[]
}

function CustomTooltip({ active, payload, locale }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium dark:text-white">{d.name}</p>
      <p className="text-muted-foreground">PC1 {locale === 'sv' ? 'laddning' : 'loading'}: {d.l1.toFixed(3)}</p>
      <p className="text-muted-foreground">PC2 {locale === 'sv' ? 'laddning' : 'loading'}: {d.l2.toFixed(3)}</p>
      <p className="text-muted-foreground">{CATEGORY_LABELS[locale][d.category] ?? d.category}</p>
    </div>
  )
}

export function LoadingPlot({ loadings, variableIds, variableNames, explainedVariance, variableCategories }: LoadingPlotProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const data = variableIds.map((id, i) => {
    const category = variableCategories?.[id] ?? 'PHYSIOLOGICAL'
    return {
      name: variableNames[i],
      l1: loadings[i]?.[0] ?? 0,
      l2: loadings[i]?.[1] ?? 0,
      category,
      fill: CATEGORY_COLORS[category] ?? '#6b7280',
    }
  })

  // Determine which categories are present for the legend
  const presentCategories = new Set(data.map((d) => d.category))

  const pc1Pct = ((explainedVariance[0] ?? 0) * 100).toFixed(1)
  const pc2Pct = ((explainedVariance[1] ?? 0) * 100).toFixed(1)

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        {locale === 'sv' ? 'Laddningsplot' : 'Loading plot'} (Loading Plot)
      </h3>
      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
          <XAxis
            dataKey="l1"
            type="number"
            name="PC1"
            domain={[-1, 1]}
            label={{
              value: `PC1 (${pc1Pct}%)`,
              position: 'insideBottom',
              offset: -10,
            }}
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            dataKey="l2"
            type="number"
            name="PC2"
            domain={[-1, 1]}
            label={{
              value: `PC2 (${pc2Pct}%)`,
              angle: -90,
              position: 'insideLeft',
              offset: 0,
            }}
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip content={<CustomTooltip locale={locale} />} />
          <Scatter data={data}>
            <LabelList
              dataKey="name"
              position="top"
              offset={8}
              style={{ fontSize: 10, fill: 'currentColor' }}
            />
          </Scatter>
        </ScatterChart>
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
