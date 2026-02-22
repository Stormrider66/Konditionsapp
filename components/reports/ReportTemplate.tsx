'use client'

import { Client, TestCalculations, Test } from '@/types'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { TestChart } from '../charts/TestChart'
import { PowerChart } from '../charts/PowerChart'
import { DmaxCurveChart } from '../charts/DmaxCurveChart'
import { LactateHeartRateChart } from '../charts/LactateHeartRateChart'
import { SummaryBox } from './SummaryBox'
import { StrengthsWeaknesses } from './StrengthsWeaknesses'
import { PaceZones } from './PaceZones'
import { TrainingFocus } from './TrainingFocus'
import { generateFullInterpretation } from '@/lib/calculations/interpretations'
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext'

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
            <p className="text-lg mt-1">Konditionstestrapport</p>
          </div>
        </div>
      </header>

      {/* Klientinformation */}
      <section className="mt-6 border-b pb-6">
        <h2 className="text-2xl font-semibold mb-4">Klientinformation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Namn</p>
            <p className="font-medium">{client.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Ålder</p>
            <p className="font-medium">{age} år</p>
          </div>
          <div>
            <p className="text-gray-600">Kön</p>
            <p className="font-medium">{client.gender === 'MALE' ? 'Man' : 'Kvinna'}</p>
          </div>
          <div>
            <p className="text-gray-600">Längd</p>
            <p className="font-medium">{client.height} cm</p>
          </div>
          <div>
            <p className="text-gray-600">Vikt</p>
            <p className="font-medium">{client.weight} kg</p>
          </div>
          <div>
            <p className="text-gray-600">BMI</p>
            <p className="font-medium">{calculations.bmi}</p>
          </div>
        </div>
      </section>

      {/* Testinformation */}
      <section className="mt-6 border-b pb-6">
        <h2 className="text-2xl font-semibold mb-4">Testinformation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Testdatum</p>
            <p className="font-medium">{format(test.testDate, 'PPP', { locale: sv })}</p>
          </div>
          <div>
            <p className="text-gray-600">Testtyp</p>
            <p className="font-medium">{test.testType === 'RUNNING' ? 'Löpning' : 'Cykling'}</p>
          </div>
          <div>
            <p className="text-gray-600">Testledare</p>
            <p className="font-medium">{testLeader}</p>
          </div>
          {test.restingLactate != null && (
            <div>
              <p className="text-gray-600">Vilolaktat</p>
              <p className="font-medium">{test.restingLactate} mmol/L</p>
            </div>
          )}
          {test.restingHeartRate != null && (
            <div>
              <p className="text-gray-600">Vilopuls</p>
              <p className="font-medium">{test.restingHeartRate} slag/min</p>
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

      {/* Testresultat */}
      <section className="mt-6 border-b pb-6">
        <h2 className="text-2xl font-semibold mb-4">Testresultat</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-gray-600 text-sm">Max Puls</p>
            <p className="text-2xl font-bold text-blue-700">{calculations.maxHR} slag/min</p>
          </div>
          {calculations.vo2max && calculations.vo2max > 0 ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-600 text-sm">VO₂max</p>
              <p className="text-2xl font-bold text-green-700">{calculations.vo2max} ml/kg/min</p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
              <p className="text-gray-600 text-sm">VO₂max</p>
              <p className="text-sm text-gray-500 italic mt-1">Ej mätt under testet</p>
            </div>
          )}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-gray-600 text-sm">Max Laktat</p>
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
                <p className="text-sm font-medium text-blue-900">Om detta test</p>
                <p className="text-sm text-blue-800 mt-1">
                  Detta test genomfördes utan VO₂-mätning. Laktat- och pulsmätningar är tillräckliga för att beräkna
                  träningszoner och tröskelvärden. VO₂-mätning krävs endast för VO₂max-bedömning och löpekonomianalys.
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
              <p className="text-gray-600 text-sm">Watt per kg</p>
              <p className="text-2xl font-bold text-purple-700">{calculations.cyclingData.wattsPerKg} W/kg</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <p className="text-gray-600 text-sm">Bedömning</p>
              <p className="text-lg font-bold text-indigo-700">{calculations.cyclingData.evaluation}</p>
            </div>
          </div>
        )}

        {/* Post-test measurements (peak lactate after max effort) */}
        {test.postTestMeasurements && Array.isArray(test.postTestMeasurements) && test.postTestMeasurements.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Eftermätningar (post-max laktat)</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Tid efter test</th>
                    <th className="px-4 py-2 text-left">Laktat (mmol/L)</th>
                    {test.postTestMeasurements.some((m: { heartRate?: number }) => m.heartRate) && (
                      <th className="px-4 py-2 text-left">Puls (slag/min)</th>
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
              Topplaktat efter maxbelastning ger en bild av anaerob kapacitet
            </p>
          </div>
        )}
      </section>

      {/* Tröskelvärden */}
      <section className="mt-6 border-b pb-6">
        <h2 className="text-2xl font-semibold mb-4">Tröskelvärden</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aerob tröskel */}
          {calculations.aerobicThreshold && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">
                  Aerob Tröskel ({calculations.aerobicThreshold.lactate} mmol/L)
                </h3>
                {(calculations.aerobicThreshold as any).method && (
                  <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full">
                    {(calculations.aerobicThreshold as any).method}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Puls:</span>
                  <span className="font-medium">{calculations.aerobicThreshold.heartRate} slag/min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {test.testType === 'RUNNING' ? 'Hastighet:' : 'Effekt:'}
                  </span>
                  <span className="font-medium">
                    {calculations.aerobicThreshold.value} {calculations.aerobicThreshold.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">% av max puls:</span>
                  <span className="font-medium">{calculations.aerobicThreshold.percentOfMax}%</span>
                </div>
                {(calculations.aerobicThreshold as any).confidence && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tillförlitlighet:</span>
                    <span className={`font-medium ${
                      (calculations.aerobicThreshold as any).confidence === 'HIGH' ? 'text-green-700' :
                      (calculations.aerobicThreshold as any).confidence === 'MEDIUM' ? 'text-yellow-700' :
                      'text-orange-700'
                    }`}>
                      {(calculations.aerobicThreshold as any).confidence}
                    </span>
                  </div>
                )}
                {(calculations.aerobicThreshold as any).r2 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">R² (kurvpassning):</span>
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
                  Anaerob Tröskel ({calculations.anaerobicThreshold.lactate} mmol/L)
                </h3>
                {(calculations.anaerobicThreshold as any).method && (
                  <span className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded-full">
                    {(calculations.anaerobicThreshold as any).method}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Puls:</span>
                  <span className="font-medium">
                    {calculations.anaerobicThreshold.heartRate} slag/min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {test.testType === 'RUNNING' ? 'Hastighet:' : 'Effekt:'}
                  </span>
                  <span className="font-medium">
                    {calculations.anaerobicThreshold.value} {calculations.anaerobicThreshold.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">% av max puls:</span>
                  <span className="font-medium">{calculations.anaerobicThreshold.percentOfMax}%</span>
                </div>
                {(calculations.anaerobicThreshold as any).confidence && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tillförlitlighet:</span>
                    <span className={`font-medium ${
                      (calculations.anaerobicThreshold as any).confidence === 'HIGH' ? 'text-green-700' :
                      (calculations.anaerobicThreshold as any).confidence === 'MEDIUM' ? 'text-yellow-700' :
                      'text-orange-700'
                    }`}>
                      {(calculations.anaerobicThreshold as any).confidence}
                    </span>
                  </div>
                )}
                {(calculations.anaerobicThreshold as any).r2 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">R² (kurvpassning):</span>
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
              Om D-max metoden
            </h4>
            <p className="text-sm text-gray-700">
              D-max är en matematisk metod som identifierar laktattröskeln genom att hitta punkten med
              maximalt avstånd från baslinjen till den uppmätta laktatkurvan. Detta är särskilt viktigt
              för vältränade atleter med &quot;platta&quot; laktatkurvor, där den traditionella 4 mmol/L-metoden
              kan överskatta tröskeln och leda till överträning.
              R² visar hur väl den polynomiska kurvan passar dina data ({calculations.dmaxVisualization.r2 >= 0.95 ? 'utmärkt' : 'god'} passning).
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
        <section className="mt-6 border-b pb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold mb-4">Tröskelanalys</h2>
          {/* Lactate vs Heart Rate Chart - Primary (most relevant) */}
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

          {/* Lactate vs Speed/Power Chart */}
          <div className="bg-white p-4 rounded-lg border mt-6">
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
      )}

      {/* Träningszoner */}
      <section className="mt-6 border-b pb-6">
        <h2 className="text-2xl font-semibold mb-4">Träningszoner</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Zon</th>
                <th className="px-4 py-2 text-left">Intensitet</th>
                <th className="px-4 py-2 text-left">Puls</th>
                <th className="px-4 py-2 text-left">% av max</th>
                {test.testType === 'RUNNING' ? (
                  <th className="px-4 py-2 text-left">Hastighet</th>
                ) : (
                  <th className="px-4 py-2 text-left">Effekt</th>
                )}
                <th className="px-4 py-2 text-left">Effekt</th>
              </tr>
            </thead>
            <tbody>
              {calculations.trainingZones.map((zone) => (
                <tr key={zone.zone} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    Zon {zone.zone}: {zone.name}
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
      <section className="mt-6 pb-6 print:break-before-page">
        <h2 className="text-2xl font-semibold mb-4">Testdiagram</h2>
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

      {/* Power Zones (endast för cykeltester) */}
      {test.testType === 'CYCLING' && calculations.cyclingData && calculations.cyclingData.powerZones && (
        <section className="mt-6 border-b pb-6">
          <h2 className="text-2xl font-semibold mb-4">Power Zones (baserat på FTP)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Zon</th>
                  <th className="px-4 py-2 text-left">% av FTP</th>
                  <th className="px-4 py-2 text-left">Effekt (watt)</th>
                  <th className="px-4 py-2 text-left">Beskrivning</th>
                </tr>
              </thead>
              <tbody>
                {calculations.cyclingData.powerZones.map((zone) => (
                  <tr key={zone.zone} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">
                      Zon {zone.zone}: {zone.name}
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
        <section className="mt-6 border-b pb-6">
          <h2 className="text-2xl font-semibold mb-4">Löpekonomi</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Hastighet (km/h)</th>
                  <th className="px-4 py-2 text-left">VO₂ (ml/kg/min)</th>
                  <th className="px-4 py-2 text-left">Ekonomi (ml/kg/km)</th>
                  <th className="px-4 py-2 text-left">Bedömning</th>
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

          {/* Running Economy Explanation */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-sm mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Om löpekonomi
            </h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>Löpekonomi</strong> mäter hur effektivt din kropp använder syre vid löpning.
                Värdet anges i ml O₂ per kg kroppsvikt per kilometer (ml/kg/km) och visar hur mycket
                syre som krävs för att springa en kilometer i given hastighet.
              </p>
              <p>
                <strong>Lägre värde = bättre ekonomi.</strong> En löpare med god ekonomi förbrukar
                mindre energi vid samma hastighet jämfört med en löpare med sämre ekonomi.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-800 mb-1">Referensvärden:</p>
                  <ul className="text-xs space-y-1 text-gray-600">
                    <li>• <span className="text-green-600 font-medium">Utmärkt:</span> &lt;180 ml/kg/km</li>
                    <li>• <span className="text-green-600 font-medium">Mycket god:</span> 180-195 ml/kg/km</li>
                    <li>• <span className="text-blue-600 font-medium">God:</span> 195-210 ml/kg/km</li>
                    <li>• <span className="text-yellow-600 font-medium">Acceptabel:</span> 210-230 ml/kg/km</li>
                    <li>• <span className="text-red-600 font-medium">Förbättringspotential:</span> &gt;230 ml/kg/km</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-1">Påverkande faktorer:</p>
                  <ul className="text-xs space-y-1 text-gray-600">
                    <li>• Löpteknik och steglängd</li>
                    <li>• Muskelstyvhet och elasticitet</li>
                    <li>• Kroppsvikt och sammansättning</li>
                    <li>• Skoval och underlag</li>
                    <li>• Träningshistorik och anpassning</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 italic">
                Löpekonomi kan förbättras genom plyometrisk träning, styrketräning för ben och core,
                samt teknisk löpträning med fokus på kadensoptimering.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Pace Zones (Running only) */}
      {test.testType === 'RUNNING' && interpretation.paceZones.length > 0 && (
        <PaceZones paceZones={interpretation.paceZones} />
      )}

      {/* Training Focus */}
      <TrainingFocus trainingFocus={interpretation.trainingFocus} />

      {/* Recommended Next Test Date */}
      {test.recommendedNextTestDate && (
        <section className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-semibold text-blue-900">Rekommenderat nästa test</p>
              <p className="text-blue-800">
                {format(new Date(test.recommendedNextTestDate), 'PPP', { locale: sv })}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t text-sm text-gray-600">
        <p>Rapport genererad: {format(new Date(), 'PPP', { locale: sv })}</p>
        <p className="mt-2">© {new Date().getFullYear()} {organization}</p>
      </footer>
    </div>
  )
}
