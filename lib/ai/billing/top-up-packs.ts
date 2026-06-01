export type AiTopUpPackId = 'ai_50' | 'ai_120' | 'ai_275'

export interface AiTopUpPack {
  id: AiTopUpPackId
  name: string
  description: string
  descriptionSv: string
  amountSek: number
  creditsSek: number
}

type AppLocale = 'en' | 'sv'

export const AI_TOP_UP_PACKS: AiTopUpPack[] = [
  {
    id: 'ai_50',
    name: 'AI 50',
    description: 'For a few extra food scans, reports, or analyses.',
    descriptionSv: 'För några extra mat-skanningar, rapporter eller analyser.',
    amountSek: 49,
    creditsSek: 50,
  },
  {
    id: 'ai_120',
    name: 'AI 120',
    description: 'A useful buffer for weeks with more video, voice coaching, and scanning.',
    descriptionSv: 'Bra buffert för veckor med mer video, röstcoach och scanning.',
    amountSek: 99,
    creditsSek: 120,
  },
  {
    id: 'ai_275',
    name: 'AI 275',
    description: 'For heavier AI use without changing subscription immediately.',
    descriptionSv: 'För tung AI-användning utan att byta abonnemang direkt.',
    amountSek: 199,
    creditsSek: 275,
  },
]

export function getAiTopUpPack(packId: string): AiTopUpPack | null {
  return AI_TOP_UP_PACKS.find((pack) => pack.id === packId) ?? null
}

export function getAiTopUpPackDescription(pack: AiTopUpPack, locale: AppLocale = 'en'): string {
  return locale === 'sv' ? pack.descriptionSv : pack.description
}
