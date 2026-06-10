// app/api/programs/[id]/export/pdf/route.ts
//
// PDF export of the compiled program report. ProgramReportViewer calls
// this with POST; GET is supported for direct links.

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { buildProgramReport } from '@/lib/program-report/build-report'
import { generateProgramPdf } from '@/lib/program-report/program-pdf'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type RouteParams = {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function exportPdf(request: NextRequest, { params }: RouteParams) {
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

    const pdf = generateProgramPdf(result.report)
    const filename = `${result.report.name.replace(/[^a-zA-Z0-9åäöÅÄÖ _-]/g, '')}-program.pdf`

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logError('Error exporting program PDF', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to export PDF', 'Kunde inte exportera PDF') },
      { status: 500 }
    )
  }
}

export { exportPdf as GET, exportPdf as POST }
