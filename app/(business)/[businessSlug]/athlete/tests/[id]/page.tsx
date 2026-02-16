// app/(business)/[businessSlug]/athlete/tests/[id]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ReportTemplate } from '@/components/reports/ReportTemplate'
import { PDFExportButton } from '@/components/reports/PDFExportButton'
import type { TestCalculations, Threshold, TrainingZone } from '@/types'
import { VisualReportCard } from '@/components/visual-reports/VisualReportCard'

interface BusinessTestDetailPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessAthleteTestDetailPage({ params }: BusinessTestDetailPageProps) {
  const { businessSlug, id } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

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
          <Link href={`${basePath}/athlete/tests`}>
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
              testLeader: test.testLeader || 'Trainomics',
              organization: 'Trainomics',
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
          testLeader={test.testLeader || 'Trainomics'}
          organization="Trainomics"
        />

        {/* Visual test report (read-only for athletes) */}
        <div className="mt-8">
          <VisualReportCard
            clientId={test.clientId}
            reportType="test-report"
            testId={test.id}
            readOnly
          />
        </div>
      </main>
    </div>
  )
}
