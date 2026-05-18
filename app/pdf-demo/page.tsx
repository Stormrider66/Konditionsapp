'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { PDFExportButton } from '@/components/reports/PDFExportButton'
import { performAllCalculations } from '@/lib/calculations'
import { Test, Client, TestStage, TestCalculations, TestType } from '@/types'

const sampleClients: Record<'running' | 'cycling', Client> = {
  running: {
    id: '1',
    userId: 'demo-user',
    name: 'Åsa Östergren',
    gender: 'FEMALE',
    birthDate: new Date('1990-05-15'),
    height: 170,
    weight: 62,
    email: 'asa.ostergren@example.com',
    phone: '070-123 45 67',
    notes: 'Erfaren löpare, mål: förbättra maraton-tid',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  cycling: {
    id: '2',
    userId: 'demo-user',
    name: 'Erik Ängström',
    gender: 'MALE',
    birthDate: new Date('1985-11-22'),
    height: 182,
    weight: 78,
    email: 'erik.angstrom@example.com',
    phone: '070-987 65 43',
    notes: 'Tävlingscyklist, tränar 12h/vecka',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

const sampleRunningStages: TestStage[] = [
  {
    id: '1',
    testId: 'test-1',
    sequence: 0,
    duration: 4,
    heartRate: 145,
    lactate: 1.5,
    vo2: 27.3,
    speed: 8.0,
  },
  {
    id: '2',
    testId: 'test-1',
    sequence: 1,
    duration: 4,
    heartRate: 158,
    lactate: 2.1,
    vo2: 35.2,
    speed: 10.0,
  },
  {
    id: '3',
    testId: 'test-1',
    sequence: 2,
    duration: 4,
    heartRate: 173,
    lactate: 3.8,
    vo2: 42.9,
    speed: 12.0,
  },
  {
    id: '4',
    testId: 'test-1',
    sequence: 3,
    duration: 4,
    heartRate: 182,
    lactate: 6.2,
    vo2: 47.8,
    speed: 13.5,
  },
  {
    id: '5',
    testId: 'test-1',
    sequence: 4,
    duration: 3,
    heartRate: 191,
    lactate: 14.0,
    vo2: 49.2,
    speed: 14.5,
  },
]

const sampleCyclingStages: TestStage[] = [
  {
    id: '1',
    testId: 'test-2',
    sequence: 0,
    duration: 5,
    heartRate: 120,
    lactate: 1.2,
    vo2: 25.0,
    power: 150,
    cadence: 85,
  },
  {
    id: '2',
    testId: 'test-2',
    sequence: 1,
    duration: 5,
    heartRate: 135,
    lactate: 1.8,
    vo2: 32.5,
    power: 200,
    cadence: 90,
  },
  {
    id: '3',
    testId: 'test-2',
    sequence: 2,
    duration: 5,
    heartRate: 150,
    lactate: 2.5,
    vo2: 40.2,
    power: 250,
    cadence: 92,
  },
  {
    id: '4',
    testId: 'test-2',
    sequence: 3,
    duration: 5,
    heartRate: 165,
    lactate: 4.1,
    vo2: 48.7,
    power: 300,
    cadence: 95,
  },
  {
    id: '5',
    testId: 'test-2',
    sequence: 4,
    duration: 5,
    heartRate: 178,
    lactate: 7.8,
    vo2: 55.3,
    power: 350,
    cadence: 98,
  },
  {
    id: '6',
    testId: 'test-2',
    sequence: 5,
    duration: 3,
    heartRate: 186,
    lactate: 12.5,
    vo2: 59.1,
    power: 380,
    cadence: 100,
  },
]

export default function PDFDemoPage() {
  const t = useTranslations('pages.pdfDemo')

  const [reportData, setReportData] = useState<{
    client: Client
    test: Test
    calculations: TestCalculations
  } | null>(null)

  const [testType, setTestType] = useState<TestType>('RUNNING')
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = useCallback(async (type: TestType) => {
    setIsLoading(true)
    setTestType(type)

    try {
      const isRunning = type === 'RUNNING'
      const client = isRunning
        ? {
            ...sampleClients.running,
            notes: t('sampleData.clients.running.notes'),
          }
        : {
            ...sampleClients.cycling,
            notes: t('sampleData.clients.cycling.notes'),
          }
      const stages = type === 'RUNNING' ? sampleRunningStages : sampleCyclingStages

      const test: Test = {
        id: `test-${type.toLowerCase()}`,
        clientId: client.id,
        userId: 'demo-user',
        testDate: new Date('2025-09-15'),
        testType: type,
        status: 'COMPLETED',
        notes: isRunning
          ? t('sampleData.testNotes.running')
          : t('sampleData.testNotes.cycling'),
        testStages: stages,
      }

      const calculations = await performAllCalculations(test, client)

      setReportData({
        client,
        test,
        calculations,
      })
    } catch (error) {
      console.error('Error generating report:', error)
      alert(`${t('errors.title')} ${error instanceof Error ? error.message : t('errors.unknown')}`)
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    generateReport('RUNNING')
  }, [generateReport])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="gradient-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">{t('header.title')}</h1>
          <p className="text-white/90 mt-1">
            {t('header.subtitle')}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:hidden">
          <h2 className="text-2xl font-semibold mb-4">{t('controls.title')}</h2>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => generateReport('RUNNING')}
              disabled={isLoading}
              className={`px-6 py-3 rounded-md font-medium transition ${
                testType === 'RUNNING' && !isLoading
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } disabled:opacity-50`}
            >
              {t('controls.testNames.running')}
            </button>
            <button
              onClick={() => generateReport('CYCLING')}
              disabled={isLoading}
              className={`px-6 py-3 rounded-md font-medium transition ${
                testType === 'CYCLING' && !isLoading
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } disabled:opacity-50`}
            >
              {t('controls.testNames.cycling')}
            </button>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-2">{t('testFacts.title')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>
                {t('testFacts.items.swedishCharacters', {
                  characters: 'åäö, ÅÄÖ',
                  runningClient: sampleClients.running.name,
                  cyclingClient: sampleClients.cycling.name,
                })}
              </li>
              <li>{t('testFacts.items.chartExport')}</li>
              <li>{t('testFacts.items.gradientColors')}</li>
              <li>{t('testFacts.items.tables')}</li>
              <li>{t('testFacts.items.multiPage')}</li>
              <li>{t('testFacts.items.resolution')}</li>
            </ul>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-2">{t('export.title')}</h3>
            <div className="flex gap-4">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                {t('export.print')}
              </button>
              {reportData && (
                <PDFExportButton
                  reportData={{
                    client: reportData.client,
                    test: reportData.test,
                    calculations: reportData.calculations,
                    testLeader: 'Henrik Lundholm',
                    organization: 'Trainomics',
                    reportDate: new Date(),
                  }}
                  variant="default"
                  size="md"
                />
              )}
            </div>
          </div>
        </div>

        {/* Report Display */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('status.loading')}</p>
          </div>
        ) : reportData ? (
          <ReportTemplate
            client={reportData.client}
            test={reportData.test}
            calculations={reportData.calculations}
            testLeader="Henrik Lundholm"
            organization="Trainomics"
          />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600">{t('status.empty')}</p>
          </div>
        )}
      </main>
    </div>
  )
}
