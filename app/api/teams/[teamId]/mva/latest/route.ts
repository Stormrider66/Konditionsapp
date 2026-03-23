import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { loadLatestModel, loadLatestPLSModel } from '@/lib/mva/model-storage'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params

    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify team ownership
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: { id: true },
    })
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    // Check coach subscription (PRO/ENTERPRISE)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    })
    if (!subscription || !['PRO', 'ENTERPRISE'].includes(subscription.tier)) {
      return NextResponse.json(
        { success: false, error: 'PRO-prenumeration krävs för multivariat analys' },
        { status: 403 }
      )
    }

    // Check for modelType query param
    const url = new URL(request.url)
    const modelType = url.searchParams.get('modelType')

    if (modelType === 'PLS') {
      const model = await loadLatestPLSModel(teamId)
      return NextResponse.json({
        success: true,
        data: model,
      })
    }

    // Default: PCA
    const model = await loadLatestModel(teamId)

    if (!model) {
      return NextResponse.json({
        success: true,
        data: null,
      })
    }

    return NextResponse.json({
      success: true,
      data: model,
    })
  } catch (error) {
    console.error('MVA latest error:', error)
    return NextResponse.json(
      { success: false, error: 'Serverfel vid hämtning av modell' },
      { status: 500 }
    )
  }
}
