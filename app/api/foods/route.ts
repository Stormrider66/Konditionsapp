/**
 * Food search API — typeahead for the ingredient builder.
 *
 * GET /api/foods?q=<query>
 *   Returns up to 20 prefix matches and up to 20 substring matches against
 *   Food.searchName, ordered by popularity DESC. Popularity is bumped by
 *   the meal-save endpoint when an item is persisted with foodId set.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

export async function GET(request: NextRequest) {
  let locale: AppLocale = 'en'
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = getUserLocale(resolved.user?.language)

    const q = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()
    if (q.length < 2) {
      return NextResponse.json({ foods: [] })
    }

    // Two-band query: prefix matches first (more relevant), then substring.
    const [prefix, contains] = await Promise.all([
      prisma.food.findMany({
        where: {
          OR: [
            { searchName: { startsWith: q } },
            { nameEn: { startsWith: q, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
        take: 20,
        select: {
          id: true,
          nameSv: true,
          nameEn: true,
          category: true,
          caloriesPer100g: true,
          proteinPer100g: true,
          carbsPer100g: true,
          fatPer100g: true,
          fiberPer100g: true,
          saturatedFatPer100g: true,
          monounsaturatedFatPer100g: true,
          polyunsaturatedFatPer100g: true,
          sugarPer100g: true,
          isCompleteProtein: true,
          proteinSource: true,
        },
      }),
      prisma.food.findMany({
        where: {
          AND: [
            {
              OR: [
                { searchName: { contains: q } },
                { nameEn: { contains: q, mode: 'insensitive' } },
              ],
            },
            {
              NOT: {
                OR: [
                  { searchName: { startsWith: q } },
                  { nameEn: { startsWith: q, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
        orderBy: [{ popularity: 'desc' }, { searchName: 'asc' }],
        take: 20,
        select: {
          id: true,
          nameSv: true,
          nameEn: true,
          category: true,
          caloriesPer100g: true,
          proteinPer100g: true,
          carbsPer100g: true,
          fatPer100g: true,
          fiberPer100g: true,
          saturatedFatPer100g: true,
          monounsaturatedFatPer100g: true,
          polyunsaturatedFatPer100g: true,
          sugarPer100g: true,
          isCompleteProtein: true,
          proteinSource: true,
        },
      }),
    ])

    return NextResponse.json({ foods: [...prefix, ...contains] })
  } catch (error) {
    logger.error('Food search failed', {}, error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
