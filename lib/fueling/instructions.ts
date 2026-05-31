export type FuelingInstructionLocale = 'en' | 'sv'
export type FuelingInstructionFeedbackStatus =
  | 'REDUCE'
  | 'HOLD'
  | 'READY_TO_PROGRESS'
  | 'NO_DATA'
  | 'ON_TRACK'
  | 'NEUTRAL'
  | null
  | undefined

type FuelingInstructionInput = {
  locale: FuelingInstructionLocale
  targetCarbsGPerHour: number | null | undefined
  targetCarbsTotalG?: number | null
  durationHours?: number | null
  feedbackStatus?: FuelingInstructionFeedbackStatus
}

export function buildFuelingInstructionText({
  locale,
  targetCarbsGPerHour,
  targetCarbsTotalG,
  durationHours,
  feedbackStatus,
}: FuelingInstructionInput): string | null {
  if (!targetCarbsGPerHour || !Number.isFinite(targetCarbsGPerHour)) return null

  const target = Math.round(targetCarbsGPerHour)
  const every20 = Math.round(target / 3)
  const total = targetCarbsTotalG != null && Number.isFinite(targetCarbsTotalG)
    ? Math.round(targetCarbsTotalG)
    : durationHours && durationHours > 0
      ? Math.round(target * durationHours)
      : null

  const parts = locale === 'sv'
    ? [
        `Magträning: sikta på ${target} g kolhydrater/timme.`,
        `Praktiskt upplägg: cirka ${every20} g var 20:e minut.`,
        total ? `Totalt för passet: cirka ${total} g kolhydrater.` : null,
        feedbackHint(feedbackStatus, locale),
        target > 60 ? 'Välj gärna en glukos/fruktos-mix eftersom målet är över 60 g/timme.' : null,
        'Använd produkter som är tänkta för tävling och notera magrespons efter passet.',
      ]
    : [
        `Gut training: aim for ${target} g carbohydrates/hour.`,
        `Practical setup: about ${every20} g every 20 minutes.`,
        total ? `Total for the session: about ${total} g carbohydrates.` : null,
        feedbackHint(feedbackStatus, locale),
        target > 60 ? 'Prefer a glucose/fructose mix because the target is above 60 g/hour.' : null,
        'Use products intended for racing and note gut response after the session.',
      ]

  return parts.filter(Boolean).join(' ')
}

function feedbackHint(status: FuelingInstructionFeedbackStatus, locale: FuelingInstructionLocale): string | null {
  if (status === 'REDUCE') {
    return locale === 'sv'
      ? 'Den senaste magresponsen talar för att backa något och prioritera stabil tolerans före nästa höjning.'
      : 'The latest gut response suggests backing off slightly and prioritizing stable tolerance before increasing.'
  }

  if (status === 'HOLD') {
    return locale === 'sv'
      ? 'Upprepa den här nivån tills intaget och magresponsen är stabila före nästa höjning.'
      : 'Repeat this level until intake and gut response are stable before the next increase.'
  }

  if (status === 'READY_TO_PROGRESS') {
    return locale === 'sv'
      ? 'Toleransen ser stabil ut, så nivån kan höjas försiktigt.'
      : 'Tolerance looks stable, so the level can be increased carefully.'
  }

  return null
}
