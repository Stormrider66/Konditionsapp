import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { confirmAiActionDraft } from '@/lib/ai/capabilities/action-executor'
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
    const body = await request.json().catch(() => null) as { inputOverride?: unknown } | null
    const result = await confirmAiActionDraft(id, user.id, locale, {
      inputOverride: body?.inputOverride,
    })
    if (!result.success) {
      return NextResponse.json(result, { status: result.status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('AI action confirm error:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not confirm the action', 'Kunde inte bekräfta åtgärden') },
      { status: 500 }
    )
  }
}
