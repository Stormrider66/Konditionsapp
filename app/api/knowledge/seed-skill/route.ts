/**
 * Knowledge Skill Seeding API
 *
 * POST /api/knowledge/seed-skill
 *
 * Seeds a knowledge document and skill into the system.
 * Supports seeding predefined knowledge packages (e.g., IBD/Crohn's).
 *
 * Body: { skillKey: string, clientId?: string }
 *   - skillKey: Identifier for the knowledge package to seed
 *   - clientId: Optional — if provided, sets aiInstructions on the athlete's Client record
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { chunkText, storeChunkEmbeddings, getUserEmbeddingKeys, hasEmbeddingKeys } from '@/lib/ai/embeddings'
import { KnowledgeCategory } from '@prisma/client'
import { logger } from '@/lib/logger'
import {
  CROHNS_KNOWLEDGE_DOCUMENT_NAME,
  CROHNS_KNOWLEDGE_DOCUMENT_NAME_EN,
  CROHNS_KNOWLEDGE_DESCRIPTION,
  CROHNS_KNOWLEDGE_KEYWORDS,
  CROHNS_KNOWLEDGE_CONTENT,
  CROHNS_AI_INSTRUCTIONS,
} from '@/lib/ai/knowledge/crohns-training-nutrition'

// Allow up to 5 minutes for embedding generation
export const maxDuration = 300

interface SkillPackage {
  documentName: string
  documentNameEn: string
  description: string
  keywords: string[]
  content: string
  aiInstructions: string
  categories: KnowledgeCategory[]
  maxChunks: number
  priority: number
}

const SKILL_PACKAGES: Record<string, SkillPackage> = {
  'crohns-ibd': {
    documentName: CROHNS_KNOWLEDGE_DOCUMENT_NAME,
    documentNameEn: CROHNS_KNOWLEDGE_DOCUMENT_NAME_EN,
    description: CROHNS_KNOWLEDGE_DESCRIPTION,
    keywords: CROHNS_KNOWLEDGE_KEYWORDS,
    content: CROHNS_KNOWLEDGE_CONTENT,
    aiInstructions: CROHNS_AI_INSTRUCTIONS,
    categories: [KnowledgeCategory.PHYSIOLOGY, KnowledgeCategory.NUTRITION],
    maxChunks: 5,
    priority: 5,
  },
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await request.json()
    const { skillKey, clientId } = body as { skillKey: string; clientId?: string }

    if (!skillKey || !SKILL_PACKAGES[skillKey]) {
      return NextResponse.json(
        {
          error: 'Invalid skillKey',
          availableKeys: Object.keys(SKILL_PACKAGES),
        },
        { status: 400 }
      )
    }

    const pkg = SKILL_PACKAGES[skillKey]

    // Check if already seeded (by document name)
    const existingDoc = await prisma.coachDocument.findFirst({
      where: {
        coachId: user.id,
        name: pkg.documentName,
        isSystem: true,
      },
    })

    if (existingDoc) {
      // Still set aiInstructions on the client if requested
      if (clientId) {
        const client = await prisma.client.findFirst({
          where: { id: clientId, userId: user.id },
          select: { id: true },
        })

        if (client) {
          await prisma.client.update({
            where: { id: clientId },
            data: { aiInstructions: pkg.aiInstructions },
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Knowledge skill already exists. AI instructions updated if clientId provided.',
        documentId: existingDoc.id,
        alreadyExists: true,
      })
    }

    // Get embedding API keys (Google preferred, OpenAI fallback)
    const embeddingKeys = await getUserEmbeddingKeys(user.id)
    if (!hasEmbeddingKeys(embeddingKeys)) {
      return NextResponse.json(
        {
          error: 'AI API key not configured',
          message: 'Please configure a Google or OpenAI API key in Settings to generate embeddings.',
        },
        { status: 400 }
      )
    }

    // 1. Create the CoachDocument (system document)
    const document = await prisma.coachDocument.create({
      data: {
        coachId: user.id,
        name: pkg.documentName,
        description: pkg.description.trim(),
        fileType: 'MARKDOWN',
        fileUrl: `system://knowledge/${skillKey}`,
        isSystem: true,
        processingStatus: 'PROCESSING',
        metadata: { rawContent: pkg.content, skillKey },
      },
    })

    // 2. Chunk and embed the content
    const chunks = chunkText(pkg.content, {
      documentId: document.id,
      documentName: pkg.documentName,
      fileType: 'MARKDOWN',
    })

    const embedResult = await storeChunkEmbeddings(
      document.id,
      user.id,
      chunks,
      embeddingKeys
    )

    if (!embedResult.success) {
      return NextResponse.json(
        { error: 'Failed to generate embeddings', details: embedResult.error },
        { status: 500 }
      )
    }

    // 3. Create the KnowledgeSkill entries (one per category for better matching)
    const skillIds: string[] = []

    for (const category of pkg.categories) {
      const skill = await prisma.knowledgeSkill.create({
        data: {
          name: pkg.documentName,
          nameEn: pkg.documentNameEn,
          description: pkg.description.trim(),
          category,
          keywords: pkg.keywords,
          priority: pkg.priority,
          isActive: true,
          documentIds: [document.id],
          maxChunks: pkg.maxChunks,
        },
      })
      skillIds.push(skill.id)
    }

    // 4. Set aiInstructions on the athlete's Client record if clientId provided
    let aiInstructionsSet = false
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: user.id },
        select: { id: true },
      })

      if (client) {
        await prisma.client.update({
          where: { id: clientId },
          data: { aiInstructions: pkg.aiInstructions },
        })
        aiInstructionsSet = true
      } else {
        logger.warn('Client not found or does not belong to coach', { clientId, coachId: user.id })
      }
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      skillIds,
      chunksCreated: embedResult.chunksStored,
      aiInstructionsSet,
      message: `Knowledge skill "${pkg.documentName}" seeded with ${embedResult.chunksStored} chunks and ${skillIds.length} skill(s).`,
    })
  } catch (error) {
    logger.error('Seed knowledge skill error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to seed knowledge skill' },
      { status: 500 }
    )
  }
}
