/**
 * Available Gemini Live API Voice Catalog
 *
 * Prebuilt voices available for the Gemini 3.1 Flash Live model.
 */

export interface VoiceOption {
  name: string
  displayName: string
  description: string
  gender: 'male' | 'female' | 'neutral'
  style: string
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    name: 'Kore',
    displayName: 'Kore',
    description: 'Firm and clear, well-suited for structured coaching',
    gender: 'female',
    style: 'Confident & direct',
  },
  {
    name: 'Puck',
    displayName: 'Puck',
    description: 'Upbeat and energetic, great for motivation',
    gender: 'male',
    style: 'Energetic & warm',
  },
  {
    name: 'Charon',
    displayName: 'Charon',
    description: 'Deep and calm, ideal for steady-state and recovery',
    gender: 'male',
    style: 'Deep & steady',
  },
  {
    name: 'Fenrir',
    displayName: 'Fenrir',
    description: 'Strong and commanding, perfect for intense intervals',
    gender: 'male',
    style: 'Powerful & bold',
  },
  {
    name: 'Aoede',
    displayName: 'Aoede',
    description: 'Bright and expressive, encouraging presence',
    gender: 'female',
    style: 'Bright & expressive',
  },
  {
    name: 'Leda',
    displayName: 'Leda',
    description: 'Warm and nurturing, supportive coaching style',
    gender: 'female',
    style: 'Warm & supportive',
  },
  {
    name: 'Orus',
    displayName: 'Orus',
    description: 'Balanced and articulate, versatile coaching voice',
    gender: 'male',
    style: 'Balanced & clear',
  },
  {
    name: 'Perseus',
    displayName: 'Perseus',
    description: 'Authoritative yet approachable, natural leader voice',
    gender: 'male',
    style: 'Authoritative & friendly',
  },
  {
    name: 'Zephyr',
    displayName: 'Zephyr',
    description: 'Gentle and fluid, calming for longer sessions',
    gender: 'neutral',
    style: 'Gentle & flowing',
  },
]

export const DEFAULT_VOICE = 'Kore'

export function getVoiceByName(name: string): VoiceOption | undefined {
  return AVAILABLE_VOICES.find((v) => v.name === name)
}
