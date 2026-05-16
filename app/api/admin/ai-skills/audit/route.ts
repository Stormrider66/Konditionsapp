import { NextResponse } from 'next/server'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

type SkillEmbeddingRow = {
  id: string
  hasEmbedding: boolean
}

export async function GET() {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN'])

    const skills = await prisma.knowledgeSkill.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        category: true,
        keywords: true,
        priority: true,
        isActive: true,
        documentIds: true,
        maxChunks: true,
        updatedAt: true,
      },
    })

    const documentIds = Array.from(new Set(skills.flatMap((skill) => skill.documentIds)))

    const [documents, chunkCounts, embeddingRows] = await Promise.all([
      documentIds.length > 0
        ? prisma.coachDocument.findMany({
            where: { id: { in: documentIds } },
            select: {
              id: true,
              name: true,
              isSystem: true,
              processingStatus: true,
              chunkCount: true,
              updatedAt: true,
            },
          })
        : Promise.resolve([]),
      documentIds.length > 0
        ? prisma.knowledgeChunk.groupBy({
            by: ['documentId'],
            where: { documentId: { in: documentIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      prisma.$queryRawUnsafe<SkillEmbeddingRow[]>(
        'SELECT id, ("embedding_v2" IS NOT NULL) as "hasEmbedding" FROM "KnowledgeSkill"'
      ).catch(() => [] as SkillEmbeddingRow[]),
    ])

    const documentMap = new Map(documents.map((doc) => [doc.id, doc]))
    const chunkCountMap = new Map(
      chunkCounts.map((row) => [row.documentId, row._count.id])
    )
    const embeddingMap = new Map(
      embeddingRows.map((row) => [row.id, Boolean(row.hasEmbedding)])
    )

    const skillRows = skills.map((skill) => {
      const linkedDocuments = skill.documentIds.map((id) => {
        const doc = documentMap.get(id)
        return {
          id,
          name: doc?.name ?? 'Missing document',
          isSystem: doc?.isSystem ?? false,
          processingStatus: doc?.processingStatus ?? 'MISSING',
          chunkCount: chunkCountMap.get(id) ?? doc?.chunkCount ?? 0,
          updatedAt: doc?.updatedAt?.toISOString() ?? null,
          missing: !doc,
        }
      })
      const totalChunks = linkedDocuments.reduce((sum, doc) => sum + doc.chunkCount, 0)
      const hasMissingDocument = linkedDocuments.some((doc) => doc.missing)
      const hasFailedDocument = linkedDocuments.some((doc) => doc.processingStatus === 'FAILED')
      const hasChunks = totalChunks > 0
      const hasEmbedding = embeddingMap.get(skill.id) ?? false

      return {
        id: skill.id,
        name: skill.name,
        nameEn: skill.nameEn,
        category: skill.category,
        isActive: skill.isActive,
        priority: skill.priority,
        maxChunks: skill.maxChunks,
        keywords: skill.keywords,
        documentCount: skill.documentIds.length,
        totalChunks,
        hasEmbedding,
        health:
          !skill.isActive ? 'inactive'
          : hasMissingDocument ? 'missing_document'
          : hasFailedDocument ? 'document_failed'
          : !hasChunks ? 'no_chunks'
          : !hasEmbedding ? 'missing_embedding'
          : 'ready',
        documents: linkedDocuments,
        updatedAt: skill.updatedAt.toISOString(),
      }
    })

    const summary = {
      totalSkills: skillRows.length,
      activeSkills: skillRows.filter((skill) => skill.isActive).length,
      inactiveSkills: skillRows.filter((skill) => !skill.isActive).length,
      linkedDocumentIds: documentIds.length,
      linkedSystemDocuments: documents.filter((doc) => doc.isSystem).length,
      linkedChunks: Array.from(chunkCountMap.values()).reduce((sum, count) => sum + count, 0),
      readySkills: skillRows.filter((skill) => skill.health === 'ready').length,
      skillsWithoutDocuments: skillRows.filter((skill) => skill.documentCount === 0).length,
      skillsWithMissingDocuments: skillRows.filter((skill) => skill.health === 'missing_document').length,
      skillsWithoutChunks: skillRows.filter((skill) => skill.health === 'no_chunks').length,
      skillsWithoutEmbedding: skillRows.filter((skill) => skill.health === 'missing_embedding').length,
      failedDocuments: documents.filter((doc) => doc.processingStatus === 'FAILED').length,
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        surfaces: [
          {
            name: 'Coach floating chat',
            status: 'connected',
            detail: 'Auto-retrieves up to 3 matching skills per message.',
          },
          {
            name: 'Athlete floating chat',
            status: 'connected',
            detail: 'Uses the same chat context builder and skill retrieval.',
          },
          {
            name: 'AI Studio chat',
            status: 'connected',
            detail: 'Shows retrieved skill names from the chat response header.',
          },
          {
            name: 'AI Canvas',
            status: 'connected',
            detail: 'Uses matching skills during canvas block generation.',
          },
          {
            name: 'Live workout voice',
            status: 'separate',
            detail: 'Uses workout-control tools and session-specific prompts, not the full knowledge skill library.',
          },
        ],
        skills: skillRows,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/ai-skills/audit')
  }
}
