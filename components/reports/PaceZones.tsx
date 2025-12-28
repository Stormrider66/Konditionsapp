'use client'

import { PaceZone } from '@/lib/calculations/interpretations'

interface PaceZonesProps {
  paceZones: PaceZone[]
}

export function PaceZones({ paceZones }: PaceZonesProps) {
  if (paceZones.length === 0) {
    return null
  }

  return (
    <section className="mt-6 border-b pb-6 print:break-inside-avoid">
      <h2 className="text-2xl font-semibold mb-4">Praktiska Tempozoner</h2>

      <p className="text-sm text-gray-600 mb-4">
        Baserat pa dina troskelvarden, rekommenderade tempo for olika traningstyper:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Traningstyp</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tempo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Zon</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 hidden md:table-cell">Beskrivning</th>
            </tr>
          </thead>
          <tbody>
            {paceZones.map((zone, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{zone.name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-lg font-semibold text-blue-700">
                    {zone.paceMin === zone.paceMax
                      ? `${zone.paceMin} /km`
                      : `${zone.paceMin} - ${zone.paceMax} /km`
                    }
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    zone.zone?.includes('5') ? 'bg-red-100 text-red-700' :
                    zone.zone?.includes('4') ? 'bg-orange-100 text-orange-700' :
                    zone.zone?.includes('3') ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {zone.zone}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                  {zone.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-blue-800">
            Dessa tempo ar beraknade fran dina individuella troskelvarden. Pulszoner ger mer exakt styrning under traning, sarskilt vid varierande forhallanden.
          </p>
        </div>
      </div>
    </section>
  )
}
