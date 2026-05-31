export type FuelingSyncTone = 'success' | 'empty'

export interface FuelingSyncResultCopy {
  tone: FuelingSyncTone
  titleEn: string
  titleSv: string
  bodyEn: string
  bodySv: string
  buttonLabelEn: string
  buttonLabelSv: string
}

export function buildFuelingSyncResultCopy(updatedCount: number): FuelingSyncResultCopy {
  if (updatedCount > 0) {
    return {
      tone: 'success',
      titleEn: `${updatedCount} upcoming sessions updated.`,
      titleSv: `${updatedCount} kommande pass uppdaterade.`,
      bodyEn: 'The athlete now sees carb targets on sessions that match the plan.',
      bodySv: 'Atleten ser nu carb-mål på de pass som matchar planen.',
      buttonLabelEn: `${updatedCount} sessions`,
      buttonLabelSv: `${updatedCount} pass`,
    }
  }

  return {
    tone: 'empty',
    titleEn: 'No upcoming sessions were updated.',
    titleSv: 'Inga kommande pass uppdaterades.',
    bodyEn: 'There are no active upcoming sessions that match length, sport, and intensity yet.',
    bodySv: 'Det finns inga aktiva kommande pass som matchar längd, sport och intensitet ännu.',
    buttonLabelEn: 'No sessions',
    buttonLabelSv: 'Inga pass',
  }
}
