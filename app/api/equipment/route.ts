// app/api/equipment/route.ts
// Master equipment catalog - public read access

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EquipmentCategory } from '@prisma/client'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  const locale = resolveRequestLocale(request)

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as EquipmentCategory | null
    const search = searchParams.get('search')

    const equipment = await prisma.equipment.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nameSv: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Group by category for easier UI consumption
    const grouped = equipment.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, typeof equipment>)

    return NextResponse.json({
      success: true,
      data: {
        equipment,
        grouped,
        total: equipment.length
      }
    })
  } catch (error) {
    console.error('Error fetching equipment catalog:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to fetch equipment catalog', 'Kunde inte hämta utrustningskatalogen') },
      { status: 500 }
    )
  }
}
