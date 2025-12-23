// app/tests/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { PDFExportButton } from '@/components/reports/PDFExportButton'
import { ShareReportButton } from '@/components/reports/ShareReportButton'
import { Button } from '@/components/ui/button'
import { Home, User, Printer, ArrowLeft, Edit2 } from 'lucide-react'
import type { Test, Client, TestCalculations, Threshold, TrainingZone } from '@/types'

export default function TestDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [test, setTest] = useState<Test | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [calculations, setCalculations] = useState<TestCalculations | null>(null)

  const fetchTest = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tests/${id}`)
      const result = await response.json()

      if (result.success && result.data) {
        const testData = result.data
        setTest(testData)
        setClient(testData.client)

        // Convert saved calculations from JSON to TypeScript objects
        const client = testData.client
        const bmi = client ? (client.weight / ((client.height / 100) ** 2)) : 0

        const calculationsData: TestCalculations = {
          bmi,
          vo2max: testData.vo2max || 0,
          maxHR: testData.maxHR || 0,
          maxLactate: testData.maxLactate || 0,
          aerobicThreshold: testData.aerobicThreshold as Threshold | null,
          anaerobicThreshold: testData.anaerobicThreshold as Threshold | null,
          trainingZones: (testData.trainingZones as TrainingZone[]) || [],
        }

        setCalculations(calculationsData)
      } else {
        setError(result.error || 'Test not found')
      }
    } catch (err) {
      setError('Network error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTest()
  }, [fetchTest])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="gradient-primary text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Star by Thomson</h1>
            <p className="text-white/90 mt-1">Testrapport</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-gray-600">Laddar testrapport...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !test || !client || !calculations) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="gradient-primary text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Star by Thomson</h1>
            <p className="text-white/90 mt-1">Testrapport</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Fel</h2>
            <p className="text-red-700">{error || 'Kunde inte ladda test'}</p>
          </div>
          <div className="mt-6 flex gap-4">
            <Link href="/">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Hem
              </Button>
            </Link>
            <Link href="/clients">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka till klienter
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="gradient-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Star by Thomson</h1>
          <p className="text-white/90 mt-1">Testrapport - {client.name}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4 flex gap-4 print:hidden flex-wrap">
          <Link href="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Hem
            </Button>
          </Link>
          <Link href={`/clients/${client.id}`}>
            <Button variant="outline">
              <User className="w-4 h-4 mr-2" />
              Testhistorik
            </Button>
          </Link>
          <Link href={`/tests/${test.id}/edit`}>
            <Button variant="outline">
              <Edit2 className="w-4 h-4 mr-2" />
              Redigera
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Skriv ut
          </Button>
          <PDFExportButton
            reportData={{
              client,
              test,
              calculations,
              testLeader: 'Henrik Lundholm',
              organization: 'Star by Thomson',
              reportDate: new Date(test.testDate),
            }}
            variant="default"
            size="md"
          />
          <ShareReportButton
            testId={test.id}
            hasExistingLink={!!test.publicToken}
            existingToken={test.publicToken || undefined}
          />
        </div>

        <ReportTemplate
          client={client}
          test={test}
          calculations={calculations}
          testLeader="Henrik Lundholm"
          organization="Star by Thomson"
        />
      </main>
    </div>
  )
}
