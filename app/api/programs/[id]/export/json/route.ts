// app/api/programs/[id]/export/json/route.ts
//
// JSON export of the compiled program report (downloaded as a file by
// ProgramReportViewer).

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { buildProgramReport } from '@/lib/program-report/build-report'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type RouteParams = {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params
    const result = await buildProgramReport(id)
    if (!result) {
      return NextResponse.json(
        { error: t(locale, 'Program not found', 'Programmet hittades inte') },
        { status: 404 }
      )
    }

    const hasAccess = await canAccessClient(user.id, result.clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: result.report })
  } catch (error) {
    logError('Error exporting program JSON', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to export program', 'Kunde inte exportera programmet') },
      { status: 500 }
    )
  }
}
