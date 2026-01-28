/**
 * /api/data-moat/models
 *
 * Data Moat Phase 4: AI Model Version Management
 * Tracks model versions and their performance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createModelSchema = z.object({
  versionName: z.string().min(1).max(100),
  modelType: z.string().min(1),
  description: z.string().optional(),
  changelog: z.string().optional(),
  promptTemplate: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  trainingDataStart: z.string().datetime().optional(),
  trainingDataEnd: z.string().datetime().optional(),
  trainingDataSize: z.number().int().optional(),
})

const updateModelSchema = z.object({
  description: z.string().optional(),
  changelog: z.string().optional(),
  status: z.enum(['DEVELOPMENT', 'TESTING', 'ACTIVE', 'DEPRECATED', 'ARCHIVED']).optional(),
  abTestId: z.string().optional(),
  abTestVariant: z.string().optional(),
})

const listQuerySchema = z.object({
  modelType: z.string().optional(),
  status: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET: List model versions
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
      modelType: searchParams.get('modelType') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '20', 10), 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (query.modelType) {
      where.modelType = query.modelType
    }

    if (query.status) {
      where.status = query.status
    }

    const [models, total] = await Promise.all([
      prisma.aIModelVersion.findMany({
        where,
        orderBy: [{ modelType: 'asc' }, { versionNumber: 'desc' }],
        skip,
        take: limit,
        include: {
          _count: {
            select: { feedbackLoops: true },
          },
        },
      }),
      prisma.aIModelVersion.count({ where }),
    ])

    // Get active models summary
    const activeModels = await prisma.aIModelVersion.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        versionName: true,
        modelType: true,
        overallAccuracy: true,
        predictionCount: true,
        validatedCount: true,
        deployedAt: true,
      },
    })

    return NextResponse.json({
      models,
      activeModels,
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
    console.error('Error fetching models:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}

// POST: Create new model version
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
    const validatedData = createModelSchema.parse(body)

    // Get latest version number for this model type
    const latestVersion = await prisma.aIModelVersion.findFirst({
      where: { modelType: validatedData.modelType },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true },
    })

    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1

    const model = await prisma.aIModelVersion.create({
      data: {
        versionName: validatedData.versionName,
        versionNumber: nextVersionNumber,
        modelType: validatedData.modelType,
        description: validatedData.description,
        changelog: validatedData.changelog,
        promptTemplate: validatedData.promptTemplate,
        parameters: validatedData.parameters,
        trainingDataStart: validatedData.trainingDataStart ? new Date(validatedData.trainingDataStart) : null,
        trainingDataEnd: validatedData.trainingDataEnd ? new Date(validatedData.trainingDataEnd) : null,
        trainingDataSize: validatedData.trainingDataSize,
        previousVersionId: latestVersion?.id,
        status: 'DEVELOPMENT',
      },
    })

    return NextResponse.json(model, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error creating model:', error)
    return NextResponse.json({ error: 'Failed to create model' }, { status: 500 })
  }
}

// PATCH: Update model or change status
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
    const modelId = searchParams.get('id')

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateModelSchema.parse(body)

    // Get current model
    const existing = await prisma.aIModelVersion.findUnique({
      where: { id: modelId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    // If activating this version, deprecate other active versions of the same type
    if (validatedData.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
      await prisma.aIModelVersion.updateMany({
        where: {
          modelType: existing.modelType,
          status: 'ACTIVE',
        },
        data: {
          status: 'DEPRECATED',
          deprecatedAt: new Date(),
        },
      })
    }

    const updated = await prisma.aIModelVersion.update({
      where: { id: modelId },
      data: {
        ...validatedData,
        ...(validatedData.status === 'ACTIVE' ? { deployedAt: new Date() } : {}),
        ...(validatedData.status === 'DEPRECATED' ? { deprecatedAt: new Date() } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating model:', error)
    return NextResponse.json({ error: 'Failed to update model' }, { status: 500 })
  }
}
