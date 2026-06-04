/**
 * Single System Strength Template API
 *
 * GET - Get a specific system template by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTemplateById } from '@/lib/training-engine/templates/strength-templates'
import { logError } from '@/lib/logger-console'
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
    const { id } = await params
    const template = getTemplateById(id)

    if (!template) {
      return NextResponse.json(
        { error: t(locale, 'Template not found', 'Mallen hittades inte') },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    logError('Error fetching system template:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch template', 'Kunde inte hämta mall') },
      { status: 500 }
    )
  }
}
