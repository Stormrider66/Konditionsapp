import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { sendAthletePlatformInvite } from '@/lib/athlete-platform-invite'
import { handleApiError } from '@/lib/api-error'

type RouteParams = {
  params: Promise<{ clientId: string }>
}

// POST /api/athlete-accounts/[clientId]/invite
// Resend access for an existing athlete account. The client profile email is
// the source of truth and is synced to Prisma User + Supabase Auth first.
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const coach = await requireCoach()
    const { clientId } = await params

    const hasAccess = await canAccessClient(coach.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this client' },
        { status: 403 }
      )
    }

    const result = await sendAthletePlatformInvite(clientId, coach.id)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Kunde inte skicka inbjudan' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      emailSent: result.emailSent,
      email: result.email,
      syncedEmail: result.syncedEmail,
      syncedName: result.syncedName,
      message: `Inbjudan skickad till ${result.email}`,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/athlete-accounts/[clientId]/invite')
  }
}
