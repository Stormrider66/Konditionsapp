'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts'
import { TestStage, PowerZone } from '@/types'

interface PowerChartProps {
  data: TestStage[]
  ftp?: number
  powerZones?: PowerZone[]
  showLegend?: boolean
  height?: number
}

export function PowerChart({
  data,
  ftp,
  powerZones,
  showLegend = true,
  height = 400
}: PowerChartProps) {
  const chartData = data.map((stage) => ({
    power: stage.power || 0,
    cadence: stage.cadence || 0,
    heartRate: stage.heartRate,
    lactate: stage.lactate,
    wattsPerKg: stage.wattsPerKg || 0,
  }))

  // Färger för power zones (från blå/grön till röd)
  const zoneColors = [
    '#a0d8f1', // Zon 1 - ljusblå
    '#90c9e8', // Zon 2 - blå
    '#6eb5d9', // Zon 3 - mellanbå
    '#f9d71c', // Zon 4 - gul (FTP)
    '#ff8c42', // Zon 5 - orange
    '#ff6b6b', // Zon 6 - röd
    '#e63946', // Zon 7 - mörkröd
  ]

  return (
    <div className="space-y-4">
      {/* Power och Cadence Chart */}
      <div className="w-full bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Effekt och Kadens</h3>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="power"
              label={{
                value: 'Effekt (watt)',
                position: 'insideBottom',
                offset: -15,
                style: { fontSize: '14px', fontWeight: 500 },
              }}
              stroke="#666"
            />
            <YAxis
              yAxisId="left"
              label={{
                value: 'Kadens (rpm)',
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
                value: 'Puls (slag/min)',
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
              name="Kadens (rpm)"
              strokeWidth={2}
              dot={{ fill: '#667eea', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="heartRate"
              stroke="#4caf50"
              name="Puls"
              strokeWidth={2}
              dot={{ fill: '#4caf50', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Laktat Chart */}
      <div className="w-full bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Effekt och Laktat</h3>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="power"
              label={{
                value: 'Effekt (watt)',
                position: 'insideBottom',
                offset: -15,
                style: { fontSize: '14px', fontWeight: 500 },
              }}
              stroke="#666"
            />
            <YAxis
              yAxisId="left"
              label={{
                value: 'Laktat (mmol/L)',
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
              name="Laktat"
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
