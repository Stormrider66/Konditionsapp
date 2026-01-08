import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { getClientZones } from '@/lib/api/zones'
import { canAccessProgram } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: programId } = await params

    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const program = await prisma.trainingProgram.findUnique({
      where: { id: programId },
      select: { clientId: true }
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const zones = await getClientZones(program.clientId)
    
    return NextResponse.json({ zones })
  } catch (error) {
    return handleApiError(error)
  }
}


