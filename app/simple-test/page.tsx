'use client'

import { useState } from 'react'
import { performAllCalculations } from '@/lib/calculations'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { PDFExportButton } from '@/components/reports/PDFExportButton'
import { Test, Client, TestStage } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Printer, Rocket } from 'lucide-react'
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  subtitle: string
  cardTitle: string
  description: string
  generate: string
  reportGenerated: string
  reportReady: string
  errorTitle: string
  unknownError: string
  back: string
  print: string
}> = {
  en: {
    subtitle: 'Simple Test',
    cardTitle: 'Test the calculation engine',
    description: 'Click the button below to generate a test report with predefined data.',
    generate: 'Generate Test Report',
    reportGenerated: 'Report generated!',
    reportReady: 'The test results have been calculated and the report is ready.',
    errorTitle: 'Error',
    unknownError: 'Unknown error',
    back: 'Back',
    print: 'Print',
  },
  sv: {
    subtitle: 'Enkel Test',
    cardTitle: 'Testa beräkningsmotorn',
    description: 'Klicka på knappen nedan för att generera en testrapport med fördefinierad data.',
    generate: 'Generera Testrapport',
    reportGenerated: 'Rapport genererad!',
    reportReady: 'Testresultaten har beräknats och rapporten är klar.',
    errorTitle: 'Fel',
    unknownError: 'Okänt fel',
    back: 'Tillbaka',
    print: 'Skriv ut',
  },
}

type ReportData = {
  client: Client
  test: Test
  calculations: Awaited<ReturnType<typeof performAllCalculations>>
}

export default function SimpleTestPage() {
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]

  const sampleClient: Client = {
    id: '1',
    userId: 'user-1',
    name: 'Joakim Hällgren',
    gender: 'MALE',
    birthDate: new Date('1992-01-01'),
    height: 186,
    weight: 88,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const handleGenerateReport = async () => {

    const testStages: TestStage[] = [
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

    const test: Test = {
      id: 'test-1',
      clientId: sampleClient.id,
      userId: 'user-1',
      testDate: new Date('2025-09-02'),
      testType: 'RUNNING',
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
      toast({
        title: copy.reportGenerated,
        description: copy.reportReady,
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: copy.errorTitle,
        description: `${copy.errorTitle}: ${error instanceof Error ? error.message : copy.unknownError}`,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="gradient-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Trainomics</h1>
          <p className="text-white/90 mt-1">{copy.subtitle}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!showReport ? (
          <Card>
            <CardHeader>
              <CardTitle>{copy.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                {copy.description}
              </p>
              <Button
                onClick={() => void handleGenerateReport()}
                size="lg"
                className="w-full"
              >
                <Rocket className="w-5 h-5 mr-2" />
                {copy.generate}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="mb-4 flex gap-4 print:hidden">
              <Button variant="outline" onClick={() => setShowReport(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {copy.back}
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                {copy.print}
              </Button>
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
            {reportData && (
              <ReportTemplate
                client={reportData.client}
                test={reportData.test}
                calculations={reportData.calculations}
                testLeader="Henrik Lundholm"
                organization="Trainomics"
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
