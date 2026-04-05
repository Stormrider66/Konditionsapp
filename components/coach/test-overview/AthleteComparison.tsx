'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AthleteSummary {
  id: string
  name: string
  teamName: string | null
  latestVo2max: number | null
  latestMaxHR: number | null
  latestMaxLactate: number | null
}

interface AthleteComparisonProps {
  athletes: AthleteSummary[]
}

export function AthleteComparison({ athletes }: AthleteComparisonProps) {
  if (athletes.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Välj minst 2 atleter för jämförelse
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
    .map((a) => ({ name: a.name.split(' ')[0], 'Max Laktat': a.latestMaxLactate }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {vo2Data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">VO2max (ml/kg/min)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vo2Data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Bar dataKey="VO2max" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {hrData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Max HR (bpm)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hrData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Bar dataKey="Max HR" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {lactateData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Max Laktat (mmol/L)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={lactateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Max Laktat" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detaljerad jämförelse</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Atlet</th>
                <th className="text-left py-2 pr-4 font-medium">Lag</th>
                <th className="text-right py-2 pr-4 font-medium">VO2max</th>
                <th className="text-right py-2 pr-4 font-medium">Max HR</th>
                <th className="text-right py-2 font-medium">Max Laktat</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{a.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{a.teamName || '-'}</td>
                  <td className="py-2 pr-4 text-right font-mono">{a.latestVo2max?.toFixed(1) || '-'}</td>
                  <td className="py-2 pr-4 text-right font-mono">{a.latestMaxHR || '-'}</td>
                  <td className="py-2 text-right font-mono">{a.latestMaxLactate?.toFixed(1) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
