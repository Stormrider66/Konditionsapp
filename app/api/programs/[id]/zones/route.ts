import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { getClientZones } from '@/lib/api/zones'
import { canAccessProgram } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: programId } = await params

    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const program = await prisma.trainingProgram.findUnique({
      where: { id: programId },
      select: { clientId: true }
    })

    if (!program) {
      return NextResponse.json({ error: t(locale, 'Program not found', 'Programmet hittades inte') }, { status: 404 })
    }

    const zones = await getClientZones(program.clientId)
    
    return NextResponse.json({ zones })
  } catch (error) {
    return handleApiError(error)
  }
}

