/**
 * /api/data-moat/prompts
 *
 * Data Moat Phase 4: AI Prompt Management
 * Manages prompt templates with version history and A/B testing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPromptSchema = z.object({
  promptName: z.string().min(1).max(100),
  promptCategory: z.string().min(1),
  systemPrompt: z.string().min(10),
  userPromptTemplate: z.string().optional(),
  outputFormat: z.record(z.any()).optional(),
  description: z.string().optional(),
  variables: z.array(z.string()).optional(),
  abTestGroup: z.string().optional(),
  abTestWeight: z.number().min(0).max(1).optional(),
})

const updatePromptSchema = z.object({
  systemPrompt: z.string().min(10).optional(),
  userPromptTemplate: z.string().optional(),
  outputFormat: z.record(z.any()).optional(),
  description: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  abTestGroup: z.string().optional(),
  abTestWeight: z.number().min(0).max(1).optional(),
})

const listQuerySchema = z.object({
  promptName: z.string().optional(),
  promptCategory: z.string().optional(),
  isActive: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET: List prompt templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      promptName: searchParams.get('promptName') || undefined,
      promptCategory: searchParams.get('promptCategory') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '20', 10), 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (query.promptName) {
      where.promptName = { contains: query.promptName, mode: 'insensitive' }
    }

    if (query.promptCategory) {
      where.promptCategory = query.promptCategory
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true'
    }

    const [prompts, total] = await Promise.all([
      prisma.aIPromptTemplate.findMany({
        where,
        orderBy: [{ promptName: 'asc' }, { version: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          promptName: true,
          promptCategory: true,
          version: true,
          description: true,
          variables: true,
          isActive: true,
          activatedAt: true,
          usageCount: true,
          avgResponseQuality: true,
          abTestGroup: true,
          abTestWeight: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.aIPromptTemplate.count({ where }),
    ])

    // Get unique prompt names with their active version
    const activePrompts = await prisma.aIPromptTemplate.findMany({
      where: { isActive: true },
      select: {
        promptName: true,
        version: true,
        usageCount: true,
        avgResponseQuality: true,
      },
    })

    return NextResponse.json({
      prompts,
      activePrompts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching prompts:', error)
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
  }
}

// POST: Create new prompt template (creates new version if name exists)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createPromptSchema.parse(body)

    // Find existing versions of this prompt
    const existingVersions = await prisma.aIPromptTemplate.findMany({
      where: { promptName: validatedData.promptName },
      orderBy: { version: 'desc' },
      take: 1,
    })

    const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1
    const previousVersionId = existingVersions.length > 0 ? existingVersions[0].id : null

    const prompt = await prisma.aIPromptTemplate.create({
      data: {
        promptName: validatedData.promptName,
        promptCategory: validatedData.promptCategory,
        version: nextVersion,
        systemPrompt: validatedData.systemPrompt,
        userPromptTemplate: validatedData.userPromptTemplate,
        outputFormat: validatedData.outputFormat,
        description: validatedData.description,
        variables: validatedData.variables || [],
        abTestGroup: validatedData.abTestGroup,
        abTestWeight: validatedData.abTestWeight,
        previousVersionId,
        isActive: false, // New versions start inactive
      },
    })

    return NextResponse.json(prompt, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error creating prompt:', error)
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 })
  }
}

// PATCH: Update prompt or activate a version
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const promptId = searchParams.get('id')

    if (!promptId) {
      return NextResponse.json({ error: 'Prompt ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updatePromptSchema.parse(body)

    // Get current prompt
    const existing = await prisma.aIPromptTemplate.findUnique({
      where: { id: promptId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // If activating this version, deactivate other versions of the same prompt
    if (validatedData.isActive === true && !existing.isActive) {
      await prisma.aIPromptTemplate.updateMany({
        where: {
          promptName: existing.promptName,
          isActive: true,
        },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      })
    }

    const updated = await prisma.aIPromptTemplate.update({
      where: { id: promptId },
      data: {
        ...validatedData,
        ...(validatedData.isActive === true ? { activatedAt: new Date() } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating prompt:', error)
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
  }
}
