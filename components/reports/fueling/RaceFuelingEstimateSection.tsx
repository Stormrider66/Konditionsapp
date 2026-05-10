'use client'

import { useMemo, useState } from 'react'
import type { Test, TestStage, TestType } from '@/types'
import { estimateRaceFueling } from '@/lib/fueling/race-fueling'
import { buildRaceDayFuelingPlan } from '@/lib/fueling/race-day-plan'
import type { RaceFuelingEstimate } from '@/lib/fueling/types'

interface RaceFuelingEstimateSectionProps {
  clientId: string
  test: Test
  weightKg?: number | null
}

const DISTANCE_OPTIONS: Record<TestType, Array<{ label: string; distanceKm?: number; durationMinutes?: number }>> = {
  RUNNING: [
    { label: '10 km', distanceKm: 10 },
    { label: 'Halvmarathon', distanceKm: 21.0975 },
    { label: 'Marathon', distanceKm: 42.195 },
  ],
  CYCLING: [
    { label: '2 timmar', durationMinutes: 120 },
    { label: '3 timmar', durationMinutes: 180 },
    { label: '5 timmar', durationMinutes: 300 },
  ],
  SKIING: [
    { label: '20 km', distanceKm: 20 },
    { label: '45 km', distanceKm: 45 },
    { label: '90 km', distanceKm: 90 },
  ],
}

export function RaceFuelingEstimateSection({ clientId, test, weightKg }: RaceFuelingEstimateSectionProps) {
  const usableStages = useMemo(() => getUsableStages(test), [test])
  const options = DISTANCE_OPTIONS[test.testType] ?? DISTANCE_OPTIONS.RUNNING
  const [selectedDistanceIndex, setSelectedDistanceIndex] = useState(options.length - 1)
  const [selectedStageSequence, setSelectedStageSequence] = useState<number | null>(usableStages[0]?.sequence ?? null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const estimate = useMemo<RaceFuelingEstimate | null>(() => {
    const selectedStage = usableStages.find((stage) => stage.sequence === selectedStageSequence) ?? usableStages[0]
    const selectedDistance = options[selectedDistanceIndex] ?? options[0]
    if (!selectedStage || !selectedDistance) return null

    return estimateRaceFueling(
      {
        sport: test.testType,
        distanceKm: selectedDistance.distanceKm,
        durationMinutes: selectedDistance.durationMinutes,
        targetSpeedKmh: selectedStage.speed,
        targetPowerWatts: selectedStage.power,
        targetPaceMinPerKm: selectedStage.pace,
      },
      test.testStages,
      { weightKg }
    )
  }, [options, selectedDistanceIndex, selectedStageSequence, test.testStages, test.testType, usableStages, weightKg])

  if (!estimate || usableStages.length === 0) return null

  const selectedDistance = options[selectedDistanceIndex] ?? options[0]
  const selectedStage = usableStages.find((stage) => stage.sequence === selectedStageSequence) ?? usableStages[0]
  const raceDayPlan = buildRaceDayFuelingPlan(estimate.recommendedCarbsPerHour, estimate.estimatedDurationMinutes)

  async function savePlan() {
    if (!selectedStage || !selectedDistance) return
    setSaveStatus('saving')
    const response = await fetch('/api/fueling/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        testId: test.id,
        sport: test.testType,
        name: `Tävlingsenergi ${selectedDistance.label}`,
        distanceKm: selectedDistance.distanceKm,
        durationMinutes: selectedDistance.durationMinutes,
        targetSpeedKmh: selectedStage.speed,
        targetPowerWatts: selectedStage.power,
        targetPaceMinKm: selectedStage.pace,
      }),
    })

    setSaveStatus(response.ok ? 'saved' : 'error')
  }

  return (
    <section className="mt-6 border-b pb-6 print:break-inside-avoid" data-pdf-section>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Tävlingsenergi</h2>
          <p className="text-sm text-gray-600 mt-1">
            En uppskattning av kolhydratbehov vid tävlingslik intensitet baserat på metabol testdata.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            Säkerhet: {confidenceLabel(estimate.confidence)}
          </span>
          <button
            type="button"
            onClick={() => void savePlan()}
            disabled={saveStatus === 'saving'}
            className="print:hidden text-xs px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {saveStatus === 'saving' ? 'Sparar...' : saveStatus === 'saved' ? 'Sparad' : 'Skapa tävlingsplan'}
          </button>
          {saveStatus === 'error' && (
            <span className="print:hidden text-xs text-red-600">Kunde inte spara planen.</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print:hidden">
        <label className="text-sm font-medium text-gray-700">
          Distans / tid
          <select
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={selectedDistanceIndex}
            onChange={(event) => setSelectedDistanceIndex(Number(event.target.value))}
          >
            {options.map((option, index) => (
              <option key={option.label} value={index}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-700">
          Planerad tävlingsintensitet
          <select
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={selectedStageSequence ?? ''}
            onChange={(event) => setSelectedStageSequence(Number(event.target.value))}
          >
            {usableStages.map((stage) => (
              <option key={stage.sequence} value={stage.sequence}>
                {formatStageIntensity(stage, test.testType)}
                {stage.lactate != null ? `, laktat ${stage.lactate}` : ''}
                {stage.rer != null ? `, RER ${stage.rer.toFixed(2)}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Metric label="Beräknad tid" value={formatDuration(estimate.estimatedDurationMinutes)} />
        <Metric label="KH-förbrukning" value={estimate.carbohydrateDemandPerHour ? `${estimate.carbohydrateDemandPerHour} g/h` : 'Saknas'} />
        <Metric label="Rekommenderat intag" value={estimate.recommendedCarbsPerHour ? `${estimate.recommendedCarbsPerHour} g/h` : 'Saknas'} />
        <Metric label="Totalt intag" value={estimate.scenarios[1]?.totalCarbs ? `${estimate.scenarios[1].totalCarbs} g` : 'Saknas'} />
      </div>

      {raceDayPlan && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
          <p className="font-medium mb-2">Praktisk raceplan</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Metric label="Intagsrytm" value={`${raceDayPlan.intakeEvery20Min} g var 20:e min`} />
            <Metric label="Gel-ekvivalent" value={raceDayPlan.gelEquivalentCount ? `${raceDayPlan.gelEquivalentCount} st à 25 g` : 'Saknas'} />
            <Metric label="Sportdryck" value={raceDayPlan.bottleMixCount ? `${raceDayPlan.bottleMixCount} flaskor à 40 g` : 'Saknas'} />
          </div>
          {raceDayPlan.notesSv.length > 0 && (
            <ul className="list-disc pl-5 mt-3 space-y-1">
              {raceDayPlan.notesSv.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Scenario</th>
              <th className="px-3 py-2 text-left">g/timme</th>
              <th className="px-3 py-2 text-left">Var 20:e min</th>
              <th className="px-3 py-2 text-left">Totalt</th>
              <th className="px-3 py-2 text-left">Kommentar</th>
            </tr>
          </thead>
          <tbody>
            {estimate.scenarios.map((scenario) => (
              <tr key={scenario.key} className="border-b">
                <td className="px-3 py-2 font-medium">{scenario.labelSv}</td>
                <td className="px-3 py-2">{scenario.carbsPerHour} g</td>
                <td className="px-3 py-2">{scenario.intakeEvery20Min} g</td>
                <td className="px-3 py-2">{scenario.totalCarbs || '–'} g</td>
                <td className="px-3 py-2 text-gray-700">
                  {scenario.noteSv}
                  {scenario.requiresGutTraining ? ' Kräver magträning.' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-900">
        <p className="font-medium mb-1">Tolkning</p>
        <p>
          Kroppen kan förbruka mer kolhydrater än magen hinner ta upp. Därför är rekommendationen ett praktiskt
          intagsmål, medan beräknad KH-förbrukning visar belastningen på glykogenlagren.
        </p>
        {(estimate.assumptionsSv.length > 0 || estimate.warningsSv.length > 0) && (
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {[...estimate.assumptionsSv, ...estimate.warningsSv].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function getUsableStages(test: Test): TestStage[] {
  return test.testStages
    .filter((stage) => {
      const hasIntensity = test.testType === 'RUNNING' ? stage.speed != null : test.testType === 'CYCLING' ? stage.power != null : stage.pace != null
      return hasIntensity && (stage.vco2 != null || stage.choPercent != null) && (stage.rer == null || stage.rer <= 1)
    })
    .sort((a, b) => a.sequence - b.sequence)
}

function formatStageIntensity(stage: TestStage, testType: TestType): string {
  if (testType === 'RUNNING') return `${stage.speed ?? '–'} km/h`
  if (testType === 'CYCLING') return `${stage.power ?? '–'} W`
  return `${stage.pace ?? '–'} min/km`
}

function confidenceLabel(confidence: RaceFuelingEstimate['confidence']): string {
  if (confidence === 'HIGH') return 'hög'
  if (confidence === 'MEDIUM') return 'medel'
  return 'låg'
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return 'Saknas'
  const totalMinutes = Math.round(minutes)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`
}
