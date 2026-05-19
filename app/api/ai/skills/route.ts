import { NextResponse } from 'next/server'
import { requireCoach, resolveAthleteClientId } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { listKnowledgeSkills } from '@/lib/ai/knowledge-skills'
import {
  getKnowledgeSkillMaxSelectable,
  type KnowledgeSkillAccessMode,
} from '@/lib/ai/skill-access'
import { prisma } from '@/lib/prisma'

type AppLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export async function GET() {
  try {
    let accessMode: KnowledgeSkillAccessMode = 'full'
    let locale: AppLocale = 'en'

    const athleteResolved = await resolveAthleteClientId()
    if (athleteResolved) {
      locale = resolveLocale(athleteResolved.user.language)
      const subscription = await prisma.athleteSubscription.findUnique({
        where: { clientId: athleteResolved.clientId },
        select: { tier: true, assignedCoachId: true, aiChatEnabled: true },
      })

      if (!athleteResolved.isCoachInAthleteMode) {
        if (!subscription?.aiChatEnabled) {
          return NextResponse.json(
            { error: t(locale, 'AI skills require active AI chat.', 'AI skills kräver aktiv AI-chatt.') },
            { status: 403 }
          )
        }
        accessMode = subscription?.assignedCoachId ? 'athlete_coached' : 'athlete_self_coached'
      }
    } else {
      await requireCoach()
    }

    const skills = await listKnowledgeSkills({ accessMode })
    const maxSelectable = getKnowledgeSkillMaxSelectable(accessMode)

    return NextResponse.json({
      success: true,
      data: {
        accessMode,
        maxSelectable,
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
