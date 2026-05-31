import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  knowledgeSkill: {
    findMany: vi.fn(),
  },
  $queryRawUnsafe: vi.fn(),
  $executeRawUnsafe: vi.fn(),
  coachDocument: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/ai/embeddings', () => ({
  EMBEDDING_COLUMN: 'embedding_v2',
  ensureVectorColumn: vi.fn(),
  generateEmbedding: vi.fn(),
  getVectorType: vi.fn(),
  searchSystemChunks: vi.fn(),
}))

import {
  fetchSkillContext,
  formatKnowledgeSkillCatalog,
  getKnowledgeSkillDisplayName,
  hasExplicitKnowledgeSkillRequest,
  isKnowledgeSkillCatalogRequest,
  resolveKnowledgeSkillsByIds,
  resolveRequestedKnowledgeSkills,
} from '@/lib/ai/knowledge-skills'
import { searchSystemChunks } from '@/lib/ai/embeddings'

describe('knowledge skill controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('detects requests to list available skills', () => {
    expect(isKnowledgeSkillCatalogRequest('Vilka AI skills kan du använda?')).toBe(true)
    expect(isKnowledgeSkillCatalogRequest('show available knowledge skills')).toBe(true)
    expect(isKnowledgeSkillCatalogRequest('Kan du analysera Davids senaste pass?')).toBe(false)
  })

  it('detects explicit skill-pull wording', () => {
    expect(hasExplicitKnowledgeSkillRequest('Använd Norsk Dubbeltröskel och Laktattröskeltest')).toBe(true)
    expect(hasExplicitKnowledgeSkillRequest('Use HYROX Training for this plan')).toBe(true)
    expect(hasExplicitKnowledgeSkillRequest('Förklara laktattröskeltest')).toBe(false)
  })

  it('formats skills grouped by category', () => {
    const skills = [
      {
        id: 'skill-1',
        name: 'Norsk Dubbeltröskelmetod',
        nameEn: 'Norwegian Double Threshold',
        description: 'Threshold training',
        category: 'METHODOLOGY',
        keywords: ['norsk', 'dubbeltröskel'],
        priority: 10,
        documentIds: ['doc-1'],
        maxChunks: 3,
      },
      {
        id: 'skill-2',
        name: 'Laktattröskeltest',
        nameEn: 'Lactate Threshold Testing',
        description: 'Testing',
        category: 'TESTING',
        keywords: ['laktat', 'threshold'],
        priority: 10,
        documentIds: ['doc-2'],
        maxChunks: 4,
      },
    ]

    const catalog = formatKnowledgeSkillCatalog(skills, 'sv')

    expect(catalog).toContain('### METHODOLOGY')
    expect(catalog).toContain('TILLGÄNGLIGA AI-KUNSKAPSSKILLS')
    expect(catalog).toContain('Norsk Dubbeltröskelmetod / Norwegian Double Threshold')
    expect(catalog).toContain('### TESTING')
    expect(catalog).toContain('Laktattröskeltest / Lactate Threshold Testing')

    const englishCatalog = formatKnowledgeSkillCatalog(skills, 'en')
    expect(englishCatalog).toContain('AVAILABLE AI KNOWLEDGE SKILLS')
    expect(englishCatalog).toContain('Use Norwegian Double Threshold and Lactate Threshold Testing')
    expect(englishCatalog).toContain('Norwegian Double Threshold')
    expect(englishCatalog).toContain('Lactate Threshold Testing')
    expect(englishCatalog).not.toContain('Norsk Dubbeltröskelmetod')
    expect(englishCatalog).not.toContain('Laktattröskeltest')
    expect(englishCatalog).not.toContain('dubbeltröskel')
  })

  it('defaults knowledge skill display names and retrieved context wrappers to English', async () => {
    const skill = {
      id: 'skill-1',
      name: 'Crohn och träning',
      nameEn: "Crohn's Training and Nutrition",
      category: 'NUTRITION',
      documentIds: ['doc-1'],
      maxChunks: 1,
      score: 1,
      matchType: 'keyword' as const,
    }

    expect(getKnowledgeSkillDisplayName(skill)).toBe("Crohn's Training and Nutrition")

    vi.mocked(searchSystemChunks).mockResolvedValue([
      {
        documentId: 'doc-1',
        content: 'Svenskt källmaterial kan fortfarande användas som intern kontext.',
        similarity: 0.91,
      },
    ])
    mockPrisma.coachDocument.findMany.mockResolvedValue([])

    const result = await fetchSkillContext('crohn training', [skill], { googleKey: 'test-key' }, 'en')

    expect(result.context).toContain('EXPERT KNOWLEDGE (auto-retrieved)')
    expect(result.context).toContain('Knowledge source (91% relevance)')
    expect(result.context).toContain('Source excerpts may contain Swedish')
    expect(result.context).not.toContain('EXPERTKUNSKAP')
    expect(result.context).not.toContain('Kunskapskälla')
    expect(result.skillsUsed).toEqual(["Crohn's Training and Nutrition"])
  })

  it('resolves explicitly named skills by Swedish name, English name, and keyword', async () => {
    mockPrisma.knowledgeSkill.findMany.mockResolvedValue([
      {
        id: 'skill-1',
        name: 'Norsk Dubbeltröskelmetod',
        nameEn: 'Norwegian Double Threshold',
        description: 'Threshold training',
        category: 'METHODOLOGY',
        keywords: ['norsk', 'dubbeltröskel'],
        priority: 10,
        documentIds: ['doc-1'],
        maxChunks: 3,
      },
      {
        id: 'skill-2',
        name: 'HYROX Träning',
        nameEn: 'HYROX Training',
        description: 'Hybrid racing',
        category: 'SPORT_SPECIFIC',
        keywords: ['hyrox', 'hybrid'],
        priority: 10,
        documentIds: ['doc-2'],
        maxChunks: 3,
      },
    ])

    const matched = await resolveRequestedKnowledgeSkills(
      'Använd Norwegian Double Threshold och HYROX i planen'
    )

    expect(matched.map((skill) => skill.name)).toEqual([
      'Norsk Dubbeltröskelmetod',
      'HYROX Träning',
    ])
  })

  it('resolves selected skill ids while preserving requested order', async () => {
    mockPrisma.knowledgeSkill.findMany.mockResolvedValue([
      {
        id: 'skill-2',
        name: 'Laktattröskeltest',
        nameEn: 'Lactate Threshold Testing',
        description: 'Testing',
        category: 'TESTING',
        keywords: ['laktat'],
        priority: 10,
        documentIds: ['doc-2'],
        maxChunks: 4,
      },
      {
        id: 'skill-1',
        name: 'Polariserad Träning',
        nameEn: 'Polarized Training',
        description: '80/20',
        category: 'METHODOLOGY',
        keywords: ['polarized'],
        priority: 10,
        documentIds: ['doc-1'],
        maxChunks: 3,
      },
    ])

    const result = await resolveKnowledgeSkillsByIds(['skill-1', 'missing-skill', 'skill-2'])

    expect(result.matched.map((skill) => skill.name)).toEqual([
      'Polariserad Träning',
      'Laktattröskeltest',
    ])
    expect(result.missingIds).toEqual(['missing-skill'])
  })
})
