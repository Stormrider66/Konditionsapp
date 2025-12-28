'use client'

import { TrainingFocus as TrainingFocusType } from '@/lib/calculations/interpretations'

interface TrainingFocusProps {
  trainingFocus: TrainingFocusType
}

export function TrainingFocus({ trainingFocus }: TrainingFocusProps) {
  return (
    <section className="mt-6 border-b pb-6 print:break-inside-avoid">
      <h2 className="text-2xl font-semibold mb-4">Traningsfokus</h2>

      <p className="text-sm text-gray-600 mb-4">
        Baserat pa dina testresultat rekommenderas fokus pa foljande omraden:
      </p>

      <div className="space-y-4">
        {/* Primary Focus */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Primärt fokus</span>
              </div>
              <h3 className="font-semibold text-lg text-blue-900">{trainingFocus.primaryFocus}</h3>
              <p className="text-sm text-blue-800 mt-1">{trainingFocus.primaryRationale}</p>
            </div>
          </div>
        </div>

        {/* Secondary Focus */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mr-4">
              <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Sekundart fokus</span>
              </div>
              <h3 className="font-semibold text-lg text-slate-800">{trainingFocus.secondaryFocus}</h3>
              <p className="text-sm text-slate-700 mt-1">{trainingFocus.secondaryRationale}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Box - Drive to coaching */}
      <div className="mt-6 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-indigo-900 mb-1">
              Vill du ha ett skraddarsytt traningsprogram?
            </h4>
            <p className="text-sm text-indigo-800">
              Kontakta din coach for personlig programlaggning baserad pa dessa testresultat.
              Ett individuellt anpassat program optimerar din traning och hjalper dig na dina mal snabbare.
            </p>
          </div>
        </div>
      </div>

      {/* Follow-up recommendation */}
      <div className="mt-4 flex items-center text-sm text-gray-600">
        <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        <span>Rekommenderad uppfoljning: <strong>{trainingFocus.followUpWeeks} veckor</strong></span>
      </div>
    </section>
  )
}
