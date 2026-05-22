import { getAccessibleTeam, getBusinessMembership } from '@/lib/coach/team-access'
import { roleLabelFor, type StaffRole } from '@/lib/permissions/assistant-coach'
import { prisma } from '@/lib/prisma'

type AppLocale = 'en' | 'sv'

const BUSINESS_WIDE_ASSIGNABLE_ROLES: StaffRole[] = [
  'OWNER',
  'ADMIN',
  'COACH',
]

export interface AssignableTeamCoach {
  id: string
  name: string
  email: string | null
  role: StaffRole
  roleLabel: string
}

export async function getAssignableTeamCoaches({
  requestingUserId,
  teamId,
  businessSlug,
  locale = 'en',
}: {
  requestingUserId: string
  teamId: string
  businessSlug?: string
  locale?: AppLocale
}): Promise<AssignableTeamCoach[]> {
  const team = await getAccessibleTeam(requestingUserId, teamId, businessSlug)
  if (!team) return []

  const membership = await getBusinessMembership(requestingUserId, businessSlug)
  const coaches = new Map<string, AssignableTeamCoach>()
  const directAssignments = await prisma.teamCoachAssignment.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const directAssignmentUserIds = directAssignments.map((assignment) => assignment.userId)

  if (membership) {
    const businessMembers = await prisma.businessMember.findMany({
      where: {
        businessId: membership.businessId,
        isActive: true,
        OR: [
          { role: { in: BUSINESS_WIDE_ASSIGNABLE_ROLES } },
          ...(directAssignmentUserIds.length > 0 ? [{ userId: { in: directAssignmentUserIds } }] : []),
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { role: 'asc' },
        { user: { name: 'asc' } },
      ],
    })

    for (const member of businessMembers) {
      coaches.set(member.userId, {
        id: member.userId,
        name: member.user.name,
        email: member.user.email,
        role: member.role as StaffRole,
        roleLabel: roleLabelFor(member.role, membership.business.type, locale),
      })
    }
  } else {
    const owner = await prisma.user.findUnique({
      where: { id: team.userId },
      select: { id: true, name: true, email: true },
    })
    if (owner) {
      coaches.set(owner.id, {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: 'COACH',
        roleLabel: roleLabelFor('COACH', 'CLUB', locale),
      })
    }
  }

  for (const assignment of directAssignments) {
    if (coaches.has(assignment.userId)) continue
    coaches.set(assignment.userId, {
      id: assignment.userId,
      name: assignment.user.name,
      email: assignment.user.email,
      role: 'ASSISTANT_COACH',
      roleLabel: roleLabelFor('ASSISTANT_COACH', membership?.business.type ?? 'CLUB', locale),
    })
  }

  return Array.from(coaches.values()).sort((a, b) => a.name.localeCompare(b.name, locale === 'sv' ? 'sv-SE' : 'en-US'))
}

export async function isAssignableTeamCoach({
  coachId,
  requestingUserId,
  teamId,
  businessSlug,
}: {
  coachId: string | null | undefined
  requestingUserId: string
  teamId: string
  businessSlug?: string
}) {
  if (!coachId) return true
  const coaches = await getAssignableTeamCoaches({ requestingUserId, teamId, businessSlug })
  return coaches.some((coach) => coach.id === coachId)
}
