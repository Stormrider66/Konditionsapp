'use client'

import { useMemo, useState } from 'react'
import type { Test, TestStage, TestType } from '@/types'
import { estimateRaceFueling } from '@/lib/fueling/race-fueling'
import { buildFuelingBuildUpPlan } from '@/lib/fueling/build-up-plan'
import { buildRaceDayFuelingPlan } from '@/lib/fueling/race-day-plan'
import { formatFuelingTargetIntensity } from '@/lib/fueling/target-intensity'
import { extractApiErrorMessage } from '@/lib/fueling/api-error'
import type { RaceFuelingEstimate } from '@/lib/fueling/types'
import { useLocale, useTranslations } from '@/i18n/client'

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

type RaceFuelingT = ReturnType<typeof useTranslations>

export function RaceFuelingEstimateSection({ clientId, test, weightKg }: RaceFuelingEstimateSectionProps) {
  const t = useTranslations('components.raceFuelingEstimate')
  const locale = useLocale()
  const usableStages = useMemo(() => getUsableStages(test), [test])
  const options = useMemo(() => getDistanceOptions(test.testType, t), [test.testType, t])
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
          name: t('planName', { target: formatRaceTargetLabel(selectedDistance, locale) }),
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
      if (!response.ok) throw new Error(extractApiErrorMessage(body) ?? t('errors.saveFailed'))
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err instanceof Error ? err.message : t('errors.saveFailed'))
    }
  }

  return (
    <section className="mt-6 border-b pb-6 print:break-inside-avoid" data-pdf-section>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold">{t('title')}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            {t('confidence.label')} {t(`confidence.values.${estimate.confidence.toLowerCase()}`)}
          </span>
          <button
            type="button"
            onClick={() => void savePlan()}
            disabled={saveStatus === 'saving' || !canSavePlan}
            className="print:hidden text-xs px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {saveStatus === 'saving' ? t('actions.saving') : saveStatus === 'saved' ? t('actions.saved') : t('actions.createPlan')}
          </button>
          {!canSavePlan && (
            <span className="print:hidden max-w-52 text-right text-xs text-amber-700">
              {t('validation.needTarget')}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="print:hidden max-w-52 text-right text-xs text-red-600">
              {saveError ?? t('errors.saveFailed')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print:hidden">
        <label className="text-sm font-medium text-gray-700">
          {t('fields.distanceTime')}
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
          {t('fields.plannedIntensity')}
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
                {stage.lactate != null ? `, ${t('stage.lactate')} ${stage.lactate}` : ''}
                {stage.rer != null ? `, RER ${stage.rer.toFixed(2)}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedDistanceOption.custom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print:hidden">
          <label className="text-sm font-medium text-gray-700">
            {t('fields.customDistance')}
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
              placeholder={t('placeholders.exampleDistance')}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            {t('fields.expectedTime')}
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
              placeholder={t('placeholders.expectedTime')}
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print:hidden">
        <label className="text-sm font-medium text-gray-700">
          {t('fields.raceDate')}
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
          {t('fields.gutTolerance')}
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
            placeholder={t('placeholders.exampleGutTolerance')}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Metric label={t('metrics.estimatedTime')} value={formatDuration(estimate.estimatedDurationMinutes, t)} />
        <Metric label={t('metrics.targetIntensity')} value={targetIntensity ?? t('missing')} />
        <Metric label={t('metrics.carbDemand')} value={estimate.carbohydrateDemandPerHour ? `${estimate.carbohydrateDemandPerHour} g/h` : t('missing')} />
        <Metric label={t('metrics.recommendedIntake')} value={estimate.recommendedCarbsPerHour ? `${estimate.recommendedCarbsPerHour} g/h` : t('missing')} />
        <Metric label={t('metrics.totalIntake')} value={estimate.scenarios[1]?.totalCarbs ? `${estimate.scenarios[1].totalCarbs} g` : t('missing')} />
      </div>

      {raceDayPlan && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
          <p className="font-medium mb-2">{t('raceDayPlan.title')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Metric label={t('raceDayPlan.intakeRhythm')} value={t('raceDayPlan.intakeEvery20Min', { grams: raceDayPlan.intakeEvery20Min })} />
            <Metric label={t('raceDayPlan.gelEquivalent')} value={raceDayPlan.gelEquivalentCount ? t('raceDayPlan.gels', { count: raceDayPlan.gelEquivalentCount }) : t('missing')} />
            <Metric label={t('raceDayPlan.sportsDrink')} value={raceDayPlan.bottleMixCount ? t('raceDayPlan.bottles', { count: raceDayPlan.bottleMixCount }) : t('missing')} />
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
              <p className="font-medium">{t('buildUp.title')}</p>
              <p className="mt-1 text-blue-900">
                {t('buildUp.description', { start: buildUpPlan.startCarbsGPerHour, target: buildUpPlan.raceTargetGPerHour })}
              </p>
            </div>
            <span className="w-fit rounded-full bg-white px-2 py-1 text-xs font-medium text-blue-700">
              {t('buildUp.weeks', { weeks: buildUpPlan.sessions.length })}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {buildUpPlan.sessions.slice(0, 6).map((session) => (
              <div key={session.week} className="rounded-md border border-blue-100 bg-white/70 p-3">
                <p className="text-xs font-medium text-blue-700">{t('buildUp.week', { week: session.week })}</p>
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
              <th className="px-3 py-2 text-left">{t('scenarioTable.scenario')}</th>
              <th className="px-3 py-2 text-left">{t('scenarioTable.gramsPerHour')}</th>
              <th className="px-3 py-2 text-left">{t('scenarioTable.every20Min')}</th>
              <th className="px-3 py-2 text-left">{t('scenarioTable.total')}</th>
              <th className="px-3 py-2 text-left">{t('scenarioTable.comment')}</th>
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
                  {scenario.requiresGutTraining ? ` ${t('scenarioTable.requiresGutTraining')}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-900">
        <p className="font-medium mb-1">{t('interpretation.title')}</p>
        <p>
          {t('interpretation.description')}
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

function formatDuration(minutes: number | null, t: RaceFuelingT): string {
  if (minutes == null) return t('missing')
  const totalMinutes = Math.round(minutes)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return hours > 0 ? t('duration.hoursMinutes', { hours, minutes: mins }) : t('duration.minutes', { minutes: mins })
}

function resolveRaceTarget(option: RaceTargetOption, customDistanceKm: string, customDurationMinutes: string): RaceTargetOption {
  if (!option.custom) return option

  const distanceKm = parsePositiveNumber(customDistanceKm)
  const durationMinutes = parsePositiveNumber(customDurationMinutes)

  return {
    label: option.label,
    distanceKm,
    durationMinutes,
    custom: true,
  }
}

function parsePositiveNumber(value: string): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function formatRaceTargetLabel(option: RaceTargetOption, locale: string): string {
  if (!option.custom) return option.label

  const parts = [
    option.distanceKm ? `${option.distanceKm.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-US', { maximumFractionDigits: 1 })} km` : null,
    option.durationMinutes ? `${option.durationMinutes} min` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : option.label
}

function getDistanceOptions(
  testType: TestType,
  t: RaceFuelingT
): RaceTargetOption[] {
  const custom = { label: t('distanceOptions.custom'), custom: true }

  if (testType === 'CYCLING') {
    return [
      { label: t('distanceOptions.twoHours'), durationMinutes: 120 },
      { label: t('distanceOptions.threeHours'), durationMinutes: 180 },
      { label: t('distanceOptions.fiveHours'), durationMinutes: 300 },
      custom,
    ]
  }

  if (testType === 'SKIING') {
    return [
      { label: '20 km', distanceKm: 20 },
      { label: '45 km', distanceKm: 45 },
      { label: '90 km', distanceKm: 90 },
      custom,
    ]
  }

  return [
    { label: '10 km', distanceKm: 10 },
    { label: t('distanceOptions.halfMarathon'), distanceKm: 21.0975 },
    { label: t('distanceOptions.marathon'), distanceKm: 42.195 },
    custom,
  ]
}

function weeksUntilRace(value: string): number | null {
  const raceDate = new Date(`${value}T12:00:00`)
  if (Number.isNaN(raceDate.getTime())) return null

  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const days = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return days > 0 ? Math.ceil(days / 7) : null
}
