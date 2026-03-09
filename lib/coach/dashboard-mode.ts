import { SportType, isTeamSport } from '@/types'

export type DashboardMode = 'TEAM' | 'PT' | 'GYM'

export function detectDashboardMode(params: {
  explicitOverride: string | null
  businessType: string
  clientSports: SportType[]
  coachSpecialties: SportType[]
  hasTeams: boolean
}): DashboardMode {
  // 1. Explicit override takes priority
  if (params.explicitOverride === 'TEAM' || params.explicitOverride === 'PT' || params.explicitOverride === 'GYM') {
    return params.explicitOverride
  }

  // 2. BusinessType mapping
  if (params.businessType === 'CLUB') return 'TEAM'
  if (params.businessType === 'GYM') return 'GYM'

  // 3. Sport heuristic: >50% team sports → TEAM
  const allSports = [...params.clientSports, ...params.coachSpecialties]
  if (allSports.length > 0) {
    const teamSportCount = allSports.filter(s => isTeamSport(s)).length
    if (teamSportCount / allSports.length > 0.5) return 'TEAM'
  }

  // 4. Has teams → TEAM
  if (params.hasTeams) return 'TEAM'

  // 5. Default
  return 'PT'
}
