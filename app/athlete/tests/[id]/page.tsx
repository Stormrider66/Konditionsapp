// app/athlete/tests/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download } from 'lucide-react'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { PDFExportButton } from '@/components/reports/PDFExportButton'
import type { TestCalculations, Threshold, TrainingZone } from '@/types'

interface AthleteTestDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AthleteTestDetailPage({ params }: AthleteTestDetailPageProps) {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  const { id } = await params

  // Fetch test with stages and client data
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      testStages: {
        orderBy: { sequence: 'asc' },
      },
      client: true,
    },
  })

  // Verify test belongs to this athlete
  if (!test || test.clientId !== clientId) {
    notFound()
  }

  // Build calculations object matching what ReportTemplate expects
  const client = test.client
  const bmi = client.weight && client.height
    ? parseFloat((client.weight / ((client.height / 100) ** 2)).toFixed(1))
    : 0

  const calculations: TestCalculations = {
    bmi,
    vo2max: test.vo2max || 0,
    maxHR: test.maxHR || 0,
    maxLactate: test.maxLactate || 0,
    aerobicThreshold: test.aerobicThreshold as unknown as Threshold | null,
    anaerobicThreshold: test.anaerobicThreshold as unknown as Threshold | null,
    trainingZones: (test.trainingZones as unknown as TrainingZone[]) || [],
    // Include optional data if available
    economyData: (test as any).economyData || undefined,
    cyclingData: (test as any).cyclingData || undefined,
    dmaxVisualization: (test as any).dmaxVisualization || undefined,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="container mx-auto px-4 py-4 print:hidden">
        <div className="flex flex-wrap gap-3">
          <Link href="/athlete/tests">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tillbaka till tester
            </Button>
          </Link>
          <PDFExportButton
            reportData={{
              client: client as any,
              test: test as any,
              calculations,
              testLeader: test.testLeader || 'Star by Thomson',
              organization: 'Star by Thomson',
              reportDate: new Date(test.testDate),
            }}
            variant="default"
            size="md"
          />
        </div>
      </div>

      {/* Report Content */}
      <main className="container mx-auto px-4 pb-8">
        <ReportTemplate
          client={client as any}
          test={test as any}
          calculations={calculations}
          testLeader={test.testLeader || 'Star by Thomson'}
          organization="Star by Thomson"
        />
      </main>
    </div>
  )
}
