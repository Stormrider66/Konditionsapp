/**
 * Coach Dashboard Template item operations.
 * DELETE /api/coach/dashboard-templates/:id
 */

import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireCoach()
  const { id } = await params

  const template = await prisma.coachDashboardTemplate.findUnique({
    where: { id },
    select: { businessId: true },
  })
  if (!template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify coach belongs to the business this template lives in
  const membership = await prisma.businessMember.findFirst({
    where: { businessId: template.businessId, userId: user.id, isActive: true },
  })
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.coachDashboardTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
