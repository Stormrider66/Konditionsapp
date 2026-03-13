import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { AutoOptimizeDashboard } from '@/components/auto-optimize/AutoOptimizeDashboard'
import type { PromptSlot } from '@/lib/auto-optimize/types'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function AutoOptimizePage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  // Only allow admin users
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (!profile || !['ADMIN', 'COACH'].includes(profile.role)) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach`

  // Fetch active variants for all slots
  const slots: PromptSlot[] = ['system', 'outline', 'phase', 'full_program']
  const activeVariants: Record<string, unknown> = {}

  for (const slot of slots) {
    const variant = await prisma.aIModelVersion.findFirst({
      where: {
        modelType: `program_generation_${slot}`,
        status: 'ACTIVE',
      },
      orderBy: { versionNumber: 'desc' },
    })
    activeVariants[slot] = variant
  }

  // Fetch recent iteration snapshots
  const recentSnapshots = await prisma.accuracySnapshot.findMany({
    where: {
      snapshotType: 'auto_optimize_iteration',
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Fetch all variants for the variant list
  const allVariants = await prisma.aIModelVersion.findMany({
    where: {
      modelType: { startsWith: 'program_generation' },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      <AutoOptimizeDashboard
        basePath={basePath}
        activeVariants={JSON.parse(JSON.stringify(activeVariants))}
        recentSnapshots={JSON.parse(JSON.stringify(recentSnapshots))}
        allVariants={JSON.parse(JSON.stringify(allVariants))}
      />
    </div>
  )
}
