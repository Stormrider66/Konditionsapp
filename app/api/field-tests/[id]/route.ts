import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = resolveRequestLocale(request)
  try {
    const user = await requireAuth()
    const { id } = await params

    const fieldTest = await prisma.fieldTest.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!fieldTest) {
      return NextResponse.json({ error: t(locale, 'Field test not found', 'Fälttestet hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(user.id, fieldTest.clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Field test not found', 'Fälttestet hittades inte') }, { status: 404 })
    }

    return NextResponse.json(fieldTest)
  } catch (error) {
    console.error('Error fetching field test:', error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
