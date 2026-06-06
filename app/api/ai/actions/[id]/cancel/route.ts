import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { cancelAiActionDraft } from '@/lib/ai/capabilities/action-drafts'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params
    const result = await cancelAiActionDraft(id, user.id, locale)
    if (!result.success) {
      return NextResponse.json(result, { status: result.status || 400 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('AI action cancel error:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not cancel the action', 'Kunde inte avbryta åtgärden') },
      { status: 500 }
    )
  }
}
