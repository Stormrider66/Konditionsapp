'use client'

import { useMemo, useState } from 'react'
import type { Test, TestStage, TestType } from '@/types'
import { estimateRaceFueling } from '@/lib/fueling/race-fueling'
import { buildFuelingBuildUpPlan } from '@/lib/fueling/build-up-plan'
import { buildRaceDayFuelingPlan } from '@/lib/fueling/race-day-plan'
import { formatFuelingTargetIntensity } from '@/lib/fueling/target-intensity'
import type { RaceFuelingEstimate } from '@/lib/fueling/types'

interface RaceFuelingEstimateSectionProps {
  clientId: string
  test: Test
  weightKg?: number | null
}

type RaceTargetOption = {
  label: string
  distanceKm?: number
  durationMinutes?: number
  custom?: boolean
}

const DISTANCE_OPTIONS: Record<TestType, RaceTargetOption[]> = {
  RUNNING: [
    { label: '10 km', distanceKm: 10 },
    { label: 'Halvmarathon', distanceKm: 21.0975 },
    { label: 'Marathon', distanceKm: 42.195 },
    { label: 'Egen distans / tid', custom: true },
  ],
  CYCLING: [
    { label: '2 timmar', durationMinutes: 120 },
    { label: '3 timmar', durationMinutes: 180 },
    { label: '5 timmar', durationMinutes: 300 },
    { label: 'Egen distans / tid', custom: true },
  ],
  SKIING: [
    { label: '20 km', distanceKm: 20 },
    { label: '45 km', distanceKm: 45 },
    { label: '90 km', distanceKm: 90 },
    { label: 'Egen distans / tid', custom: true },
  ],
}

export function RaceFuelingEstimateSection({ clientId, test, weightKg }: RaceFuelingEstimateSectionProps) {
  const usableStages = useMemo(() => getUsableStages(test), [test])
  const options = DISTANCE_OPTIONS[test.testType] ?? DISTANCE_OPTIONS.RUNNING
  const [selectedDistanceIndex, setSelectedDistanceIndex] = useState(Math.max(0, options.length - 2))
  const [selectedStageSequence, setSelectedStageSequence] = useState<number | null>(usableStages[0]?.sequence ?? null)
  const [customDistanceKm, setCustomDistanceKm] = useState('')
  const [customDurationMinutes, setCustomDurationMinutes] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [gutTolerance, setGutTolerance] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const estimate = useMemo<RaceFuelingEstimate | null>(() => {
    const selectedStage = usableStages.find((stage) => stage.sequence === selectedStageSequence) ?? usableStages[0]
    const selectedDistance = resolveRaceTarget(options[selectedDistanceIndex] ?? options[0], customDistanceKm, customDurationMinutes)
    const currentGutToleranceCarbsPerHour = parsePositiveNumber(gutTolerance)
    if (!selectedStage || !selectedDistance || (!selectedDistance.distanceKm && !selectedDistance.durationMinutes)) return null

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
      { weightKg, currentGutToleranceCarbsPerHour }
    )
  }, [customDistanceKm, customDurationMinutes, gutTolerance, options, selectedDistanceIndex, selectedStageSequence, test.testStages, test.testType, usableStages, weightKg])

  if (!estimate || usableStages.length === 0) return null

  const selectedDistanceOption = options[selectedDistanceIndex] ?? options[0]
  const selectedDistance = resolveRaceTarget(selectedDistanceOption, customDistanceKm, customDurationMinutes)
  const selectedStage = usableStages.find((stage) => stage.sequence === selectedStageSequence) ?? usableStages[0]
  const canSavePlan = Boolean(
    selectedDistance?.durationMinutes ||
    (selectedDistance?.distanceKm && (selectedStage?.speed || selectedStage?.pace))
  )
  const targetIntensity = formatFuelingTargetIntensity({
    targetSpeedKmh: selectedStage?.speed,
    targetPowerWatts: selectedStage?.power,
    targetPaceMinKm: selectedStage?.pace,
  })
  const raceDayPlan = buildRaceDayFuelingPlan(estimate.recommendedCarbsPerHour, estimate.estimatedDurationMinutes)
  const buildUpPlan = buildFuelingBuildUpPlan({
    raceTargetGPerHour: estimate.recommendedCarbsPerHour,
    currentGutToleranceGPerHour: parsePositiveNumber(gutTolerance),
    weeksAvailable: raceDate ? weeksUntilRace(raceDate) : null,
  })

  async function savePlan() {
    if (!selectedStage || !selectedDistance || !canSavePlan) return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const response = await fetch('/api/fueling/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          testId: test.id,
          sport: test.testType,
          name: `Tävlingsenergi ${formatRaceTargetLabel(selectedDistance)}`,
          distanceKm: selectedDistance.distanceKm,
          durationMinutes: selectedDistance.durationMinutes,
          targetSpeedKmh: selectedStage.speed,
          targetPowerWatts: selectedStage.power,
          targetPaceMinKm: selectedStage.pace,
          raceDate: raceDate ? new Date(raceDate).toISOString() : null,
          currentGutToleranceCarbsPerHour: gutTolerance ? Number(gutTolerance) : null,
        }),
      })

      const body = await response.json()
      if (!response.ok) throw new Error(extractApiErrorMessage(body) ?? 'Kunde inte spara planen.')
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Kunde inte spara planen.')
    }
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
            disabled={saveStatus === 'saving' || !canSavePlan}
            className="print:hidden text-xs px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {saveStatus === 'saving' ? 'Sparar...' : saveStatus === 'saved' ? 'Sparad' : 'Skapa tävlingsplan'}
          </button>
          {!canSavePlan && (
            <span className="print:hidden max-w-52 text-right text-xs text-amber-700">
              Ange förväntad tid, eller distans tillsammans med fart/pace.
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="print:hidden max-w-52 text-right text-xs text-red-600">
              {saveError ?? 'Kunde inte spara planen.'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print:hidden">
        <label className="text-sm font-medium text-gray-700">
          Distans / tid
          <select
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={selectedDistanceIndex}
            onChange={(event) => {
              setSelectedDistanceIndex(Number(event.target.value))
              setSaveStatus('idle')
              setSaveError(null)
            }}
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
            onChange={(event) => {
              setSelectedStageSequence(Number(event.target.value))
              setSaveStatus('idle')
              setSaveError(null)
            }}
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

      {selectedDistanceOption.custom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print:hidden">
          <label className="text-sm font-medium text-gray-700">
            Egen distans (km)
            <input
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              inputMode="decimal"
              min="0"
              step="0.1"
              type="number"
              value={customDistanceKm}
              onChange={(event) => {
                setCustomDistanceKm(event.target.value)
                setSaveStatus('idle')
                setSaveError(null)
              }}
              placeholder="Ex. 30"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Förväntad tid (min)
            <input
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              inputMode="numeric"
              min="1"
              step="1"
              type="number"
              value={customDurationMinutes}
              onChange={(event) => {
                setCustomDurationMinutes(event.target.value)
                setSaveStatus('idle')
                setSaveError(null)
              }}
              placeholder="Behövs om fart/pace saknas"
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print:hidden">
        <label className="text-sm font-medium text-gray-700">
          Tävlingsdatum
          <input
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            type="date"
            value={raceDate}
            onChange={(event) => {
              setRaceDate(event.target.value)
              setSaveStatus('idle')
              setSaveError(null)
            }}
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Nuvarande magtolerans (g/h)
          <input
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            inputMode="numeric"
            min="0"
            max="150"
            step="5"
            type="number"
            value={gutTolerance}
            onChange={(event) => {
              setGutTolerance(event.target.value)
              setSaveStatus('idle')
              setSaveError(null)
            }}
            placeholder="Ex. 60"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Metric label="Beräknad tid" value={formatDuration(estimate.estimatedDurationMinutes)} />
        <Metric label="Målintensitet" value={targetIntensity ?? 'Saknas'} />
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

      {buildUpPlan && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-medium">Magträning fram till loppet</p>
              <p className="mt-1 text-blue-900">
                Bygg från {buildUpPlan.startCarbsGPerHour} till {buildUpPlan.raceTargetGPerHour} g/h med ett tävlingslikt pass per vecka.
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-2 py-1 text-xs font-medium text-blue-700">
              {buildUpPlan.sessions.length} veckor
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {buildUpPlan.sessions.slice(0, 6).map((session) => (
              <div key={session.week} className="rounded-md border border-blue-100 bg-white/70 p-3">
                <p className="text-xs font-medium text-blue-700">Vecka {session.week}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{session.targetCarbsGPerHour} g/h</p>
                <p className="text-xs font-medium text-gray-700">{session.focusSv}</p>
                <p className="mt-1 text-xs text-gray-600">{session.noteSv}</p>
              </div>
            ))}
          </div>
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

function extractApiErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const record = body as { details?: Array<{ message?: unknown }>; error?: unknown }
  const detailMessage = record.details?.find((detail) => typeof detail.message === 'string')?.message
  if (typeof detailMessage === 'string') return detailMessage
  return typeof record.error === 'string' ? record.error : null
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

function resolveRaceTarget(option: RaceTargetOption, customDistanceKm: string, customDurationMinutes: string): RaceTargetOption {
  if (!option.custom) return option

  const distanceKm = parsePositiveNumber(customDistanceKm)
  const durationMinutes = parsePositiveNumber(customDurationMinutes)

  return {
    label: 'Egen distans / tid',
    distanceKm,
    durationMinutes,
    custom: true,
  }
}

function parsePositiveNumber(value: string): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function formatRaceTargetLabel(option: RaceTargetOption): string {
  if (!option.custom) return option.label

  const parts = [
    option.distanceKm ? `${option.distanceKm.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} km` : null,
    option.durationMinutes ? formatDuration(option.durationMinutes) : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : option.label
}

function weeksUntilRace(value: string): number | null {
  const raceDate = new Date(`${value}T12:00:00`)
  if (Number.isNaN(raceDate.getTime())) return null

  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const days = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return days > 0 ? Math.ceil(days / 7) : null
}
