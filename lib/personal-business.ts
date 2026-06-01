/**
 * Personal-business provisioning.
 *
 * Every coach and physio who signs up without accepting a business
 * invite gets a personal Business provisioned automatically. They become
 * the OWNER, can rename it later, and immediately use the
 * /{slug}/{portal}/... URLs. Added in Phase 8 so we can delete the
 * legacy /coach/** and /physio/** pages.
 */

import type { Prisma } from '@prisma/client'

export type PersonalBusinessRole = 'COACH' | 'PHYSIO'
export type PersonalBusinessLocale = 'en' | 'sv'

/** Build a default business name from the user's name + role. */
export function defaultPersonalBusinessName(
  userName: string,
  role: PersonalBusinessRole,
  locale: PersonalBusinessLocale = 'en'
): string {
  const trimmed = userName.trim() || (locale === 'sv' ? 'Min' : 'My')
  if (role === 'PHYSIO') {
    return locale === 'sv' ? `${trimmed}s praktik` : `${trimmed}'s practice`
  }
  return locale === 'sv' ? `${trimmed}s coaching` : `${trimmed}'s coaching`
}

/**
 * URL-safe slug from free-text business name.
 *   "Jöns-Petter's Coaching" → "jons-petters-coaching"
 */
export function sluggifyBusinessName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'my-business'
}

/**
 * Find a free slug inside a Prisma transaction. Tries the base slug,
 * then `base-2`, `base-3`, … until one is available.
 */
export async function resolveUniqueSlugTx(
  tx: Prisma.TransactionClient,
  base: string
): Promise<string> {
  let candidate = base
  let suffix = 2
  while (true) {
    const existing = await tx.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
    if (suffix > 1000) {
      throw new Error(`Could not find a free slug for "${base}" after 1000 tries`)
    }
  }
}

/**
 * Create a Business row + OWNER BusinessMember row for `userId` inside a
 * Prisma transaction. Idempotent with respect to active memberships: if
 * the user already has one, returns that membership's business instead
 * of creating a new one.
 */
export async function createPersonalBusinessTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string
    userName: string
    role: PersonalBusinessRole
    locale?: PersonalBusinessLocale
  }
): Promise<{ id: string; slug: string; name: string; created: boolean }> {
  const { userId, userName, role, locale = 'en' } = params

  // Already a member of an active business? Reuse it.
  const existing = await tx.businessMember.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { business: { select: { id: true, slug: true, name: true } } },
  })
  if (existing) {
    return { ...existing.business, created: false }
  }

  const name = defaultPersonalBusinessName(userName, role, locale)
  const slug = await resolveUniqueSlugTx(tx, sluggifyBusinessName(name))

  const business = await tx.business.create({
    data: {
      name,
      slug,
      type: 'INDEPENDENT_COACH',
      isActive: true,
    },
    select: { id: true, slug: true, name: true },
  })

  await tx.businessMember.create({
    data: {
      businessId: business.id,
      userId,
      role: 'OWNER',
      isActive: true,
      acceptedAt: new Date(),
    },
  })

  return { ...business, created: true }
}
