'use client'

import { Client, TestCalculations, Test } from '@/types'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { TestChart } from '../charts/TestChart'
import { PowerChart } from '../charts/PowerChart'
import { DmaxCurveChart } from '../charts/DmaxCurveChart'

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
  const birthDate = client.birthDate instanceof Date ? client.birthDate : new Date(client.birthDate as unknown as string)
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 print:p-4" data-pdf-content>
      {/* Header */}
      <header className="gradient-primary text-white p-6 rounded-t-lg print:rounded-none">
        <h1 className="text-3xl font-bold">{organization}</h1>
        <p className="text-lg mt-2">Konditionstestrapport</p>
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
        </div>
      </section>

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

        {/* D-max Explanation */}
        {((calculations.anaerobicThreshold as any)?.method === 'DMAX' ||
          (calculations.anaerobicThreshold as any)?.method === 'MOD_DMAX') && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Om D-max metoden
            </h4>
            <p className="text-sm text-gray-700">
              D-max är en matematisk metod som identifierar laktattrö skeln genom att hitta punkten med
              maximalt avstånd från baslinjen till den uppmätta laktatkurvan. Detta ger en mer individualiserad
              och exakt tröskel än den traditionella 4 mmol/L-metoden.
              R² visar hur väl den polynomiska kurvan passar dina data ({((calculations.anaerobicThreshold as any).r2 >= 0.95 ? 'utmärkt' : 'god')} passning).
            </p>
          </div>
        )}
      </section>

      {/* D-max Curve Visualization */}
      {((calculations.anaerobicThreshold as any)?.method === 'DMAX' ||
        (calculations.anaerobicThreshold as any)?.method === 'MOD_DMAX') &&
        (calculations.anaerobicThreshold as any)?.coefficients && (
        <section className="mt-6 border-b pb-6 print:break-inside-avoid">
          <h2 className="text-2xl font-semibold mb-4">D-max Analys</h2>
          <div className="bg-white p-4 rounded-lg border">
            <DmaxCurveChart
              stages={test.testStages}
              dmaxResult={calculations.anaerobicThreshold as any}
              intensityUnit={(calculations.anaerobicThreshold as any)?.unit}
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
