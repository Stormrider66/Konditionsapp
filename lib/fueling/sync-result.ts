export type FuelingSyncTone = 'success' | 'empty'

export interface FuelingSyncResultCopy {
  tone: FuelingSyncTone
  titleSv: string
  bodySv: string
  buttonLabelSv: string
}

export function buildFuelingSyncResultCopy(updatedCount: number): FuelingSyncResultCopy {
  if (updatedCount > 0) {
    return {
      tone: 'success',
      titleSv: `${updatedCount} kommande pass uppdaterade.`,
      bodySv: 'Atleten ser nu carb-mål på de pass som matchar planen.',
      buttonLabelSv: `${updatedCount} pass`,
    }
  }

  return {
    tone: 'empty',
    titleSv: 'Inga kommande pass uppdaterades.',
    bodySv: 'Det finns inga aktiva kommande pass som matchar längd, sport och intensitet ännu.',
    buttonLabelSv: 'Inga pass',
  }
}
