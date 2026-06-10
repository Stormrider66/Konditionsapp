/**
 * Athlete archetype classification from PCA contributions.
 *
 * Shared by the coach UI, the per-athlete PDF report and the narrative engine
 * so the label an athlete sees is identical everywhere it is rendered.
 */

export type ArchetypeId = 'explosive' | 'strength' | 'aerobic' | 'recovery' | 'balanced'

export type ArchetypeLocale = 'en' | 'sv'

export const ARCHETYPE_LABELS: Record<ArchetypeLocale, Record<ArchetypeId, string>> = {
  en: {
    explosive: 'Explosive power profile',
    strength: 'Strength-dominant profile',
    aerobic: 'Aerobic/endurance profile',
    recovery: 'Load and recovery profile',
    balanced: 'Balanced profile',
  },
  sv: {
    explosive: 'Explosiv powerprofil',
    strength: 'Styrkedominant profil',
    aerobic: 'Aerob/uthållig profil',
    recovery: 'Belastnings- och återhämtningsprofil',
    balanced: 'Balanserad profil',
  },
}

export const ARCHETYPE_DESCRIPTIONS: Record<ArchetypeLocale, Record<ArchetypeId, string>> = {
  en: {
    explosive: 'Driven mainly by sprint, jumps, agility, or MuscleLab power.',
    strength: 'Driven mainly by 1RM, grip strength, or other maximal strength.',
    aerobic: 'Driven mainly by VO2, beep, repeated sprints, or endurance measures.',
    recovery: 'Driven mainly by readiness, sleep, HRV, or load variables.',
    balanced: 'No single physical domain dominates the profile.',
  },
  sv: {
    explosive: 'Drivs främst av sprint, hopp, agility eller MuscleLab-power.',
    strength: 'Drivs främst av 1RM, greppstyrka eller annan maximal styrka.',
    aerobic: 'Drivs främst av VO2, beep, upprepade sprintar eller uthållighetsmått.',
    recovery: 'Drivs främst av readiness, sömn, HRV eller belastningsvariabler.',
    balanced: 'Ingen enskild fysisk domän dominerar profilen.',
  },
}

export function contributorArchetype(contributor: { variableId: string; variableName: string }): ArchetypeId | null {
  const text = `${contributor.variableId} ${contributor.variableName}`.toLowerCase()
  if (/(musclelab|power|jump|sprint|agility|velocity|vbt|explosive)/.test(text)) return 'explosive'
  if (/(squat|clean|bench|pull|grip|strength|1rm|force)/.test(text)) return 'strength'
  if (/(vo2|beep|endurance|aerobic|7x40|repeat|fatigue|lactate)/.test(text)) return 'aerobic'
  if (/(sleep|hrv|readiness|recovery|strain|load|fatigue|soreness|oura|garmin)/.test(text)) return 'recovery'
  return null
}

export function fallbackArchetype(scores: number[]): ArchetypeId {
  const pc1 = scores[0] ?? 0
  const pc2 = scores[1] ?? 0
  if (Math.abs(pc1) < 0.35 && Math.abs(pc2) < 0.35) return 'balanced'
  if (pc1 >= 0 && pc2 >= 0) return 'explosive'
  if (pc1 >= 0 && pc2 < 0) return 'strength'
  if (pc1 < 0 && pc2 >= 0) return 'aerobic'
  return 'recovery'
}

/**
 * Classify an athlete by the archetype their top contributors point to, with a
 * score-quadrant fallback when no contributor matches a known domain.
 */
export function classifyArchetype(
  topContributors: { variableId: string; variableName: string; contribution: number }[] | null,
  scores: number[]
): ArchetypeId {
  const contributors = topContributors?.slice(0, 5) ?? []
  const counts = new Map<ArchetypeId, number>()
  for (const contributor of contributors) {
    const archetype = contributorArchetype(contributor)
    if (archetype) counts.set(archetype, (counts.get(archetype) ?? 0) + Math.abs(contributor.contribution))
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallbackArchetype(scores)
}
