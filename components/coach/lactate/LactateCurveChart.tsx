'use client'

// components/coach/lactate/LactateCurveChart.tsx
// Interactive lactate curve chart with manual threshold selection

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ScatterChart, ReferenceLine, ComposedChart } from 'recharts'
import { Info, CheckCircle2, AlertCircle } from 'lucide-react'

interface TestStage {
  sequence: number
  speed: number
  heartRate: number
  lactate: number
}

interface LactateCurveChartProps {
  testId: string
  testStages: TestStage[]
  maxHR?: number
  initialLT1Stage?: number
  initialLT2Stage?: number
  onThresholdsSelected?: (lt1Stage: number, lt2Stage: number) => void
}

export function LactateCurveChart({
  testId,
  testStages,
  maxHR,
  initialLT1Stage,
  initialLT2Stage,
  onThresholdsSelected,
}: LactateCurveChartProps) {
  const [selectedLT1Stage, setSelectedLT1Stage] = useState<number | null>(initialLT1Stage || null)
  const [selectedLT2Stage, setSelectedLT2Stage] = useState<number | null>(initialLT2Stage || null)
  const [hoveredStage, setHoveredStage] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Calculate max lactate and suggested thresholds
  const maxLactate = Math.max(...testStages.map(s => s.lactate))
  const maxSpeed = Math.max(...testStages.map(s => s.speed))

  // Auto-suggest LT1 and LT2 based on individual ratio method
  const suggestThresholds = useCallback(() => {
    // LT1: First crossing of 2 mmol/L or 20% of max
    const lt1Threshold = Math.max(2.0, maxLactate * 0.20)
    const lt1Stage = testStages.find(s => s.lactate >= lt1Threshold)

    // LT2: Individual ratio (estimate based on max lactate)
    let lt2Ratio = 0.44 // Default
    if (maxLactate < 10) lt2Ratio = 0.45 // Elite marathoner
    else if (maxLactate > 18) lt2Ratio = 0.22 // Elite 800m
    else if (maxLactate >= 15 && maxLactate <= 20) lt2Ratio = 0.50 // Fast twitch marathoner

    const lt2Threshold = maxLactate * lt2Ratio
    const lt2Stage = testStages.find(s => s.lactate >= lt2Threshold)

    return {
      lt1: lt1Stage?.sequence || testStages[Math.floor(testStages.length / 3)]?.sequence || 2,
      lt2: lt2Stage?.sequence || testStages[Math.floor(testStages.length * 2 / 3)]?.sequence || 4,
    }
  }, [maxLactate, testStages])

  // Set initial suggestions if no selection
  useEffect(() => {
    if (selectedLT1Stage === null && selectedLT2Stage === null) {
      const suggestions = suggestThresholds()
      setSelectedLT1Stage(suggestions.lt1)
      setSelectedLT2Stage(suggestions.lt2)
    }
  }, [testStages, selectedLT1Stage, selectedLT2Stage, suggestThresholds])

  // Get stage data
  const getLT1Data = () => {
    if (!selectedLT1Stage) return null
    return testStages.find(s => s.sequence === selectedLT1Stage)
  }

  const getLT2Data = () => {
    if (!selectedLT2Stage) return null
    return testStages.find(s => s.sequence === selectedLT2Stage)
  }

  const lt1Data = getLT1Data()
  const lt2Data = getLT2Data()

  // Prepare chart data
  const chartData = testStages.map((stage, idx) => ({
    ...stage,
    name: `Stage ${stage.sequence}`,
    isLT1: stage.sequence === selectedLT1Stage,
    isLT2: stage.sequence === selectedLT2Stage,
  }))

  // Handle save
  const handleSave = async () => {
    if (!selectedLT1Stage || !selectedLT2Stage) {
      setSaveStatus('error')
      return
    }

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      // Call the callback to recalculate zones with manual thresholds
      if (onThresholdsSelected) {
        onThresholdsSelected(selectedLT1Stage, selectedLT2Stage)
      }

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate lactate ratio for display
  const lt2Ratio = lt2Data ? (lt2Data.lactate / maxLactate) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Manual Threshold Selection:</strong> Select LT1 (Aerobic Threshold) and LT2 (Anaerobic Threshold) from the dropdowns below.
          The system uses individual lactate ratios (% of max) instead of fixed 2/4 mmol/L values.
        </AlertDescription>
      </Alert>

      {/* Lactate Curve Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Lactate Curve Analysis</CardTitle>
          <CardDescription>
            Max Lactate: <strong>{maxLactate.toFixed(1)} mmol/L</strong>
            {lt2Data && (
              <span className="ml-4">
                LT2 Ratio: <strong>{lt2Ratio.toFixed(0)}%</strong> of max
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="speed"
                label={{ value: 'Speed (km/h)', position: 'insideBottom', offset: -10 }}
                domain={[0, Math.ceil(maxSpeed * 1.1)]}
              />
              <YAxis
                label={{ value: 'Lactate (mmol/L)', angle: -90, position: 'insideLeft' }}
                domain={[0, Math.ceil(maxLactate * 1.1)]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 rounded shadow-lg">
                        <p className="font-semibold">Stage {data.sequence}</p>
                        <p className="text-sm">Speed: {data.speed.toFixed(1)} km/h</p>
                        <p className="text-sm">Lactate: {data.lactate.toFixed(1)} mmol/L</p>
                        <p className="text-sm">HR: {data.heartRate} bpm</p>
                        {maxHR && (
                          <p className="text-sm">% Max HR: {((data.heartRate / maxHR) * 100).toFixed(0)}%</p>
                        )}
                        {data.isLT1 && <Badge className="mt-1">LT1 (Aerobic)</Badge>}
                        {data.isLT2 && <Badge className="mt-1">LT2 (Anaerobic)</Badge>}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />

              {/* Lactate curve line */}
              <Line
                type="monotone"
                dataKey="lactate"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 6, fill: '#ef4444' }}
                activeDot={{ r: 8 }}
                name="Lactate"
              />

              {/* LT1 reference line */}
              {lt1Data && (
                <ReferenceLine
                  x={lt1Data.speed}
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: 'LT1', position: 'top', fill: '#22c55e', fontWeight: 'bold' }}
                />
              )}

              {/* LT2 reference line */}
              {lt2Data && (
                <ReferenceLine
                  x={lt2Data.speed}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: 'LT2', position: 'top', fill: '#f59e0b', fontWeight: 'bold' }}
                />
              )}

              {/* Highlighted points */}
              <Scatter
                dataKey="lactate"
                fill={(entry: any) => {
                  if (entry.isLT1) return '#22c55e'
                  if (entry.isLT2) return '#f59e0b'
                  return '#ef4444'
                }}
                shape="circle"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Threshold Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Thresholds</CardTitle>
          <CardDescription>Choose the test stages corresponding to LT1 and LT2</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* LT1 Selection */}
            <div className="space-y-3">
              <Label htmlFor="lt1-select">LT1 (Aerobic Threshold)</Label>
              <Select
                value={selectedLT1Stage?.toString()}
                onValueChange={(value) => setSelectedLT1Stage(parseInt(value))}
              >
                <SelectTrigger id="lt1-select">
                  <SelectValue placeholder="Select LT1 stage" />
                </SelectTrigger>
                <SelectContent>
                  {testStages.map((stage) => (
                    <SelectItem key={stage.sequence} value={stage.sequence.toString()}>
                      Stage {stage.sequence}: {stage.speed.toFixed(1)} km/h, {stage.lactate.toFixed(1)} mmol/L
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {lt1Data && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">LT1 Values:</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><strong>Speed:</strong> {lt1Data.speed.toFixed(1)} km/h</p>
                    <p><strong>Pace:</strong> {(60 / lt1Data.speed).toFixed(2)} min/km</p>
                    <p><strong>Lactate:</strong> {lt1Data.lactate.toFixed(1)} mmol/L</p>
                    <p><strong>Heart Rate:</strong> {lt1Data.heartRate} bpm</p>
                    {maxHR && (
                      <p><strong>% Max HR:</strong> {((lt1Data.heartRate / maxHR) * 100).toFixed(0)}%</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* LT2 Selection */}
            <div className="space-y-3">
              <Label htmlFor="lt2-select">LT2 (Anaerobic Threshold)</Label>
              <Select
                value={selectedLT2Stage?.toString()}
                onValueChange={(value) => setSelectedLT2Stage(parseInt(value))}
              >
                <SelectTrigger id="lt2-select">
                  <SelectValue placeholder="Select LT2 stage" />
                </SelectTrigger>
                <SelectContent>
                  {testStages.map((stage) => (
                    <SelectItem key={stage.sequence} value={stage.sequence.toString()}>
                      Stage {stage.sequence}: {stage.speed.toFixed(1)} km/h, {stage.lactate.toFixed(1)} mmol/L
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {lt2Data && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">LT2 Values:</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><strong>Speed:</strong> {lt2Data.speed.toFixed(1)} km/h</p>
                    <p><strong>Pace:</strong> {(60 / lt2Data.speed).toFixed(2)} min/km</p>
                    <p><strong>Lactate:</strong> {lt2Data.lactate.toFixed(1)} mmol/L</p>
                    <p><strong>Heart Rate:</strong> {lt2Data.heartRate} bpm</p>
                    {maxHR && (
                      <p><strong>% Max HR:</strong> {((lt2Data.heartRate / maxHR) * 100).toFixed(0)}%</p>
                    )}
                    <p><strong>LT2 Ratio:</strong> {lt2Ratio.toFixed(0)}% of max lactate</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metabolic Type Indicator */}
          {lt2Data && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Metabolic Profile:</strong>{' '}
                {maxLactate < 10 && (
                  <span>
                    Low max lactate ({maxLactate.toFixed(1)} mmol/L) suggests <strong>SLOW TWITCH</strong> (diesel engine, like Paula Radcliffe)
                  </span>
                )}
                {maxLactate >= 10 && maxLactate < 15 && (
                  <span>
                    Medium max lactate ({maxLactate.toFixed(1)} mmol/L) suggests <strong>MIXED</strong> fiber type
                  </span>
                )}
                {maxLactate >= 15 && maxLactate <= 20 && lt2Ratio >= 45 && (
                  <span>
                    High max lactate ({maxLactate.toFixed(1)} mmol/L) with {lt2Ratio.toFixed(0)}% ratio suggests <strong>FAST TWITCH ENDURANCE</strong> (explosive marathoner)
                  </span>
                )}
                {maxLactate > 18 && lt2Ratio < 30 && (
                  <span>
                    Very high max lactate ({maxLactate.toFixed(1)} mmol/L) with {lt2Ratio.toFixed(0)}% ratio suggests <strong>FAST TWITCH POWER</strong> (800m specialist)
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warning */}
          {selectedLT1Stage && selectedLT2Stage && selectedLT1Stage >= selectedLT2Stage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Invalid Selection:</strong> LT1 must be at a lower stage than LT2. Please adjust your selections.
              </AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            {saveStatus === 'success' && (
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                <span className="text-sm">Thresholds saved successfully</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">Error saving thresholds</span>
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={
                isSaving ||
                !selectedLT1Stage ||
                !selectedLT2Stage ||
                selectedLT1Stage >= selectedLT2Stage
              }
            >
              {isSaving ? 'Applying...' : 'Apply Manual Thresholds'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison with Fixed Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Why Individual Ratios Matter</CardTitle>
          <CardDescription>Comparison with traditional fixed threshold approach</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-semibold text-red-900 dark:text-red-100 mb-2">❌ Fixed Threshold (Old Method)</p>
                <p className="text-sm mb-2">LT1 = 2.0 mmol/L (fixed)</p>
                <p className="text-sm mb-2">LT2 = 4.0 mmol/L (fixed)</p>
                <p className="text-xs text-muted-foreground">
                  Problem: Doesn&apos;t account for individual variation. Paula Radcliffe&apos;s max was ~5 mmol/L, so 4.0 would be her max, not LT2!
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-semibold text-green-900 dark:text-green-100 mb-2">✅ Individual Ratio (New Method)</p>
                {lt1Data && <p className="text-sm mb-2">LT1 = {lt1Data.lactate.toFixed(1)} mmol/L ({((lt1Data.lactate / maxLactate) * 100).toFixed(0)}% of max)</p>}
                {lt2Data && <p className="text-sm mb-2">LT2 = {lt2Data.lactate.toFixed(1)} mmol/L ({lt2Ratio.toFixed(0)}% of max)</p>}
                <p className="text-xs text-muted-foreground">
                  Solution: Uses % of individual max lactate. Works for all athletes regardless of fiber type or max lactate capacity.
                </p>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Scientific Basis:</strong> Research shows elite athletes have vastly different max lactate values:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Paula Radcliffe (2:15 marathon): Max ~5 mmol/L, LT2 ~2 mmol/L</li>
                  <li>Kenyan elites (similar times): Max ~12 mmol/L, LT2 ~6-8 mmol/L</li>
                  <li>Your athlete (1:28 HM): Max {maxLactate.toFixed(1)} mmol/L, LT2 {lt2Data?.lactate.toFixed(1) || 'N/A'} mmol/L</li>
                </ul>
                <p className="mt-2 text-sm">
                  Using fixed 2/4 mmol/L values would give completely wrong training zones for these athletes!
                </p>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
