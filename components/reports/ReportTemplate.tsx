'use client'

import { Client, TestCalculations, Test } from '@/types'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { TestChart } from '../charts/TestChart'
import { PowerChart } from '../charts/PowerChart'

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
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-gray-600 text-sm">VO₂max</p>
            <p className="text-2xl font-bold text-green-700">{calculations.vo2max} ml/kg/min</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-gray-600 text-sm">Max Laktat</p>
            <p className="text-2xl font-bold text-red-700">{calculations.maxLactate} mmol/L</p>
          </div>
        </div>

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
              <h3 className="font-semibold text-lg mb-2">Aerob Tröskel (≈2 mmol/L)</h3>
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
              </div>
            </div>
          )}

          {/* Anaerob tröskel */}
          {calculations.anaerobicThreshold && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-lg mb-2">Anaerob Tröskel (≈4 mmol/L)</h3>
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
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Träningszoner */}
      <section className="mt-6 border-b pb-6">
        <h2 className="text-2xl font-semibold mb-4">Träningszoner (Garmin 5-zons modell)</h2>
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
