import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { getClientZones } from '@/lib/api/zones'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id: programId } = await params

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


