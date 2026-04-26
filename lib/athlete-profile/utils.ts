/**
 * Pure helpers for athlete-profile UI. Kept in their own file so client
 * components can import them without dragging in `data-fetcher.ts`'s
 * top-level Prisma import (which crashes the browser bundle).
 */

export function calculateAge(birthDate: Date): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function getSportDisplayName(sport: string): string {
  const sportNames: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    SKIING: 'Längdskidåkning',
    GENERAL_FITNESS: 'Allmän fitness',
    STRENGTH: 'Styrketräning',
  }
  return sportNames[sport] || sport
}
