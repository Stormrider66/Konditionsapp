import { notFound } from 'next/navigation'
import { AICanvasClient } from '@/components/ai-canvas/AICanvasClient'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessAICanvasPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    notFound()
  }

  const canvases = await prisma.aICanvas.findMany({
    where: {
      businessId: membership.businessId,
      ownerUserId: user.id,
      status: 'DRAFT',
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { blocks: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  })

  return (
    <AICanvasClient
      businessSlug={businessSlug}
      initialCanvases={canvases.map((canvas) => ({
        id: canvas.id,
        title: canvas.title,
        createdAt: canvas.createdAt.toISOString(),
        updatedAt: canvas.updatedAt.toISOString(),
        blockCount: canvas._count.blocks,
      }))}
    />
  )
}
