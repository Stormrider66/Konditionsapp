'use client'

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from 'recharts'
import { TestStage, PowerZone } from '@/types'
import { useLocale } from '@/i18n/client'

interface PowerChartProps {
  data: TestStage[]
  ftp?: number
  powerZones?: PowerZone[]
  showLegend?: boolean
  height?: number
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  titles: {
    powerCadence: string
    powerLactate: string
  }
  labels: {
    power: string
    cadence: string
    heartRateAxis: string
    heartRate: string
    lactate: string
  }
}> = {
  en: {
    titles: {
      powerCadence: 'Power and Cadence',
      powerLactate: 'Power and Lactate',
    },
    labels: {
      power: 'Power (watts)',
      cadence: 'Cadence (rpm)',
      heartRateAxis: 'Heart rate (bpm)',
      heartRate: 'Heart rate',
      lactate: 'Lactate',
    },
  },
  sv: {
    titles: {
      powerCadence: 'Effekt och Kadens',
      powerLactate: 'Effekt och Laktat',
    },
    labels: {
      power: 'Effekt (watt)',
      cadence: 'Kadens (rpm)',
      heartRateAxis: 'Puls (slag/min)',
      heartRate: 'Puls',
      lactate: 'Laktat',
    },
  },
}

export function PowerChart({
  data,
  ftp,
  powerZones: _powerZones,
  showLegend = true,
  height = 400
}: PowerChartProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const chartData = data.map((stage) => ({
    power: stage.power || 0,
    cadence: stage.cadence || 0,
    heartRate: stage.heartRate,
    lactate: stage.lactate,
    wattsPerKg: stage.wattsPerKg || 0,
  }))

  return (
    <div className="space-y-4">
      {/* Power and cadence chart */}
      <div className="w-full bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">{copy.titles.powerCadence}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="power"
              label={{
                value: copy.labels.power,
                position: 'insideBottom',
                offset: -15,
                style: { fontSize: '14px', fontWeight: 500 },
              }}
              stroke="#666"
            />
            <YAxis
              yAxisId="left"
              label={{
                value: copy.labels.cadence,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: '14px', fontWeight: 500 },
              }}
              stroke="#667eea"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{
                value: copy.labels.heartRateAxis,
                angle: 90,
                position: 'insideRight',
                style: { fontSize: '14px', fontWeight: 500 },
              }}
              stroke="#4caf50"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '10px',
              }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                verticalAlign="bottom"
                height={30}
              />
            )}

            {/* FTP reference line */}
            {ftp && (
              <ReferenceLine
                x={ftp}
                yAxisId="left"
                stroke="#f9d71c"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `FTP: ${ftp}W`,
                  position: 'top',
                  fill: '#f9d71c',
                  fontWeight: 'bold',
                }}
              />
            )}

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="cadence"
              stroke="#667eea"
              name={copy.labels.cadence}
              strokeWidth={2}
              dot={{ fill: '#667eea', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="heartRate"
              stroke="#4caf50"
              name={copy.labels.heartRate}
              strokeWidth={2}
              dot={{ fill: '#4caf50', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Lactate chart */}
      <div className="w-full bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">{copy.titles.powerLactate}</h3>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="power"
              label={{
                value: copy.labels.power,
                position: 'insideBottom',
                offset: -15,
                style: { fontSize: '14px', fontWeight: 500 },
              }}
              stroke="#666"
            />
            <YAxis
              yAxisId="left"
              label={{
                value: `${copy.labels.lactate} (mmol/L)`,
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: '14px', fontWeight: 500 },
              }}
              stroke="#ff6b6b"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{
                value: 'W/kg',
                angle: 90,
                position: 'insideRight',
                style: { fontSize: '14px', fontWeight: 500 },
              }}
              stroke="#9c27b0"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '10px',
              }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                verticalAlign="bottom"
                height={30}
              />
            )}

            {/* FTP reference line */}
            {ftp && (
              <ReferenceLine
                x={ftp}
                yAxisId="left"
                stroke="#f9d71c"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `FTP: ${ftp}W`,
                  position: 'top',
                  fill: '#f9d71c',
                  fontWeight: 'bold',
                }}
              />
            )}

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="lactate"
              stroke="#ff6b6b"
              name={copy.labels.lactate}
              strokeWidth={2}
              dot={{ fill: '#ff6b6b', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="wattsPerKg"
              stroke="#9c27b0"
              name="W/kg"
              strokeWidth={2}
              dot={{ fill: '#9c27b0', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
