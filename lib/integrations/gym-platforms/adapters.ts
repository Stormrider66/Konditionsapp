/**
 * Gym Platform Adapter Registry
 *
 * Returns the correct adapter for a given provider.
 */

import type { GymPlatformAdapter } from './types'
import { ZoeziAdapter } from './zoezi-adapter'
import { BrpAdapter } from './brp-adapter'
import { BokaDirektAdapter } from './bokadirekt-adapter'
import { MindBodyAdapter } from './mindbody-adapter'

const adapters: Record<string, GymPlatformAdapter> = {
  ZOEZI: new ZoeziAdapter(),
  WONDR: new BrpAdapter(),
  BOKADIREKT: new BokaDirektAdapter(),
  MINDBODY: new MindBodyAdapter(),
}

export function getAdapter(provider: string): GymPlatformAdapter | null {
  return adapters[provider] || null
}
