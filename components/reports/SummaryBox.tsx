'use client'

import { TestCalculations, Client, TestType } from '@/types'
import { VO2maxInterpretation, AthleteTypeClassification } from '@/lib/calculations/interpretations'

interface SummaryBoxProps {
  calculations: TestCalculations
  client: Client
  testType: TestType
  vo2maxInterpretation: VO2maxInterpretation | null
  athleteType: AthleteTypeClassification
  primaryStrength?: string
}

export function SummaryBox({
  calculations,
  client,
  testType,
  vo2maxInterpretation,
  athleteType,
  primaryStrength
}: SummaryBoxProps) {
  // Get best economy if available
  const bestEconomy = calculations.economyData && calculations.economyData.length > 0
    ? Math.min(...calculations.economyData.map(e => e.economy))
    : null

  const economyEval = bestEconomy
    ? bestEconomy < 200 ? 'Utmarkt' :
      bestEconomy < 210 ? 'Mycket god' :
      bestEconomy < 220 ? 'God' :
      bestEconomy < 240 ? 'Acceptabel' : 'Kan forbattras'
    : null

  // Determine intensity unit label
  const intensityLabel = testType === 'RUNNING' ? 'km/h' :
                         testType === 'CYCLING' ? 'watt' : 'min/km'

  return (
    <section className="mt-6 border-b pb-6 print:break-inside-avoid">
      <h2 className="text-2xl font-semibold mb-4">Testsammanfattning</h2>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* VO2max */}
        <div className={`p-4 rounded-lg border ${
          vo2maxInterpretation
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <p className="text-gray-600 text-sm">VO₂max</p>
          {calculations.vo2max && calculations.vo2max > 0 ? (
            <>
              <p className="text-2xl font-bold text-blue-700">
                {calculations.vo2max} <span className="text-sm font-normal">ml/kg/min</span>
              </p>
              {vo2maxInterpretation && (
                <div className="flex items-center mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    vo2maxInterpretation.classification === 'Overlagsen' ? 'bg-green-200 text-green-800' :
                    vo2maxInterpretation.classification === 'Utmarkt' ? 'bg-green-100 text-green-700' :
                    vo2maxInterpretation.classification === 'God' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {vo2maxInterpretation.classification}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {vo2maxInterpretation.percentile}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 italic mt-1">Ej matt</p>
          )}
        </div>

        {/* Anaerobic Threshold */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-gray-600 text-sm">Anaerob Troskel</p>
          {calculations.anaerobicThreshold ? (
            <>
              <p className="text-2xl font-bold text-orange-700">
                {calculations.anaerobicThreshold.heartRate} <span className="text-sm font-normal">slag/min</span>
              </p>
              <div className="text-sm text-gray-600 mt-1">
                <span>@ {calculations.anaerobicThreshold.value} {intensityLabel}</span>
                <span className="mx-2">|</span>
                <span className={`font-medium ${
                  calculations.anaerobicThreshold.percentOfMax > 88 ? 'text-green-600' :
                  calculations.anaerobicThreshold.percentOfMax > 85 ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {calculations.anaerobicThreshold.percentOfMax}% av max
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 italic mt-1">Ej beraknad</p>
          )}
        </div>

        {/* Running Economy / Cycling Power */}
        {testType === 'RUNNING' ? (
          <div className={`p-4 rounded-lg border ${
            bestEconomy ? 'bg-cyan-50 border-cyan-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <p className="text-gray-600 text-sm">Lopekonomi</p>
            {bestEconomy ? (
              <>
                <p className="text-2xl font-bold text-cyan-700">
                  {bestEconomy} <span className="text-sm font-normal">ml/kg/km</span>
                </p>
                <div className="flex items-center mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    economyEval === 'Utmarkt' ? 'bg-green-200 text-green-800' :
                    economyEval === 'Mycket god' ? 'bg-green-100 text-green-700' :
                    economyEval === 'God' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {economyEval}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic mt-1">Kraver VO₂-data</p>
            )}
          </div>
        ) : testType === 'CYCLING' && calculations.cyclingData ? (
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-gray-600 text-sm">Effekt/Vikt</p>
            <p className="text-2xl font-bold text-purple-700">
              {calculations.cyclingData.wattsPerKg} <span className="text-sm font-normal">W/kg</span>
            </p>
            <div className="flex items-center mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                {calculations.cyclingData.evaluation}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-600 text-sm">Max Laktat</p>
            <p className="text-2xl font-bold text-red-700">
              {calculations.maxLactate.toFixed(1)} <span className="text-sm font-normal">mmol/L</span>
            </p>
          </div>
        )}
      </div>

      {/* Athlete Profile Bar */}
      <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <span className="text-sm text-gray-500">Atletprofil:</span>
            <span className="ml-2 font-semibold text-slate-800">{athleteType.typeName}</span>
            <span className="ml-2 text-sm text-gray-600">
              – {athleteType.suitableDistances.slice(0, 2).join(', ')}
            </span>
          </div>
          {primaryStrength && (
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-green-700">{primaryStrength}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
