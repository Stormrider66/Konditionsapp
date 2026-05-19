'use client'

import { Client, TestCalculations, Test } from '@/types'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { TestChart } from '../charts/TestChart'
import { PowerChart } from '../charts/PowerChart'
import { DmaxCurveChart } from '../charts/DmaxCurveChart'
import { LactateHeartRateChart } from '../charts/LactateHeartRateChart'
import { SummaryBox } from './SummaryBox'
import { StrengthsWeaknesses } from './StrengthsWeaknesses'
import { PaceZones } from './PaceZones'
import { TrainingFocus } from './TrainingFocus'
import { SubstrateUtilizationChart } from '../charts/SubstrateUtilizationChart'
import { RaceFuelingEstimateSection } from './fueling/RaceFuelingEstimateSection'
import { generateFullInterpretation } from '@/lib/calculations/interpretations'
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext'
import { useLocale, useTranslations } from '@/i18n/client'

interface ReportTemplateProps {
  client: Client
  test: Test
  calculations: TestCalculations
  testLeader: string
  organization: string
}

export function ReportTemplate({
  client,
  test,
  calculations,
  testLeader,
  organization,
}: ReportTemplateProps) {
  const t = useTranslations('components.reportTemplate')
  const locale = useLocale()
  const dateLocale = locale === 'en' ? enUS : sv
  const branding = useBusinessBrandingOptional()
  const birthDate = client.birthDate instanceof Date ? client.birthDate : new Date(client.birthDate as unknown as string)
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  // Generate full interpretation data
  const interpretation = generateFullInterpretation(
    calculations,
    client,
    test.testStages,
    test.testType
  )

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 print:p-6 print:max-w-none" data-pdf-content>
      {/* Header */}
      <header
        data-pdf-section
        className={`text-white p-6 rounded-t-lg print:rounded-none ${!branding?.primaryColor ? 'gradient-primary' : ''}`}
        style={branding?.primaryColor
          ? { background: `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor || branding.primaryColor} 100%)` }
          : undefined}
      >
        <div className="flex items-center gap-4">
          {branding?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={organization} className="h-10 w-auto" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{organization}</h1>
            <p className="text-lg mt-1">{t('header.title')}</p>
          </div>
        </div>
      </header>

      {/* Klientinformation */}
      <section className="mt-6 border-b pb-6" data-pdf-section>
        <h2 className="text-2xl font-semibold mb-4">{t('clientInfo.title')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">{t('clientInfo.name')}</p>
            <p className="font-medium">{client.name}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('clientInfo.age')}</p>
            <p className="font-medium">{t('clientInfo.ageValue', { age })}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('clientInfo.gender')}</p>
            <p className="font-medium">{client.gender === 'MALE' ? t('clientInfo.genders.male') : t('clientInfo.genders.female')}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('clientInfo.height')}</p>
            <p className="font-medium">{client.height} cm</p>
          </div>
          <div>
            <p className="text-gray-600">{t('clientInfo.weight')}</p>
            <p className="font-medium">{client.weight} kg</p>
          </div>
          <div>
            <p className="text-gray-600">BMI</p>
            <p className="font-medium">{calculations.bmi}</p>
          </div>
        </div>
      </section>

      {/* Testinformation */}
      <section className="mt-6 border-b pb-6" data-pdf-section>
        <h2 className="text-2xl font-semibold mb-4">{t('testInfo.title')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">{t('testInfo.testDate')}</p>
            <p className="font-medium">{format(test.testDate, 'PPP', { locale: dateLocale })}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('testInfo.testType')}</p>
            <p className="font-medium">{t(`testInfo.testTypes.${test.testType.toLowerCase()}`)}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('testInfo.testLeader')}</p>
            <p className="font-medium">{testLeader}</p>
          </div>
          {test.restingLactate != null && (
            <div>
              <p className="text-gray-600">{t('testInfo.restingLactate')}</p>
              <p className="font-medium">{test.restingLactate} mmol/L</p>
            </div>
          )}
          {test.restingHeartRate != null && (
            <div>
              <p className="text-gray-600">{t('testInfo.restingHeartRate')}</p>
              <p className="font-medium">{t('testInfo.heartRateValue', { value: test.restingHeartRate })}</p>
            </div>
          )}
        </div>
      </section>

      {/* Summary Box - Key Metrics at a Glance */}
      <SummaryBox
        calculations={calculations}
        client={client}
        testType={test.testType}
        vo2maxInterpretation={interpretation.vo2max}
        athleteType={interpretation.athleteType}
        primaryStrength={interpretation.strengths[0]}
      />

      {/* Baseline correction warnings */}
      {calculations.warnings?.filter(w => w.type === 'BASELINE_CORRECTION').map((warning, i) => (
        <section key={`warning-${i}`} className="mt-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">{t('baselineCorrection.title')}</p>
                <p className="text-sm text-blue-800 mt-1">{warning.message}</p>
                {warning.details?.correctedStages && warning.details.correctedStages.length > 0 && (
                  <table className="mt-2 text-sm text-blue-900">
                    <thead>
                      <tr>
                        <th className="pr-4 text-left font-medium">{t('baselineCorrection.stage')}</th>
                        <th className="pr-4 text-left font-medium">{t('baselineCorrection.measured')}</th>
                        <th className="text-left font-medium">{t('baselineCorrection.corrected')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warning.details.correctedStages.map((s) => (
                        <tr key={s.stage}>
                          <td className="pr-4">{s.stage}</td>
                          <td className="pr-4">{s.original.toFixed(1)}</td>
                          <td>{s.corrected.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Lactate curve data-quality warnings */}
      {calculations.warnings?.filter(w => w.type === 'LACTATE_DROP').map((warning, i) => (
        <section key={`lactate-drop-warning-${i}`} className="mt-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.986-1.742 2.986H3.48c-1.53 0-2.492-1.652-1.742-2.986l6.518-11.59zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V8a1 1 0 112 0v3a1 1 0 01-1 1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">{t('lactateDropWarning.title')}</p>
                <p className="text-sm text-amber-800 mt-1">{warning.message}</p>
                {warning.details?.lactateDrops && warning.details.lactateDrops.length > 0 && (
                  <table className="mt-2 text-sm text-amber-900">
                    <thead>
                      <tr>
                        <th className="pr-4 text-left font-medium">{t('lactateDropWarning.fromStage')}</th>
                        <th className="pr-4 text-left font-medium">{t('lactateDropWarning.toStage')}</th>
                        <th className="text-left font-medium">{t('lactateDropWarning.drop')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warning.details.lactateDrops.map((drop) => (
                        <tr key={`${drop.fromStage}-${drop.toStage}`}>
                          <td className="pr-4">{drop.fromStage}</td>
                          <td className="pr-4">{drop.toStage}</td>
                          <td>{drop.drop.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Testresultat */}
      <section className="mt-6 border-b pb-6" data-pdf-section>
        <h2 className="text-2xl font-semibold mb-4">{t('testResults.title')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-gray-600 text-sm">{t('testResults.maxHeartRate')}</p>
            <p className="text-2xl font-bold text-blue-700">{t('testInfo.heartRateValue', { value: calculations.maxHR })}</p>
          </div>
          {calculations.vo2max && calculations.vo2max > 0 ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-600 text-sm">VO₂max</p>
              <p className="text-2xl font-bold text-green-700">{calculations.vo2max} ml/kg/min</p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
              <p className="text-gray-600 text-sm">VO₂max</p>
              <p className="text-sm text-gray-500 italic mt-1">{t('testResults.notMeasured')}</p>
            </div>
          )}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-gray-600 text-sm">{t('testResults.maxLactate')}</p>
            <p className="text-2xl font-bold text-red-700">{calculations.maxLactate} mmol/L</p>
          </div>
        </div>

        {/* Information om testomfång */}
        {(!calculations.vo2max || calculations.vo2max === 0) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">{t('testScope.title')}</p>
                <p className="text-sm text-blue-800 mt-1">
                  {t('testScope.description')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cykel-specifika resultat */}
        {test.testType === 'CYCLING' && calculations.cyclingData && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-gray-600 text-sm">FTP (Functional Threshold Power)</p>
              <p className="text-2xl font-bold text-yellow-700">{calculations.cyclingData.ftp} watt</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-gray-600 text-sm">{t('cyclingResults.wattsPerKg')}</p>
              <p className="text-2xl font-bold text-purple-700">{calculations.cyclingData.wattsPerKg} W/kg</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <p className="text-gray-600 text-sm">{t('cyclingResults.evaluation')}</p>
              <p className="text-lg font-bold text-indigo-700">{calculations.cyclingData.evaluation}</p>
            </div>
          </div>
        )}

        {/* Post-test measurements (peak lactate after max effort) */}
        {test.postTestMeasurements && Array.isArray(test.postTestMeasurements) && test.postTestMeasurements.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">{t('postTest.title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">{t('postTest.timeAfterTest')}</th>
                    <th className="px-4 py-2 text-left">{t('postTest.lactate')}</th>
                    {test.postTestMeasurements.some((m: { heartRate?: number }) => m.heartRate) && (
                      <th className="px-4 py-2 text-left">{t('postTest.heartRate')}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {test.postTestMeasurements.map((m: { timeMin: number; lactate: number; heartRate?: number }, i: number) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{m.timeMin} min</td>
                      <td className="px-4 py-2 font-medium">{m.lactate}</td>
                      {test.postTestMeasurements!.some((pm: { heartRate?: number }) => pm.heartRate) && (
                        <td className="px-4 py-2">{m.heartRate || '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('postTest.description')}
            </p>
          </div>
        )}
      </section>

      {/* Tröskelvärden */}
      <section className="mt-6 border-b pb-6" data-pdf-section>
        <h2 className="text-2xl font-semibold mb-4">{t('thresholds.title')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aerob tröskel */}
          {calculations.aerobicThreshold && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">
                  {t('thresholds.aerobicTitle', { lactate: calculations.aerobicThreshold.lactate ?? '-' })}
                </h3>
                {(calculations.aerobicThreshold as any).method && (
                  <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full">
                    {(calculations.aerobicThreshold as any).method}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('thresholds.heartRate')}</span>
                  <span className="font-medium">{t('testInfo.heartRateValue', { value: calculations.aerobicThreshold.heartRate })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {test.testType === 'RUNNING' ? t('thresholds.speed') : t('thresholds.power')}
                  </span>
                  <span className="font-medium">
                    {calculations.aerobicThreshold.value} {calculations.aerobicThreshold.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('thresholds.percentOfMaxHeartRate')}</span>
                  <span className="font-medium">{calculations.aerobicThreshold.percentOfMax}%</span>
                </div>
                {(calculations.aerobicThreshold as any).confidence && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('thresholds.confidence')}</span>
                    <span className={`font-medium ${
                      (calculations.aerobicThreshold as any).confidence === 'HIGH' ? 'text-green-700' :
                      (calculations.aerobicThreshold as any).confidence === 'MEDIUM' ? 'text-yellow-700' :
                      'text-orange-700'
                    }`}>
                      {t(`thresholds.confidenceValues.${String((calculations.aerobicThreshold as any).confidence).toLowerCase()}`)}
                    </span>
                  </div>
                )}
                {(calculations.aerobicThreshold as any).r2 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('thresholds.r2')}</span>
                    <span className="font-medium">
                      {((calculations.aerobicThreshold as any).r2 * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Anaerob tröskel */}
          {calculations.anaerobicThreshold && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">
                  {t('thresholds.anaerobicTitle', { lactate: calculations.anaerobicThreshold.lactate ?? '-' })}
                </h3>
                {(calculations.anaerobicThreshold as any).method && (
                  <span className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded-full">
                    {(calculations.anaerobicThreshold as any).method}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('thresholds.heartRate')}</span>
                  <span className="font-medium">
                    {t('testInfo.heartRateValue', { value: calculations.anaerobicThreshold.heartRate })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {test.testType === 'RUNNING' ? t('thresholds.speed') : t('thresholds.power')}
                  </span>
                  <span className="font-medium">
                    {calculations.anaerobicThreshold.value} {calculations.anaerobicThreshold.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('thresholds.percentOfMaxHeartRate')}</span>
                  <span className="font-medium">{calculations.anaerobicThreshold.percentOfMax}%</span>
                </div>
                {(calculations.anaerobicThreshold as any).confidence && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('thresholds.confidence')}</span>
                    <span className={`font-medium ${
                      (calculations.anaerobicThreshold as any).confidence === 'HIGH' ? 'text-green-700' :
                      (calculations.anaerobicThreshold as any).confidence === 'MEDIUM' ? 'text-yellow-700' :
                      'text-orange-700'
                    }`}>
                      {t(`thresholds.confidenceValues.${String((calculations.anaerobicThreshold as any).confidence).toLowerCase()}`)}
                    </span>
                  </div>
                )}
                {(calculations.anaerobicThreshold as any).r2 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('thresholds.r2')}</span>
                    <span className="font-medium">
                      {((calculations.anaerobicThreshold as any).r2 * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* D-max Explanation - only shown when D-max method was actually used */}
        {calculations.dmaxVisualization &&
         ((calculations.aerobicThreshold as any)?.method?.includes('DMAX') ||
          (calculations.anaerobicThreshold as any)?.method?.includes('DMAX')) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {t('dmax.title')}
            </h4>
            <p className="text-sm text-gray-700">
              {t('dmax.description', {
                fit: calculations.dmaxVisualization.r2 >= 0.95 ? t('dmax.fitExcellent') : t('dmax.fitGood'),
              })}
            </p>
          </div>
        )}
      </section>

      {/* Strengths and Weaknesses */}
      <StrengthsWeaknesses
        strengths={interpretation.strengths}
        weaknesses={interpretation.weaknesses}
      />

      {/* D-max Curve Visualization - shown when D-max visualization is available */}
      {calculations.dmaxVisualization && calculations.dmaxVisualization.coefficients && calculations.aerobicThreshold && calculations.anaerobicThreshold && (
        <>
          {/* Lactate vs Heart Rate Chart - Primary (most relevant) */}
          <section className="mt-6 border-b pb-6 print:break-inside-avoid" data-pdf-section>
            <h2 className="text-2xl font-semibold mb-4">{t('thresholdAnalysis')}</h2>
            <div className="bg-white p-4 rounded-lg border">
              <LactateHeartRateChart
                stages={test.testStages}
                aerobicThreshold={{
                  heartRate: calculations.aerobicThreshold.heartRate,
                  lactate: calculations.aerobicThreshold.lactate || 0,
                  method: (calculations.aerobicThreshold as any).method
                }}
                anaerobicThreshold={{
                  heartRate: calculations.anaerobicThreshold.heartRate,
                  lactate: calculations.anaerobicThreshold.lactate || 0,
                  method: (calculations.anaerobicThreshold as any).method
                }}
              />
            </div>
          </section>

          {/* Lactate vs Speed/Power Chart */}
          <section className="mt-6 border-b pb-6 print:break-inside-avoid" data-pdf-section>
            <div className="bg-white p-4 rounded-lg border">
              <DmaxCurveChart
                stages={test.testStages}
                dmaxResult={calculations.dmaxVisualization}
                intensityUnit={calculations.dmaxVisualization.unit}
                aerobicThreshold={{
                  intensity: calculations.aerobicThreshold.value,
                  lactate: calculations.aerobicThreshold.lactate || 0,
                  method: (calculations.aerobicThreshold as any).method
                }}
                anaerobicThreshold={{
                  intensity: calculations.anaerobicThreshold.value,
                  lactate: calculations.anaerobicThreshold.lactate || 0,
                  method: (calculations.anaerobicThreshold as any).method
                }}
              />
            </div>
          </section>
        </>
      )}

      {/* Träningszoner */}
      <section className="mt-6 border-b pb-6" data-pdf-section>
        <h2 className="text-2xl font-semibold mb-4">{t('trainingZones.title')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">{t('trainingZones.zone')}</th>
                <th className="px-4 py-2 text-left">{t('trainingZones.intensity')}</th>
                <th className="px-4 py-2 text-left">{t('trainingZones.heartRate')}</th>
                <th className="px-4 py-2 text-left">{t('trainingZones.percentOfMax')}</th>
                {test.testType === 'RUNNING' ? (
                  <th className="px-4 py-2 text-left">{t('trainingZones.speed')}</th>
                ) : (
                  <th className="px-4 py-2 text-left">{t('trainingZones.power')}</th>
                )}
                <th className="px-4 py-2 text-left">{t('trainingZones.effect')}</th>
              </tr>
            </thead>
            <tbody>
              {calculations.trainingZones.map((zone) => (
                <tr key={zone.zone} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    {t('trainingZones.zoneValue', { zone: zone.zone })}: {zone.name}
                  </td>
                  <td className="px-4 py-2">{zone.intensity}</td>
                  <td className="px-4 py-2">
                    {zone.hrMin} - {zone.hrMax}
                  </td>
                  <td className="px-4 py-2">
                    {zone.percentMin} - {zone.percentMax}%
                  </td>
                  <td className="px-4 py-2">
                    {test.testType === 'RUNNING'
                      ? `${zone.speedMin} - ${zone.speedMax} km/h`
                      : `${zone.powerMin} - ${zone.powerMax} W`}
                  </td>
                  <td className="px-4 py-2 text-sm">{zone.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Diagram */}
      <section className="mt-6 pb-6 print:break-before-page" data-pdf-section>
        <h2 className="text-2xl font-semibold mb-4">{t('charts.title')}</h2>
        {test.testType === 'CYCLING' ? (
          <PowerChart
            data={test.testStages}
            ftp={calculations.cyclingData?.ftp}
            powerZones={calculations.cyclingData?.powerZones}
          />
        ) : (
          <TestChart data={test.testStages} testType={test.testType} />
        )}
      </section>

      {/* Metabol data (visas om spirometridata finns) */}
      {test.testStages.some(s => s.rer != null || s.ve != null || s.fatPercent != null) && (
        <>
          <section className="mt-6 border-b pb-6" data-pdf-section>
            <h2 className="text-2xl font-semibold mb-4">{t('metabolic.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      {test.testType === 'RUNNING' ? t('trainingZones.speed') : test.testType === 'CYCLING' ? t('trainingZones.power') : t('metabolic.pace')}
                    </th>
                    <th className="px-3 py-2 text-left">{t('trainingZones.heartRate')}</th>
                    <th className="px-3 py-2 text-left">{t('metabolic.lactate')}</th>
                    {test.testStages.some(s => s.vo2 != null) && (
                      <th className="px-3 py-2 text-left">VO₂</th>
                    )}
                    {test.testStages.some(s => s.rer != null) && (
                      <th className="px-3 py-2 text-left">RER</th>
                    )}
                    {test.testStages.some(s => s.ve != null) && (
                      <th className="px-3 py-2 text-left">VE</th>
                    )}
                    {test.testStages.some(s => s.vco2 != null) && (
                      <th className="px-3 py-2 text-left">VCO₂</th>
                    )}
                    {test.testStages.some(s => s.fatPercent != null) && (
                      <th className="px-3 py-2 text-left">{t('metabolic.fatPercent')}</th>
                    )}
                    {test.testStages.some(s => s.choPercent != null) && (
                      <th className="px-3 py-2 text-left">{t('metabolic.carbPercent')}</th>
                    )}
                    {test.testStages.some(s => s.respiratoryRate != null) && (
                      <th className="px-3 py-2 text-left">Rf</th>
                    )}
                    {test.testStages.some(s => s.vo2 != null) && (
                      <th className="px-3 py-2 text-left">O₂-puls</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {test.testStages.map((stage, index) => {
                    const intensity = stage.speed ?? stage.power ?? stage.pace ?? 0
                    const intensityUnit = test.testType === 'RUNNING' ? ' km/h' : test.testType === 'CYCLING' ? ' W' : ' min/km'
                    const o2Pulse = stage.vo2 && stage.heartRate
                      ? ((stage.vo2 * (client.weight || 75)) / 1000 / stage.heartRate * 1000).toFixed(1)
                      : null
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{intensity}{intensityUnit}</td>
                        <td className="px-3 py-2">{stage.heartRate}</td>
                        <td className="px-3 py-2">{stage.lactate}</td>
                        {test.testStages.some(s => s.vo2 != null) && (
                          <td className="px-3 py-2">{stage.vo2 ?? '–'}</td>
                        )}
                        {test.testStages.some(s => s.rer != null) && (
                          <td className="px-3 py-2">{stage.rer?.toFixed(2) ?? '–'}</td>
                        )}
                        {test.testStages.some(s => s.ve != null) && (
                          <td className="px-3 py-2">{stage.ve?.toFixed(1) ?? '–'}</td>
                        )}
                        {test.testStages.some(s => s.vco2 != null) && (
                          <td className="px-3 py-2">{stage.vco2 ?? '–'}</td>
                        )}
                        {test.testStages.some(s => s.fatPercent != null) && (
                          <td className="px-3 py-2">{stage.fatPercent?.toFixed(1) ?? '–'}</td>
                        )}
                        {test.testStages.some(s => s.choPercent != null) && (
                          <td className="px-3 py-2">{stage.choPercent?.toFixed(1) ?? '–'}</td>
                        )}
                        {test.testStages.some(s => s.respiratoryRate != null) && (
                          <td className="px-3 py-2">{stage.respiratoryRate?.toFixed(0) ?? '–'}</td>
                        )}
                        {test.testStages.some(s => s.vo2 != null) && (
                          <td className="px-3 py-2">{o2Pulse ?? '–'}</td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Substrate Utilization Chart */}
          {test.testStages.some(s => s.fatPercent != null && s.choPercent != null) && (
            <section className="mt-6 border-b pb-6 print:break-inside-avoid" data-pdf-section>
              <h2 className="text-2xl font-semibold mb-4">{t('substrate.title')}</h2>
              <div className="bg-white p-4 rounded-lg border">
                <SubstrateUtilizationChart
                  stages={test.testStages}
                  testType={test.testType}
                />
              </div>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  {t.rich('substrate.description', {
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              </div>
            </section>
          )}

          <RaceFuelingEstimateSection clientId={client.id} test={test} weightKg={client.weight} />
        </>
      )}

      {/* Power Zones (endast för cykeltester) */}
      {test.testType === 'CYCLING' && calculations.cyclingData && calculations.cyclingData.powerZones && (
        <section className="mt-6 border-b pb-6" data-pdf-section>
          <h2 className="text-2xl font-semibold mb-4">{t('powerZones.title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">{t('trainingZones.zone')}</th>
                  <th className="px-4 py-2 text-left">{t('powerZones.percentOfFtp')}</th>
                  <th className="px-4 py-2 text-left">{t('powerZones.powerWatts')}</th>
                  <th className="px-4 py-2 text-left">{t('powerZones.description')}</th>
                </tr>
              </thead>
              <tbody>
                {calculations.cyclingData.powerZones.map((zone) => (
                  <tr key={zone.zone} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      {t('trainingZones.zoneValue', { zone: zone.zone })}: {zone.name}
                    </td>
                    <td className="px-4 py-2">
                      {zone.percentMin} - {zone.percentMax}%
                    </td>
                    <td className="px-4 py-2">
                      {zone.powerMin} - {zone.powerMax} W
                    </td>
                    <td className="px-4 py-2 text-sm">{zone.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Löpekonomi (endast för löptester) */}
      {test.testType === 'RUNNING' && calculations.economyData && calculations.economyData.length > 0 && (
        <>
          <section className="mt-6 border-b pb-6" data-pdf-section>
            <h2 className="text-2xl font-semibold mb-4">{t('runningEconomy.title')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">{t('runningEconomy.speed')}</th>
                    <th className="px-4 py-2 text-left">VO₂ (ml/kg/min)</th>
                    <th className="px-4 py-2 text-left">{t('runningEconomy.economy')}</th>
                    <th className="px-4 py-2 text-left">{t('cyclingResults.evaluation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.economyData.map((data, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{data.speed}</td>
                      <td className="px-4 py-2">{data.vo2}</td>
                      <td className="px-4 py-2">{data.economy}</td>
                      <td className="px-4 py-2">{data.efficiency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Running Economy Explanation */}
          <section className="mt-6 border-b pb-6" data-pdf-section>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-sm mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {t('runningEconomy.aboutTitle')}
              </h4>
              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  {t.rich('runningEconomy.description1', {
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                <p>
                  {t.rich('runningEconomy.description2', {
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-gray-800 mb-1">{t('runningEconomy.referenceValues')}</p>
                    <ul className="text-xs space-y-1 text-gray-600">
                      <li>• <span className="text-green-600 font-medium">{t('runningEconomy.ratings.excellent')}</span> &lt;180 ml/kg/km</li>
                      <li>• <span className="text-green-600 font-medium">{t('runningEconomy.ratings.veryGood')}</span> 180-195 ml/kg/km</li>
                      <li>• <span className="text-blue-600 font-medium">{t('runningEconomy.ratings.good')}</span> 195-210 ml/kg/km</li>
                      <li>• <span className="text-yellow-600 font-medium">{t('runningEconomy.ratings.acceptable')}</span> 210-230 ml/kg/km</li>
                      <li>• <span className="text-red-600 font-medium">{t('runningEconomy.ratings.improvement')}</span> &gt;230 ml/kg/km</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">{t('runningEconomy.factorsTitle')}</p>
                    <ul className="text-xs space-y-1 text-gray-600">
                      <li>• {t('runningEconomy.factors.technique')}</li>
                      <li>• {t('runningEconomy.factors.stiffness')}</li>
                      <li>• {t('runningEconomy.factors.bodyWeight')}</li>
                      <li>• {t('runningEconomy.factors.shoes')}</li>
                      <li>• {t('runningEconomy.factors.trainingHistory')}</li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">
                  {t('runningEconomy.improvementNote')}
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Pace Zones (Running only) */}
      {test.testType === 'RUNNING' && interpretation.paceZones.length > 0 && (
        <PaceZones paceZones={interpretation.paceZones} />
      )}

      {/* Training Focus */}
      <TrainingFocus trainingFocus={interpretation.trainingFocus} />

      {/* Recommended Next Test Date */}
      {test.recommendedNextTestDate && (
        <section className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg" data-pdf-section>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-semibold text-blue-900">{t('nextTest.title')}</p>
              <p className="text-blue-800">
                {format(new Date(test.recommendedNextTestDate), 'PPP', { locale: dateLocale })}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t text-sm text-gray-600" data-pdf-section>
        <p>{t('footer.generated', { date: format(new Date(), 'PPP', { locale: dateLocale }) })}</p>
        <p className="mt-2">© {new Date().getFullYear()} {organization}</p>
      </footer>
    </div>
  )
}
