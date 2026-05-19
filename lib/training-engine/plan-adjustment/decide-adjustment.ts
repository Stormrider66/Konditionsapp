/**
 * Pure decision engine for the readiness → plan feedback loop.
 *
 * Takes a snapshot of an athlete's current state (ACWR, readiness
 * score, pain) and returns a recommended adjustment to apply to
 * their next scheduled session. No side effects, no DB access —
 * this is intentionally a pure function so it is trivial to test
 * and to reuse from cron jobs, API routes, or future AI tool calls.
 *
 * Rules are evaluated in cascade order: the most severe matching
 * rule wins, so a CRITICAL ACWR always dominates even if the
 * athlete also reports fair readiness.
 */

import type {
  AdjustmentAction,
  AdjustmentDecision,
  AdjustmentInputs,
  AdjustmentSeverity,
} from './types'

interface RuleMatch {
  action: AdjustmentAction
  severity: AdjustmentSeverity
  reason: string
  noteForAthlete: string
  triggers: string[]
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * Recommend an adjustment for the athlete's next scheduled session.
 *
 * The engine is intentionally conservative — it only escalates above
 * PROCEED when there is a concrete signal for doing so. Missing data
 * defaults to PROCEED with hadSufficientSignal=false.
 */
export function decideAdjustment(inputs: AdjustmentInputs, locale: AppLocale = 'en'): AdjustmentDecision {
  const {
    acwrZone,
    readinessScore,
    readinessDecision,
    recentPainLevel,
  } = inputs

  const hadSufficientSignal =
    acwrZone != null ||
    readinessScore != null ||
    readinessDecision != null ||
    recentPainLevel != null

  // Rule cascade, most severe first. First match wins.
  const rules: Array<() => RuleMatch | null> = [
    // --- CRITICAL ---
    () =>
      recentPainLevel != null && recentPainLevel >= 7
        ? {
            action: 'SKIP',
            severity: 'CRITICAL',
            reason: t(
              locale,
              `Acute pain reported (${recentPainLevel}/10). Rest today and complete a pain assessment before the next session.`,
              `Akut smärta rapporterad (${recentPainLevel}/10). Vila idag och gör en smärtbedömning innan nästa pass.`
            ),
            noteForAthlete: t(
              locale,
              'Session stopped due to acute pain. Rest and log the pain in your diary.',
              'Passet avbryts pga akut smärta. Vila och notera smärtan i dagboken.'
            ),
            triggers: ['PAIN_CRITICAL'],
          }
        : null,
    () =>
      acwrZone === 'CRITICAL'
        ? {
            action: 'SKIP',
            severity: 'CRITICAL',
            reason: t(
              locale,
              'ACWR is in the critical zone (>2.0). Injury risk is very high. Skip the session and add a rest day.',
              'ACWR är i kritisk zon (>2.0). Skaderisken är mycket hög — hoppa över passet och lägg in en vilodag.'
            ),
            noteForAthlete: t(
              locale,
              'Session skipped due to a critical workload level (ACWR >2.0).',
              'Passet hoppas över pga kritisk belastningsnivå (ACWR >2.0).'
            ),
            triggers: ['ACWR_CRITICAL'],
          }
        : null,

    // --- WARNING ---
    () =>
      recentPainLevel != null && recentPainLevel >= 4
        ? {
            action: 'DEFER_ONE_DAY',
            severity: 'WARNING',
            reason: t(
              locale,
              `Moderate pain reported (${recentPainLevel}/10). Move the session one day for recovery.`,
              `Moderat smärta rapporterad (${recentPainLevel}/10). Flytta passet en dag för återhämtning.`
            ),
            noteForAthlete: t(
              locale,
              'Session moved one day because pain was reported. Reassess before the next session.',
              'Passet flyttas en dag pga rapporterad smärta. Utvärdera innan nästa pass.'
            ),
            triggers: ['PAIN_MODERATE'],
          }
        : null,
    () =>
      acwrZone === 'DANGER'
        ? {
            action: 'DEFER_ONE_DAY',
            severity: 'WARNING',
            reason: t(
              locale,
              'ACWR is in the danger zone (1.5-2.0). Injury risk is high. Push the session one day and let chronic load catch up.',
              'ACWR är i farozon (1.5–2.0). Hög skaderisk — skjut passet en dag och låt chronic load fånga upp.'
            ),
            noteForAthlete: t(
              locale,
              'Session moved one day due to high workload (ACWR in the danger zone).',
              'Passet flyttas en dag pga hög belastningsnivå (ACWR i farozon).'
            ),
            triggers: ['ACWR_DANGER'],
          }
        : null,
    () =>
      readinessDecision === 'REST'
        ? {
            action: 'DEFER_ONE_DAY',
            severity: 'WARNING',
            reason: t(
              locale,
              'Today’s check-in signals rest (readinessDecision=REST). Push the session one day.',
              'Dagens check-in signalerar vila (readinessDecision=REST). Skjut passet en dag.'
            ),
            noteForAthlete: t(
              locale,
              'Session moved one day based on today’s morning check-in.',
              'Passet flyttas en dag baserat på dagens morgon-check-in.'
            ),
            triggers: ['READINESS_REST'],
          }
        : null,

    // --- CAUTION ---
    () =>
      acwrZone === 'CAUTION' && readinessScore != null && readinessScore < 50
        ? {
            action: 'SWAP_TO_EASY',
            severity: 'CAUTION',
            reason: t(
              locale,
              `ACWR is in the caution zone and readiness is low (${readinessScore}/100). Switch to an easier version of the same type.`,
              `ACWR är i varningszon och readiness är låg (${readinessScore}/100). Byt till en lättare variant av samma typ.`
            ),
            noteForAthlete: t(
              locale,
              'Session replaced with an easy variant due to combined workload and low readiness.',
              'Passet ersätts med en lugn variant pga kombinerad belastning och låg readiness.'
            ),
            triggers: ['ACWR_CAUTION', 'READINESS_LOW'],
          }
        : null,
    () =>
      acwrZone === 'CAUTION'
        ? {
            action: 'REDUCE_INTENSITY',
            severity: 'CAUTION',
            reason: t(
              locale,
              'ACWR is in the caution zone (1.3-1.5). Lower intensity one step today.',
              'ACWR är i varningszon (1.3–1.5). Sänk intensiteten ett snäpp idag.'
            ),
            noteForAthlete: t(
              locale,
              'Intensity reduced due to elevated workload (ACWR in the caution zone).',
              'Intensiteten sänks pga förhöjd belastningsnivå (ACWR i varningszon).'
            ),
            triggers: ['ACWR_CAUTION'],
          }
        : null,
    () =>
      readinessDecision === 'EASY'
        ? {
            action: 'REDUCE_INTENSITY',
            severity: 'CAUTION',
            reason: t(
              locale,
              'Today’s check-in signals an easy day (readinessDecision=EASY).',
              'Dagens check-in signalerar lätt dag (readinessDecision=EASY).'
            ),
            noteForAthlete: t(
              locale,
              'Intensity reduced based on today’s morning check-in.',
              'Intensiteten sänks baserat på dagens morgon-check-in.'
            ),
            triggers: ['READINESS_EASY'],
          }
        : null,
    () =>
      readinessScore != null && readinessScore < 60
        ? {
            action: 'REDUCE_INTENSITY',
            severity: 'CAUTION',
            reason: t(
              locale,
              `Readiness is low (${readinessScore}/100). Lower intensity one step.`,
              `Readiness är låg (${readinessScore}/100). Sänk intensiteten ett snäpp.`
            ),
            noteForAthlete: t(
              locale,
              'Intensity reduced based on today’s readiness score.',
              'Intensiteten sänks baserat på dagens readiness-score.'
            ),
            triggers: ['READINESS_LOW'],
          }
        : null,

    // --- INFO ---
    () =>
      readinessDecision === 'REDUCE'
        ? {
            action: 'REDUCE_VOLUME',
            severity: 'INFO',
            reason: t(
              locale,
              'Today’s check-in signals reduced volume (readinessDecision=REDUCE).',
              'Dagens check-in signalerar reducerad volym (readinessDecision=REDUCE).'
            ),
            noteForAthlete: t(
              locale,
              'Volume reduced by ~20% based on today’s morning check-in.',
              'Volymen sänks ~20% baserat på dagens morgon-check-in.'
            ),
            triggers: ['READINESS_REDUCE'],
          }
        : null,
    () =>
      readinessScore != null && readinessScore < 70
        ? {
            action: 'REDUCE_VOLUME',
            severity: 'INFO',
            reason: t(
              locale,
              `Readiness is moderate (${readinessScore}/100). Reduce volume by ~20%.`,
              `Readiness är måttlig (${readinessScore}/100). Sänk volymen ~20%.`
            ),
            noteForAthlete: t(
              locale,
              'Volume reduced by ~20% based on today’s readiness score.',
              'Volymen sänks ~20% baserat på dagens readiness-score.'
            ),
            triggers: ['READINESS_MODERATE'],
          }
        : null,
  ]

  for (const rule of rules) {
    const match = rule()
    if (match) {
      return {
        action: match.action,
        severity: match.severity,
        reason: match.reason,
        noteForAthlete: match.noteForAthlete,
        triggers: match.triggers,
        hadSufficientSignal: true,
      }
    }
  }

  // No rule fired — proceed as planned.
  return {
    action: 'PROCEED',
    severity: 'INFO',
    reason: hadSufficientSignal
      ? t(
        locale,
        'All workload and readiness signals look good. Run the session as planned.',
        'Alla belastnings- och readinesssignaler ser bra ut — kör passet som planerat.'
      )
      : t(
        locale,
        'Insufficient signals for a recommendation. Run the session as planned.',
        'Otillräckliga signaler för en rekommendation — kör passet som planerat.'
      ),
    noteForAthlete: '',
    triggers: [],
    hadSufficientSignal,
  }
}
