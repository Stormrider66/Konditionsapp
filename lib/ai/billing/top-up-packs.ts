export type AiTopUpPackId = 'ai_50' | 'ai_120' | 'ai_275'

export interface AiTopUpPack {
  id: AiTopUpPackId
  name: string
  description: string
  descriptionEn: string
  amountSek: number
  creditsSek: number
}

type AppLocale = 'en' | 'sv'

export const AI_TOP_UP_PACKS: AiTopUpPack[] = [
  {
    id: 'ai_50',
    name: 'AI 50',
    description: 'För några extra mat-skanningar, rapporter eller analyser.',
    descriptionEn: 'For a few extra food scans, reports, or analyses.',
    amountSek: 49,
    creditsSek: 50,
  },
  {
    id: 'ai_120',
    name: 'AI 120',
    description: 'Bra buffert för veckor med mer video, röstcoach och scanning.',
    descriptionEn: 'A useful buffer for weeks with more video, voice coaching, and scanning.',
    amountSek: 99,
    creditsSek: 120,
  },
  {
    id: 'ai_275',
    name: 'AI 275',
    description: 'För tung AI-användning utan att byta abonnemang direkt.',
    descriptionEn: 'For heavier AI use without changing subscription immediately.',
    amountSek: 199,
    creditsSek: 275,
  },
]

export function getAiTopUpPack(packId: string): AiTopUpPack | null {
  return AI_TOP_UP_PACKS.find((pack) => pack.id === packId) ?? null
}

export function getAiTopUpPackDescription(pack: AiTopUpPack, locale: AppLocale = 'en'): string {
  return locale === 'sv' ? pack.description : pack.descriptionEn
}
