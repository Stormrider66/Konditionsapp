// app/api/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/templates - Get all templates for logged-in user, optionally filtered by testType
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const testType = searchParams.get('testType')

    const templates = await prisma.testTemplate.findMany({
      where: {
        userId: user.id,
        ...(testType ? { testType: testType as any } : {}),
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: templates,
    })
  } catch (error) {
    logger.error('Error fetching templates', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch templates',
      },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create new template
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, testType, description, stages } = body

    if (!name || !testType || !stages) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name, testType, and stages are required',
        },
        { status: 400 }
      )
    }

    const template = await prisma.testTemplate.create({
      data: {
        userId: user.id,
        name,
        testType,
        description: description || null,
        stages: stages,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: template,
        message: 'Template created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating template', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create template',
      },
      { status: 500 }
    )
  }
}
