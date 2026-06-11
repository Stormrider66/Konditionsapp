import { hasEmbeddingKeys, type EmbeddingKeys } from '@/lib/ai/embeddings'
import {
  fetchSkillContext,
  getKnowledgeSkillDisplayName,
  hasExplicitKnowledgeSkillRequest,
  matchKnowledgeSkills,
  resolveKnowledgeSkillsByIds,
  resolveRequestedKnowledgeSkills,
} from '@/lib/ai/knowledge-skills'
import { logger } from '@/lib/logger'
import type { AppLocale } from '@/lib/i18n/request-locale'

export interface CanvasSkillContextResult {
  skillContext: string
  skillsUsed: string[]
  missingSelectedSkillIds: string[]
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Knowledge-skill retrieval for the AI canvas: explicitly selected skills win,
 * then skills the prompt asks for by name, then embedding match. Failures
 * degrade to no skill context — canvas generation never blocks on RAG.
 */
export async function resolveCanvasSkillContext({
  prompt,
  selectedSkillIds,
  embeddingKeys,
  locale,
}: {
  prompt: string
  selectedSkillIds: string[]
  embeddingKeys: EmbeddingKeys
  locale: AppLocale
}): Promise<CanvasSkillContextResult> {
  const empty: CanvasSkillContextResult = { skillContext: '', skillsUsed: [], missingSelectedSkillIds: [] }
  if (!hasEmbeddingKeys(embeddingKeys)) return empty

  try {
    const selectedSkills = selectedSkillIds.length > 0
      ? await resolveKnowledgeSkillsByIds(selectedSkillIds, { maxSkills: 5 })
      : { matched: [], missingIds: [] }
    const missingSelectedSkillIds = selectedSkills.missingIds
    const requestedSkills = selectedSkills.matched.length === 0 && hasExplicitKnowledgeSkillRequest(prompt)
      ? await resolveRequestedKnowledgeSkills(prompt, { maxSkills: 5 })
      : []
    const matchedSkills = selectedSkills.matched.length > 0
      ? selectedSkills.matched
      : requestedSkills.length > 0
        ? requestedSkills
        : await matchKnowledgeSkills(prompt, embeddingKeys, { maxSkills: 3 })

    if (matchedSkills.length === 0) {
      if (missingSelectedSkillIds.length > 0) {
        return {
          skillContext: `\n## ${t(locale, 'SELECTED KNOWLEDGE SKILLS THAT COULD NOT BE USED', 'VALDA KUNSKAPSSKILLS SOM INTE KUNDE ANVÄNDAS')}\n${missingSelectedSkillIds.map((id) => `- ${id}`).join('\n')}\n${t(locale, 'Mention this visibly.', 'Nämn detta synligt.')}\n`,
          skillsUsed: [],
          missingSelectedSkillIds,
        }
      }
      return empty
    }

    const result = await fetchSkillContext(prompt, matchedSkills, embeddingKeys, locale)
    const selectedIntro = selectedSkills.matched.length > 0
      ? `\n## ${t(locale, 'SELECTED KNOWLEDGE SKILLS', 'VALDA KUNSKAPSSKILLS')}\n${selectedSkills.matched.map((skill) => `- ${getKnowledgeSkillDisplayName(skill, locale)}`).join('\n')}\n`
      : ''
    const requestedIntro = selectedSkills.matched.length === 0 && requestedSkills.length > 0
      ? `\n## ${t(locale, 'REQUESTED KNOWLEDGE SKILLS', 'EFTERFRÅGADE KUNSKAPSSKILLS')}\n${requestedSkills.map((skill) => `- ${getKnowledgeSkillDisplayName(skill, locale)}`).join('\n')}\n`
      : ''
    const missingIntro = missingSelectedSkillIds.length > 0
      ? `\n## ${t(locale, 'SELECTED KNOWLEDGE SKILLS THAT COULD NOT BE USED', 'VALDA KUNSKAPSSKILLS SOM INTE KUNDE ANVÄNDAS')}\n${missingSelectedSkillIds.map((id) => `- ${id}`).join('\n')}\n${t(locale, 'Mention this visibly if relevant.', 'Nämn detta synligt om det är relevant.')}\n`
      : ''

    return {
      skillContext: `${selectedIntro}${requestedIntro}${missingIntro}${result.context}`,
      skillsUsed: result.skillsUsed.length > 0
        ? result.skillsUsed
        : matchedSkills.map((skill) => getKnowledgeSkillDisplayName(skill, locale)),
      missingSelectedSkillIds,
    }
  } catch (error) {
    logger.warn('AI canvas skill retrieval failed', {}, error)
    return empty
  }
}
