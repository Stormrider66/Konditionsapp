'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TestStage, TestType } from '@/types'
import { useTranslations } from '@/i18n/client'

interface SubstrateUtilizationChartProps {
  stages: TestStage[]
  testType: TestType
}

export function SubstrateUtilizationChart({ stages, testType }: SubstrateUtilizationChartProps) {
  const t = useTranslations('components.substrateUtilizationChart')

  const chartData = stages
    .filter(s => s.fatPercent != null && s.choPercent != null)
    .map(stage => {
      const intensity = stage.speed ?? stage.power ?? stage.pace ?? 0
      return {
        intensity,
        fat: stage.fatPercent ?? 0,
        cho: stage.choPercent ?? 0,
      }
    })

  // Find crossover point (where CHO% > FAT%)
  let crossoverIntensity: number | null = null
  for (let i = 1; i < chartData.length; i++) {
    const prev = chartData[i - 1]
    const curr = chartData[i]
    if (prev.fat >= prev.cho && curr.cho > curr.fat) {
      // Linear interpolation to find exact crossover
      const fatDiff = prev.fat - curr.fat
      const choDiff = curr.cho - prev.cho
      const totalDiff = fatDiff + choDiff
      if (totalDiff > 0) {
        const ratio = (prev.fat - prev.cho) / totalDiff
        crossoverIntensity = prev.intensity + ratio * (curr.intensity - prev.intensity)
      } else {
        crossoverIntensity = curr.intensity
      }
      break
    }
  }

  const intensityLabel =
    testType === 'RUNNING'
      ? t('axes.intensity.running')
      : testType === 'CYCLING'
      ? t('axes.intensity.cycling')
      : t('axes.intensity.default')

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="intensity"
          label={{ value: intensityLabel, position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          domain={[0, 100]}
          label={{ value: '%', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value.toFixed(1)}%`,
            name === 'fat' ? t('series.fat') : t('series.cho')
          ]}
          labelFormatter={(label) =>
            `${label} ${
              testType === 'RUNNING'
                ? t('axes.unit.running')
                : testType === 'CYCLING'
                  ? t('axes.unit.cycling')
                  : t('axes.unit.default')
            }`
          }
        />
        <Legend
          formatter={(value) => (value === 'fat' ? t('series.fat') : t('series.cho'))}
        />
        <Area
          type="monotone"
          dataKey="fat"
          stackId="1"
          stroke="#f59e0b"
          fill="#fef3c7"
          fillOpacity={0.8}
        />
        <Area
          type="monotone"
          dataKey="cho"
          stackId="1"
          stroke="#3b82f6"
          fill="#dbeafe"
          fillOpacity={0.8}
        />
        {crossoverIntensity && (
          <ReferenceLine
            x={crossoverIntensity}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `${t('crossover.label')} ${crossoverIntensity.toFixed(1)}`,
              position: 'top',
              fill: '#ef4444',
              fontSize: 12,
            }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
