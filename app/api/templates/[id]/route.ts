// app/api/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { createClient } from '@/lib/supabase/server'

// DELETE /api/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify template belongs to user
    const template = await prisma.testTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
        },
        { status: 404 }
      )
    }

    if (template.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - template does not belong to you',
        },
        { status: 403 }
      )
    }

    await prisma.testTemplate.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete template',
      },
      { status: 500 }
    )
  }
}
