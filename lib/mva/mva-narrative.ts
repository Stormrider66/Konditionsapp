/**
 * Plain-language narrative from MVA diagnostics.
 *
 * Turns the raw multivariate outputs (archetype, distinctive drivers, T²/DModX
 * outlier flags, PLS VIP) into a small set of prioritized, localized items a
 * coach can hand to an athlete. Kept deliberately honest: PCA contribution
 * sign reflects which side of a component an athlete sits on, NOT good/bad, so
 * drivers are described as "what shapes this profile", and only the
 * statistically-flagged outliers carry an explicit action.
 */

import { ARCHETYPE_LABELS, ARCHETYPE_DESCRIPTIONS, classifyArchetype } from './archetypes'

type Locale = 'en' | 'sv'

export interface MVANarrativeItem {
  id: string
  tone: 'priority' | 'watch' | 'positive' | 'info'
  title: string
  body: string
}

export interface NarrativeAthlete {
  clientName: string
  scores: number[]
  hotellingT2: number
  dmodx: number
  isOutlierT2: boolean
  isOutlierDModX: boolean
  topContributors: { variableId: string; variableName: string; contribution: number; direction: string }[] | null
}

export interface NarrativeVip {
  variableName: string
  vip: number
  coefficient: number
}

function copy(locale: Locale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Per-athlete narrative: archetype headline, distinctive drivers, and an
 * explicit follow-up only when the athlete is a statistical outlier.
 */
export function buildAthleteMVANarrative(athlete: NarrativeAthlete, locale: Locale = 'en'): MVANarrativeItem[] {
  const items: MVANarrativeItem[] = []
  const archetype = classifyArchetype(athlete.topContributors, athlete.scores)

  items.push({
    id: 'archetype',
    tone: 'info',
    title: copy(locale, 'Profile type', 'Profiltyp'),
    body: `${ARCHETYPE_LABELS[locale][archetype]} — ${ARCHETYPE_DESCRIPTIONS[locale][archetype]}`,
  })

  const drivers = (athlete.topContributors ?? []).slice(0, 3).map((c) => c.variableName)
  if (drivers.length > 0) {
    items.push({
      id: 'drivers',
      tone: 'positive',
      title: copy(locale, 'What shapes this profile', 'Vad som formar profilen'),
      body: copy(
        locale,
        `The measures separating this athlete most from the group: ${drivers.join(', ')}. Keep the training that drives the favourable ones; treat the rest as the next development theme.`,
        `Måtten som skiljer den här spelaren mest från gruppen: ${drivers.join(', ')}. Behåll träningen som driver de gynnsamma; gör övriga till nästa utvecklingstema.`
      ),
    })
  }

  if (athlete.isOutlierDModX) {
    items.push({
      id: 'dmodx-outlier',
      tone: 'priority',
      title: copy(locale, 'Profile does not fit the team model', 'Profilen passar inte lagmodellen'),
      body: copy(
        locale,
        'This athlete sits outside the model (high DModX). First rule out a data/test-quality issue; if the data is sound, the athlete has a genuinely unusual pattern worth an individual plan.',
        'Spelaren ligger utanför modellen (högt DModX). Uteslut först ett data-/testkvalitetsproblem; om datan stämmer har spelaren ett verkligt avvikande mönster värt en individuell plan.'
      ),
    })
  }

  if (athlete.isOutlierT2) {
    items.push({
      id: 't2-outlier',
      tone: 'watch',
      title: copy(locale, 'Distinct overall profile', 'Avvikande helhetsprofil'),
      body: copy(
        locale,
        'This athlete is far from the team centre (high Hotelling T²) — an extreme combination of strengths and gaps rather than a model misfit. Confirm it reflects real qualities before group-based decisions.',
        'Spelaren ligger långt från lagets mitt (högt Hotelling T²) — en extrem kombination av styrkor och brister snarare än en felpassning. Bekräfta att det speglar verkliga egenskaper innan gruppbaserade beslut.'
      ),
    })
  }

  if (items.length === 1) {
    items.push({
      id: 'central',
      tone: 'info',
      title: copy(locale, 'Inside the team profile', 'Inom lagprofilen'),
      body: copy(
        locale,
        'This athlete sits close to the team centre with no model-fit flags — a typical profile for the group on the measured variables.',
        'Spelaren ligger nära lagets mitt utan modellflaggor — en typisk profil för gruppen på de mätta variablerna.'
      ),
    })
  }

  return items
}

/**
 * Team-level narrative: segment spread + how many players need a closer look.
 */
export function buildTeamMVANarrative(
  athletes: NarrativeAthlete[],
  locale: Locale = 'en'
): MVANarrativeItem[] {
  if (athletes.length === 0) return []

  const counts = new Map<string, number>()
  for (const a of athletes) {
    const arch = classifyArchetype(a.topContributors, a.scores)
    counts.set(arch, (counts.get(arch) ?? 0) + 1)
  }
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const watch = athletes.filter((a) => a.isOutlierT2 || a.isOutlierDModX)

  const items: MVANarrativeItem[] = []

  if (dominant) {
    items.push({
      id: 'team-dominant',
      tone: 'info',
      title: copy(locale, 'Most common profile', 'Vanligaste profilen'),
      body: `${ARCHETYPE_LABELS[locale][dominant[0] as keyof (typeof ARCHETYPE_LABELS)['en']]} (${dominant[1]}/${athletes.length})`,
    })
  }

  items.push({
    id: 'team-watch',
    tone: watch.length > 0 ? 'watch' : 'positive',
    title: copy(locale, 'Players to review', 'Spelare att granska'),
    body: watch.length > 0
      ? copy(
          locale,
          `${watch.length} player(s) flagged as outliers (T² or DModX): ${watch.slice(0, 6).map((a) => a.clientName).join(', ')}. Verify data quality, then decide individual vs group programming.`,
          `${watch.length} spelare flaggade som outliers (T² eller DModX): ${watch.slice(0, 6).map((a) => a.clientName).join(', ')}. Kontrollera datakvalitet och avgör sedan individuell vs gruppträning.`
        )
      : copy(locale, 'No players flagged as model outliers.', 'Inga spelare flaggade som modell-outliers.'),
  })

  return items
}

/** Convert PLS VIP drivers into short, signed driver lines for a report. */
export function buildPLSDriverLines(
  yVariableName: string,
  vipScores: NarrativeVip[],
  locale: Locale = 'en'
): string[] {
  return vipScores
    .filter((v) => v.vip >= 1)
    .slice(0, 5)
    .map((v) => {
      const direction = v.coefficient >= 0
        ? copy(locale, 'higher', 'högre')
        : copy(locale, 'lower', 'lägre')
      return copy(
        locale,
        `${v.variableName} (VIP ${v.vip.toFixed(2)}): ${direction} values go with higher ${yVariableName}.`,
        `${v.variableName} (VIP ${v.vip.toFixed(2)}): ${direction} värden följer högre ${yVariableName}.`
      )
    })
}
