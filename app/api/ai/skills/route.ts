import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { listKnowledgeSkills } from '@/lib/ai/knowledge-skills'

export async function GET() {
  try {
    await requireCoach()

    const skills = await listKnowledgeSkills()

    return NextResponse.json({
      success: true,
      data: {
        maxSelectable: 5,
        skills: skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          nameEn: skill.nameEn,
          description: skill.description,
          category: skill.category,
          keywords: skill.keywords,
          maxChunks: skill.maxChunks,
        })),
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/ai/skills')
  }
}
