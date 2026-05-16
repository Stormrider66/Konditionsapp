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
  formatKnowledgeSkillCatalog,
  hasExplicitKnowledgeSkillRequest,
  isKnowledgeSkillCatalogRequest,
  resolveKnowledgeSkillsByIds,
  resolveRequestedKnowledgeSkills,
} from '@/lib/ai/knowledge-skills'

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
    const catalog = formatKnowledgeSkillCatalog([
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
    ])

    expect(catalog).toContain('### METHODOLOGY')
    expect(catalog).toContain('Norsk Dubbeltröskelmetod / Norwegian Double Threshold')
    expect(catalog).toContain('### TESTING')
    expect(catalog).toContain('Laktattröskeltest / Lactate Threshold Testing')
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
