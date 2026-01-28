'use client'

import { useState } from 'react'
import { performAllCalculations } from '@/lib/calculations'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { Test, Client, TestStage } from '@/types'

export default function CyclingTestPage() {
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const sampleClient: Client = {
    id: '1',
    userId: 'user-1',
    name: 'Emma Andersson',
    gender: 'FEMALE',
    birthDate: new Date('1988-05-15'),
    height: 168,
    weight: 62,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const handleGenerateReport = async () => {

    // Realistisk FTP-test data för en vältränad kvinnlig cyklist
    const testStages: TestStage[] = [
      {
        id: '1',
        testId: 'cycling-test-1',
        sequence: 0,
        duration: 4,
        heartRate: 125,
        lactate: 1.5,
        vo2: 32.0,
        power: 100,
        cadence: 90,
      },
      {
        id: '2',
        testId: 'cycling-test-1',
        sequence: 1,
        duration: 4,
        heartRate: 142,
        lactate: 2.1,
        vo2: 38.5,
        power: 150,
        cadence: 92,
      },
      {
        id: '3',
        testId: 'cycling-test-1',
        sequence: 2,
        duration: 4,
        heartRate: 158,
        lactate: 3.2,
        vo2: 44.2,
        power: 180,
        cadence: 90,
      },
      {
        id: '4',
        testId: 'cycling-test-1',
        sequence: 3,
        duration: 4,
        heartRate: 170,
        lactate: 4.5,
        vo2: 49.8,
        power: 210,
        cadence: 88,
      },
      {
        id: '5',
        testId: 'cycling-test-1',
        sequence: 4,
        duration: 4,
        heartRate: 178,
        lactate: 6.8,
        vo2: 53.1,
        power: 230,
        cadence: 86,
      },
      {
        id: '6',
        testId: 'cycling-test-1',
        sequence: 5,
        duration: 3,
        heartRate: 186,
        lactate: 12.5,
        vo2: 55.2,
        power: 250,
        cadence: 82,
      },
    ]

    const test: Test = {
      id: 'cycling-test-1',
      clientId: sampleClient.id,
      userId: 'user-1',
      testDate: new Date('2025-10-14'),
      testType: 'CYCLING',
      status: 'COMPLETED',
      testStages,
    }

    try {
      const calculations = await performAllCalculations(test, sampleClient)

      setReportData({
        client: sampleClient,
        test,
        calculations,
      })
      setShowReport(true)
    } catch (error) {
      console.error('Fel vid cykelberäkningar:', error)
      alert(`Fel: ${error instanceof Error ? error.message : 'Okänt fel'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="gradient-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Star by Thomson</h1>
          <p className="text-white/90 mt-1">Cykeltest Demo</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!showReport ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Testa Cykelberäkningar</h2>
            <p className="text-gray-600 mb-4">
              Klicka på knappen nedan för att generera en cykeltestreport med realistisk FTP-testdata.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Sample Data:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Klient: Emma Andersson (Kvinna, 37 år)</li>
                <li>• Vikt: 62 kg</li>
                <li>• Test: 6 steg från 100W till 250W</li>
                <li>• Förväntad FTP: ~200-210W (3.2-3.4 W/kg)</li>
                <li>• Nivå: Vältränad cyklist</li>
              </ul>
            </div>

            <button
              onClick={handleGenerateReport}
              className="w-full py-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-xl font-semibold rounded-md hover:opacity-90 transition"
            >
              Generera Cykelrapport
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex gap-4">
              <button
                onClick={() => setShowReport(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Tillbaka
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 gradient-primary text-white rounded-md hover:opacity-90"
              >
                Skriv ut / Spara som PDF
              </button>
            </div>
            {reportData && (
              <ReportTemplate
                client={reportData.client}
                test={reportData.test}
                calculations={reportData.calculations}
                testLeader="Henrik Lundholm"
                organization="Star by Thomson"
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
