type AthleteSportProfile = {
  primarySport?: string | null
  secondarySports?: string[] | null
} | null | undefined

export const SPORT_TEST_PROFILE_TABS: Record<string, { tab: string; label: string; description: string }> = {
  TEAM_ICE_HOCKEY: {
    tab: 'hockey',
    label: 'Hockeytester',
    description: 'Fysiska hockeytester, trender och spelarrapport',
  },
  TEAM_FOOTBALL: {
    tab: 'football',
    label: 'Fotbollstester',
    description: 'Fotbollstester, benchmarks och testhistorik',
  },
}

export function getPrimarySportTestTab(sportProfile: AthleteSportProfile) {
  const sports = [
    sportProfile?.primarySport,
    ...(sportProfile?.secondarySports ?? []),
  ].filter((sport): sport is string => Boolean(sport))

  return sports
    .map((sport) => SPORT_TEST_PROFILE_TABS[sport])
    .find(Boolean) ?? null
}

export function getAthleteTestsHref(basePath: string, sportProfile: AthleteSportProfile) {
  const sportTab = getPrimarySportTestTab(sportProfile)
  if (!sportTab) return `${basePath}/athlete/tests`
  return `${basePath}/athlete/profile?tab=${sportTab.tab}`
}

export function getAthleteTestsNavMeta(sportProfile: AthleteSportProfile) {
  return getPrimarySportTestTab(sportProfile) ?? {
    label: 'Tester & Rapporter',
    description: 'Testresultat och rapporter',
  }
}
