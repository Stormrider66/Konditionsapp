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
  labelSv: string
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
      labelSv: 'Saknar intag',
      messageSv: 'Logga kolhydrater per timme för att få nästa rekommendation.',
      nextTargetGPerHour: null,
      deltaGPerHour: null,
    }
  }

  if (stomach != null && stomach <= 2) {
    const nextTarget = roundToFive(Math.max(30, (anchor ?? 45) - 10))
    return {
      status: 'REDUCE',
      labelSv: 'Sänk nästa gång',
      messageSv: `Magen var inte stabil. Sikta på cirka ${nextTarget} g/h nästa gång och prioritera jämn timing.`,
      nextTargetGPerHour: nextTarget,
      deltaGPerHour: planned != null ? nextTarget - planned : null,
    }
  }

  if (stomach != null && stomach === 3) {
    const nextTarget = roundToFive(anchor ?? planned ?? 45)
    return {
      status: 'HOLD',
      labelSv: 'Behåll nivån',
      messageSv: `Upprepa cirka ${nextTarget} g/h tills magen känns stabilare innan du höjer.`,
      nextTargetGPerHour: nextTarget,
      deltaGPerHour: planned != null ? nextTarget - planned : null,
    }
  }

  if (planned != null && actual != null && actual < planned - 15) {
    const nextTarget = roundToFive(Math.max(30, actual + 5))
    return {
      status: 'HOLD',
      labelSv: 'Bygg upp till planen',
      messageSv: `Intaget låg under planen. Sikta på ${nextTarget} g/h nästa gång innan du går mot ${Math.round(planned)} g/h.`,
      nextTargetGPerHour: nextTarget,
      deltaGPerHour: nextTarget - planned,
    }
  }

  if ((stomach ?? 0) >= 4 && (energy ?? 0) >= 4 && actual != null) {
    const nextTarget = roundToFive(Math.min(120, actual + 5))
    return {
      status: 'PROGRESS',
      labelSv: 'Redo att höja',
      messageSv: `Bra tolerans. Nästa långpass kan testa cirka ${nextTarget} g/h om passet är tävlingslikt.`,
      nextTargetGPerHour: nextTarget,
      deltaGPerHour: planned != null ? nextTarget - planned : null,
    }
  }

  const nextTarget = roundToFive(anchor ?? planned ?? 45)
  return {
    status: 'ON_TRACK',
    labelSv: 'På rätt väg',
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
