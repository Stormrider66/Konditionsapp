'use client'

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ReferenceLine } from 'recharts'
import { TestStage } from '@/types'
import { useTranslations } from '@/i18n/client'
import {
  buildReliableLactateHeartRateFit,
  getLactateHeartRatePoints,
  type LactateHeartRateFitStatus,
  type LactateHeartRatePoint,
} from '@/lib/lactate/heart-rate-chart'

interface ThresholdValue {
  heartRate: number
  lactate: number
  method?: string
}

interface LactateHeartRateChartProps {
  stages: TestStage[]
  aerobicThreshold?: ThresholdValue
  anaerobicThreshold?: ThresholdValue
}

/**
 * Lactate vs Heart Rate Chart
 *
 * Shows:
 * - Actual test data points
 * - Fitted polynomial curve
 * - Baseline (first to last point)
 * - LT1 (aerobic threshold) marker
 * - LT2 (anaerobic threshold) marker
 */
export function LactateHeartRateChart({ stages, aerobicThreshold, anaerobicThreshold }: LactateHeartRateChartProps) {
  const t = useTranslations('components.lactateHeartRateChart')

  const dataPoints = getLactateHeartRatePoints(stages)

  if (dataPoints.length === 0) {
    return null
  }

  const fit = buildReliableLactateHeartRateFit(dataPoints)
  const hasReliableFit = fit.status === 'reliable'
  const minHR = Math.min(...dataPoints.map(p => p.heartRate))
  const maxHR = Math.max(...dataPoints.map(p => p.heartRate))

  // Calculate baseline (straight line from first to last point)
  const firstPoint = dataPoints[0]
  const lastPoint = dataPoints[dataPoints.length - 1]
  const hasBaseline = lastPoint.heartRate !== firstPoint.heartRate
  const baselineSlope = hasBaseline
    ? (lastPoint.lactate - firstPoint.lactate) / (lastPoint.heartRate - firstPoint.heartRate)
    : 0
  const baselineIntercept = firstPoint.lactate - baselineSlope * firstPoint.heartRate

  const domainPoints = hasReliableFit
    ? fit.curve
    : buildHeartRateDomainPoints(dataPoints)

  // Build chart data: polynomial curve + baseline (no measured points yet)
  const chartData = domainPoints.map((point) => {
    const baseLactate = baselineSlope * point.heartRate + baselineIntercept
    return {
      heartRate: point.heartRate,
      polynomial: hasReliableFit ? point.lactate : null,
      baseline: hasBaseline ? baseLactate : null,
      measuredLactate: null as number | null
    }
  })

  // Add each measured data point EXACTLY ONCE at its exact heart rate
  dataPoints.forEach(dp => {
    const baseLactate = baselineSlope * dp.heartRate + baselineIntercept
    chartData.push({
      heartRate: dp.heartRate,
      polynomial: null,
      baseline: hasBaseline ? baseLactate : null,
      measuredLactate: dp.lactate
    })
  })

  // Sort by heartRate
  chartData.sort((a, b) => a.heartRate - b.heartRate)

  // Prepare threshold points
  const lt1Point = aerobicThreshold ? {
    heartRate: aerobicThreshold.heartRate,
    lt1Lactate: aerobicThreshold.lactate
  } : null

  const lt2Point = anaerobicThreshold ? {
    heartRate: anaerobicThreshold.heartRate,
    lt2Lactate: anaerobicThreshold.lactate
  } : null

  // Calculate Y-domain
  const maxLactate = Math.max(
    ...dataPoints.map(p => p.lactate),
    ...(aerobicThreshold ? [aerobicThreshold.lactate] : []),
    ...(anaerobicThreshold ? [anaerobicThreshold.lactate] : []),
    ...(hasReliableFit ? fit.curve.map(point => point.lactate) : [])
  )
  const yDomain = [0, Math.max(1, Math.ceil(maxLactate * 1.1))]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{t('title')}</h4>
        <span className="text-sm text-gray-600">
          {fit.r2 !== null
            ? `R² = ${(fit.r2 * 100).toFixed(1)}%${hasReliableFit ? '' : ` - ${t('fit.curveHidden')}`}`
            : t('fit.notEnoughData')}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="heartRate"
            label={{ value: t('axes.pulse'), position: 'bottom', offset: 0 }}
            type="number"
            domain={[Math.floor(minHR * 0.95), Math.ceil(maxHR * 1.02)]}
            tick={{ dy: 5 }}
          />
          <YAxis
            label={{ value: t('axes.lactate'), angle: -90, position: 'insideLeft' }}
            domain={yDomain}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (value === null) return ['-', name]
              return [`${value.toFixed(2)} mmol/L`, name]
            }}
            labelFormatter={(label) => t('tooltip.label', { heartRate: label })}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: '20px' }}
          />

          {/* Baseline */}
          {hasBaseline && (
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="5 5"
              name={t('series.baseline')}
              dot={false}
              isAnimationActive={false}
            />
          )}

          {/* Polynomial curve */}
          {hasReliableFit && (
            <Line
              type="monotone"
              dataKey="polynomial"
              stroke="#3b82f6"
              strokeWidth={2}
              name={t('series.polynomial')}
              dot={false}
              isAnimationActive={false}
            />
          )}

          {/* Actual test data points */}
          <Line
            type="monotone"
            dataKey="measuredLactate"
            stroke="transparent"
            strokeWidth={0}
            name={t('series.measured')}
            dot={{ fill: '#ef4444', r: 6, stroke: '#ef4444', strokeWidth: 2 }}
            activeDot={{ r: 8 }}
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* LT1 (Aerobic Threshold) marker - green */}
          {lt1Point && (
            <>
              <Scatter
                data={[lt1Point]}
                dataKey="lt1Lactate"
                name={t('series.lt1')}
                fill="#22c55e"
                shape="circle"
                line={false}
              />
              <ReferenceLine
                x={lt1Point.heartRate}
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `LT1: ${lt1Point.heartRate}`,
                  position: 'top',
                  fill: '#22c55e',
                  fontSize: 11
                }}
              />
            </>
          )}

          {/* LT2 (Anaerobic Threshold) marker - orange */}
          {lt2Point && (
            <>
              <Scatter
                data={[lt2Point]}
                dataKey="lt2Lactate"
                name={t('series.lt2')}
                fill="#f59e0b"
                shape="star"
                line={false}
                legendType="star"
              />
              <ReferenceLine
                x={lt2Point.heartRate}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `LT2: ${lt2Point.heartRate}`,
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 11
                }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {!hasReliableFit && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {getFitWarningText(fit.status, t)}
        </div>
      )}

      {/* Explanation */}
      <div className="text-xs text-gray-600 space-y-1">
        {hasReliableFit && (
          <p>
            <strong>{t('explanations.polynomialTitle')}:</strong> {t('explanations.polynomialBody')}
          </p>
        )}
        <p>
          <strong>{t('explanations.baselineTitle')}:</strong> {t('explanations.baselineBody')}
        </p>
        {lt1Point && (
          <p>
            <strong className="text-green-600">{t('explanations.lt1Title')}:</strong>{' '}
            {t('explanations.lt1Body', { hr: lt1Point.heartRate, value: lt1Point.lt1Lactate.toFixed(2) })}
          </p>
        )}
        {lt2Point && (
          <p>
            <strong className="text-orange-500">{t('explanations.lt2Title')}:</strong>{' '}
            {t('explanations.lt2Body', { hr: lt2Point.heartRate, value: lt2Point.lt2Lactate.toFixed(2) })}
          </p>
        )}
        <p>
          <strong>{t('explanations.measuredTitle')}:</strong> {t('explanations.measuredBody')}
        </p>
      </div>
    </div>
  )
}

function buildHeartRateDomainPoints(dataPoints: LactateHeartRatePoint[]): LactateHeartRatePoint[] {
  if (dataPoints.length < 2) {
    return dataPoints
  }

  const minHeartRate = Math.min(...dataPoints.map(point => point.heartRate))
  const maxHeartRate = Math.max(...dataPoints.map(point => point.heartRate))
  const range = maxHeartRate - minHeartRate

  if (range <= 0) {
    return dataPoints
  }

  return Array.from({ length: 101 }, (_, index) => ({
    heartRate: Number((minHeartRate + (range * index) / 100).toFixed(1)),
    lactate: 0,
  }))
}

function getFitWarningText(status: LactateHeartRateFitStatus, t: (key: string) => string): string {
  if (status === 'not_enough_unique_heart_rates') {
    return t('warnings.notEnoughFitPoints')
  }

  if (status === 'fit_failed') {
    return t('warnings.fitFailed')
  }

  return t('warnings.unreliableFit')
}
