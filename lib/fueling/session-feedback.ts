export type FuelingSessionFeedbackStatus =
  | 'MISSING'
  | 'REDUCE'
  | 'HOLD'
  | 'PROGRESS'
  | 'ON_TRACK'

export interface FuelingSessionFeedbackInput {
  plannedCarbsGPerHour?: number | null
  actualCarbsGPerHour?: number | null
  stomachRating?: number | null
  energyRating?: number | null
}

export interface FuelingSessionFeedback {
  status: FuelingSessionFeedbackStatus
  labelEn: string
  labelSv: string
  messageEn: string
  messageSv: string
  nextTargetGPerHour: number | null
  deltaGPerHour: number | null
}

export function buildFuelingSessionFeedback(input: FuelingSessionFeedbackInput): FuelingSessionFeedback {
  const planned = normalizeNumber(input.plannedCarbsGPerHour)
  const actual = normalizeNumber(input.actualCarbsGPerHour)
  const stomach = normalizeNumber(input.stomachRating)
  const energy = normalizeNumber(input.energyRating)
  const anchor = actual ?? planned

  if (planned == null && actual == null) {
    return {
      status: 'MISSING',
      labelEn: 'Missing intake',
      labelSv: 'Saknar intag',
      messageEn: 'Log carbohydrates per hour to get the next recommendation.',
      messageSv: 'Logga kolhydrater per timme för att få nästa rekommendation.',
      nextTargetGPerHour: null,
      deltaGPerHour: null,
    }
  }

  if (stomach != null && stomach <= 2) {
    const nextTarget = roundToFive(Math.max(30, (anchor ?? 45) - 10))
    return {
      status: 'REDUCE',
      labelEn: 'Reduce next time',
      labelSv: 'Sänk nästa gång',
      messageEn: `Gut response was not stable. Aim for about ${nextTarget} g/h next time and prioritize even timing.`,
      messageSv: `Magen var inte stabil. Sikta på cirka ${nextTarget} g/h nästa gång och prioritera jämn timing.`,
      nextTargetGPerHour: nextTarget,
      deltaGPerHour: planned != null ? nextTarget - planned : null,
    }
  }

  if (stomach != null && stomach === 3) {
    const nextTarget = roundToFive(anchor ?? planned ?? 45)
    return {
      status: 'HOLD',
      labelEn: 'Hold level',
      labelSv: 'Behåll nivån',
      messageEn: `Repeat about ${nextTarget} g/h until your gut feels more stable before increasing.`,
      messageSv: `Upprepa cirka ${nextTarget} g/h tills magen känns stabilare innan du höjer.`,
      nextTargetGPerHour: nextTarget,
      deltaGPerHour: planned != null ? nextTarget - planned : null,
    }
  }

  if (planned != null && actual != null && actual < planned - 15) {
    const nextTarget = roundToFive(Math.max(30, actual + 5))
    return {
      status: 'HOLD',
      labelEn: 'Build up to the plan',
      labelSv: 'Bygg upp till planen',
      messageEn: `Intake was below plan. Aim for ${nextTarget} g/h next time before moving toward ${Math.round(planned)} g/h.`,
      messageSv: `Intaget låg under planen. Sikta på ${nextTarget} g/h nästa gång innan du går mot ${Math.round(planned)} g/h.`,
      nextTargetGPerHour: nextTarget,
      deltaGPerHour: nextTarget - planned,
    }
  }

  if ((stomach ?? 0) >= 4 && (energy ?? 0) >= 4 && actual != null) {
    const nextTarget = roundToFive(Math.min(120, actual + 5))
    return {
      status: 'PROGRESS',
      labelEn: 'Ready to increase',
      labelSv: 'Redo att höja',
      messageEn: `Good tolerance. The next long session can test about ${nextTarget} g/h if the session is race-like.`,
      messageSv: `Bra tolerans. Nästa långpass kan testa cirka ${nextTarget} g/h om passet är tävlingslikt.`,
      nextTargetGPerHour: nextTarget,
      deltaGPerHour: planned != null ? nextTarget - planned : null,
    }
  }

  const nextTarget = roundToFive(anchor ?? planned ?? 45)
  return {
    status: 'ON_TRACK',
    labelEn: 'On track',
    labelSv: 'På rätt väg',
    messageEn: `Continue with about ${nextTarget} g/h and log the response after the next long session.`,
    messageSv: `Fortsätt med cirka ${nextTarget} g/h och logga responsen efter nästa långpass.`,
    nextTargetGPerHour: nextTarget,
    deltaGPerHour: planned != null ? nextTarget - planned : null,
  }
}

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5
}
