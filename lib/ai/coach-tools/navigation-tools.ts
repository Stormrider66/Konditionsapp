/**
 * Coach chat tool for preparing safe in-app navigation actions.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import {
  type CoachToolContext,
  type CoachToolClient,
  type CoachNavigationDestination,
  toolText,
  findAccessibleCoachClients,
  getAccessibleCoachClientById,
  findAccessibleCoachTeam,
  getStaticCoachNavigation,
} from './shared'

export function createNavigationTools(ctx: CoachToolContext) {
  const { coachUserId, businessSlug, locale } = ctx

  return {
    suggestCoachNavigation: tool({
      description: locale === 'sv'
        ? 'Skapa en säker navigeringsåtgärd till rätt coach-sida. Använd när coachen ber dig öppna, visa, gå till eller ta dem till en sida, atletvy eller lagvy. Verktyget klickar inte själv, utan returnerar en app-länk som chatten kan visa som knapp.'
        : 'Create a safe navigation action to the right coach page. Use when the coach asks to open, show, go to, or take them to a page, athlete view, or team view. The tool does not click by itself; it returns an app link the chat can show as a button.',
      inputSchema: z.object({
        destination: z.enum([
          'dashboard',
          'calendar',
          'athletes',
          'programs',
          'programBuilder',
          'aiStudio',
          'strength',
          'cardio',
          'hybrid',
          'agility',
          'monitoring',
          'liveHr',
          'testOverview',
          'newTest',
          'videoAnalysis',
          'messages',
          'teams',
          'settings',
          'documents',
          'analytics',
          'athleteProfile',
          'athleteLogs',
          'athleteCalendar',
          'athleteFueling',
          'athleteEdit',
          'teamDashboard',
          'teamCalendar',
          'teamCapture',
          'teamTests',
        ]).describe('Target coach page.'),
        clientId: z.string().optional().describe('Athlete clientId if known.'),
        athleteName: z.string().optional().describe('Athlete name if the destination is athlete-related.'),
        teamId: z.string().optional().describe('Team id if known.'),
        teamName: z.string().optional().describe('Team name if the destination is team-related.'),
      }),
      execute: async ({ destination, clientId, athleteName, teamId, teamName }) => {
        try {
          const athleteDestinations = new Set<CoachNavigationDestination>([
            'athleteProfile',
            'athleteLogs',
            'athleteCalendar',
            'athleteFueling',
            'athleteEdit',
          ])
          const teamDestinations = new Set<CoachNavigationDestination>([
            'teamDashboard',
            'teamCalendar',
            'teamCapture',
            'teamTests',
          ])

          if (athleteDestinations.has(destination)) {
            let client: CoachToolClient | null = null
            let candidates: CoachToolClient[] = []

            if (clientId) {
              client = await getAccessibleCoachClientById(coachUserId, clientId, businessSlug)
            } else if (athleteName) {
              candidates = await findAccessibleCoachClients(coachUserId, athleteName, businessSlug, 6)
              const exactMatches = candidates.filter(
                (candidate) => candidate.name.toLowerCase() === athleteName.toLowerCase()
              )
              client = exactMatches.length === 1 ? exactMatches[0] : candidates.length === 1 ? candidates[0] : null
            }

            if (!client) {
              return {
                success: false,
                needsClarification: candidates.length > 1,
                error:
                  candidates.length > 1
                    ? toolText(
                        locale,
                        `I found several possible athletes${athleteName ? ` for "${athleteName}"` : ''}.`,
                        `Jag hittade flera möjliga atleter${athleteName ? ` för "${athleteName}"` : ''}.`
                      )
                    : toolText(locale, 'I need an athlete to create that navigation.', 'Jag behöver en atlet för att skapa den navigeringen.'),
                candidates: candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  team: candidate.team?.name ?? null,
                })),
              }
            }

            const athleteRoutes: Record<string, { href: string; label: string; description: string }> = {
              athleteProfile: {
                href: `/coach/clients/${client.id}`,
                label: toolText(locale, `Open ${client.name}`, `Öppna ${client.name}`),
                description: toolText(locale, 'Athlete coach profile', 'Atletens coachprofil'),
              },
              athleteLogs: {
                href: `/coach/athletes/${client.id}/logs`,
                label: toolText(locale, `Open ${client.name}'s training log`, `Öppna ${client.name}s träningslogg`),
                description: toolText(locale, 'Completed and incomplete sessions', 'Genomförda och ej genomförda pass'),
              },
              athleteCalendar: {
                href: `/coach/athletes/${client.id}/calendar`,
                label: toolText(locale, `Open ${client.name}'s calendar`, `Öppna ${client.name}s kalender`),
                description: toolText(locale, 'Athlete planned calendar', 'Atletens planerade kalender'),
              },
              athleteFueling: {
                href: `/coach/clients/${client.id}/fueling`,
                label: toolText(locale, `Open ${client.name}'s fueling`, `Öppna ${client.name}s fueling`),
                description: toolText(locale, 'Energy and hydration planning', 'Energi- och vätskeplanering'),
              },
              athleteEdit: {
                href: `/coach/clients/${client.id}/edit`,
                label: toolText(locale, `Edit ${client.name}`, `Redigera ${client.name}`),
                description: toolText(locale, 'Athlete profile settings', 'Atletens profilinställningar'),
              },
            }
            const navigation = athleteRoutes[destination]
            return {
              success: true,
              navigation: {
                ...navigation,
                destination,
                entityType: 'athlete',
                entityId: client.id,
                entityName: client.name,
              },
              message: toolText(
                locale,
                `I prepared a shortcut to ${navigation.description.toLowerCase()} for ${client.name}.`,
                `Jag har förberett en genväg till ${navigation.description.toLowerCase()} för ${client.name}.`
              ),
            }
          }

          if (teamDestinations.has(destination)) {
            const { team, candidates } = await findAccessibleCoachTeam(coachUserId, {
              teamId,
              teamName,
              businessSlug,
            })

            if (!team) {
              return {
                success: false,
                needsClarification: candidates.length > 1,
                error:
                  candidates.length > 1
                    ? toolText(
                        locale,
                        `I found several possible teams${teamName ? ` for "${teamName}"` : ''}.`,
                        `Jag hittade flera möjliga lag${teamName ? ` för "${teamName}"` : ''}.`
                      )
                    : toolText(locale, 'I need a team to create that navigation.', 'Jag behöver ett lag för att skapa den navigeringen.'),
                candidates: candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  sportType: candidate.sportType,
                })),
              }
            }

            const teamRoutes: Record<string, { href: string; label: string; description: string }> = {
              teamDashboard: {
                href: `/coach/teams/${team.id}`,
                label: toolText(locale, `Open ${team.name}`, `Öppna ${team.name}`),
                description: toolText(locale, 'Team dashboard', 'Lagdashboard'),
              },
              teamCalendar: {
                href: `/coach/teams/${team.id}/calendar`,
                label: toolText(locale, `Open ${team.name}'s calendar`, `Öppna ${team.name}s kalender`),
                description: toolText(locale, 'Team calendar', 'Lagets kalender'),
              },
              teamCapture: {
                href: `/coach/teams/${team.id}/capture`,
                label: toolText(locale, `Open ${team.name}'s Team cardio`, `Öppna ${team.name}s lagkondition`),
                description: toolText(locale, 'Team cardio setup and control room', 'Lagkondition med startlista, stationer och kontrollrum'),
              },
              teamTests: {
                href: `/coach/teams/${team.id}/tests`,
                label: toolText(locale, `Open ${team.name}'s tests`, `Öppna ${team.name}s tester`),
                description: toolText(locale, 'Team test view', 'Lagets testvy'),
              },
            }
            const navigation = teamRoutes[destination]
            return {
              success: true,
              navigation: {
                ...navigation,
                destination,
                entityType: 'team',
                entityId: team.id,
                entityName: team.name,
              },
              message: toolText(
                locale,
                `I prepared a shortcut to ${navigation.description.toLowerCase()} for ${team.name}.`,
                `Jag har förberett en genväg till ${navigation.description.toLowerCase()} för ${team.name}.`
              ),
            }
          }

          const navigation = getStaticCoachNavigation(destination, locale)
          if (!navigation) {
            return {
              success: false,
              error: toolText(locale, 'That destination is not supported yet.', 'Den destinationen stöds inte ännu.'),
            }
          }

          return {
            success: true,
            navigation: {
              ...navigation,
              destination,
              entityType: 'page',
              entityId: null,
              entityName: null,
            },
            message: toolText(locale, `I prepared a shortcut: ${navigation.label}.`, `Jag har förberett en genväg: ${navigation.label}.`),
          }
        } catch (error) {
          logger.error('Error in suggestCoachNavigation tool', {
            coachUserId,
            businessSlug,
            destination,
            clientId,
            athleteName,
            teamId,
            teamName,
          }, error)
          return {
            success: false,
            error: toolText(locale, 'Could not create the navigation.', 'Kunde inte skapa navigeringen.'),
          }
        }
      },
    }),
  }
}
