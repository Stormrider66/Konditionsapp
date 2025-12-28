'use client'

interface StrengthsWeaknessesProps {
  strengths: string[]
  weaknesses: string[]
}

export function StrengthsWeaknesses({ strengths, weaknesses }: StrengthsWeaknessesProps) {
  if (strengths.length === 0 && weaknesses.length === 0) {
    return null
  }

  return (
    <section className="mt-6 border-b pb-6 print:break-inside-avoid">
      <h2 className="text-2xl font-semibold mb-4">Sammanfattad bedomning</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="bg-green-50 p-5 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Styrkor
            </h3>
            <ul className="space-y-2">
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-green-900">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses / Development Areas */}
        {weaknesses.length > 0 && (
          <div className="bg-orange-50 p-5 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Utvecklingsomraden
            </h3>
            <ul className="space-y-2">
              {weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-orange-900">{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Context note */}
      <p className="mt-4 text-xs text-gray-500 italic">
        Bedomningen baseras pa testresultaten i forhallande till alder, kon och referensvarden for motionarer och elitidrottare.
      </p>
    </section>
  )
}
