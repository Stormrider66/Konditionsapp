'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
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
import type { Test, TestType } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface ProgressionChartProps {
  tests: Test[]
}

type TimePeriod = 'all' | '6months' | '1year'

export function ProgressionChart({ tests }: ProgressionChartProps) {
  const [selectedTestType, setSelectedTestType] = useState<TestType | 'ALL'>('ALL')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')

  // Filter and prepare data
  const chartData = useMemo(() => {
    // Filter by test type
    let filteredTests = tests.filter((test) => test.status === 'COMPLETED')

    if (selectedTestType !== 'ALL') {
      filteredTests = filteredTests.filter((test) => test.testType === selectedTestType)
    }

    // Filter by time period
    const now = new Date()
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6))
    const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1))

    if (timePeriod === '6months') {
      filteredTests = filteredTests.filter((test) => new Date(test.testDate) >= sixMonthsAgo)
    } else if (timePeriod === '1year') {
      filteredTests = filteredTests.filter((test) => new Date(test.testDate) >= oneYearAgo)
    }

    // Sort by date
    filteredTests.sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime())

    // Map to chart data
    return filteredTests.map((test) => {
      const aerobicThreshold = test.aerobicThreshold as any
      const anaerobicThreshold = test.anaerobicThreshold as any

      return {
        date: format(new Date(test.testDate), 'dd MMM yyyy', { locale: sv }),
        fullDate: new Date(test.testDate),
        vo2max: test.vo2max || null,
        aerobicHR: aerobicThreshold?.heartRate || null,
        anaerobicHR: anaerobicThreshold?.heartRate || null,
        testType: test.testType,
      }
    })
  }, [tests, selectedTestType, timePeriod])

  // Don't show chart if less than 2 tests
  if (chartData.length < 2) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Progression över tid</CardTitle>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* Test Type Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Testtyp</Label>
              <Tabs
                value={selectedTestType}
                onValueChange={(value) => setSelectedTestType(value as TestType | 'ALL')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ALL">Alla</TabsTrigger>
                  <TabsTrigger value="RUNNING">Löpning</TabsTrigger>
                  <TabsTrigger value="CYCLING">Cykling</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Time Period Filter */}
            <div className="space-y-2">
              <Label htmlFor="time-period" className="text-xs text-gray-500">
                Tidsperiod
              </Label>
              <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                <SelectTrigger id="time-period" className="w-full sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla tider</SelectItem>
                  <SelectItem value="6months">Senaste 6 mån</SelectItem>
                  <SelectItem value="1year">Senaste året</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length < 2 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Minst 2 tester krävs för att visa progression</p>
            <p className="text-sm mt-2">
              {selectedTestType !== 'ALL' && 'Prova att ändra testtyp eller tidsperiod'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* VO2max Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">VO2max (ml/kg/min)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    verticalAlign="bottom"
                    height={30}
                  />
                  <Line
                    type="monotone"
                    dataKey="vo2max"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6 }}
                    name="VO2max"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Heart Rate Thresholds Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Trösklar (Puls - bpm)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    domain={['dataMin - 10', 'dataMax + 10']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    verticalAlign="bottom"
                    height={30}
                  />
                  <Line
                    type="monotone"
                    dataKey="aerobicHR"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                    name="Aerob tröskel"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="anaerobicHR"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#f59e0b' }}
                    activeDot={{ r: 6 }}
                    name="Anaerob tröskel"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
