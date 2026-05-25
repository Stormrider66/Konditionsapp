import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildBusinessFaviconSvg } from '@/lib/branding/favicon'

export const dynamic = 'force-dynamic'

function labelFromSlug(slug: string) {
  return slug.replace(/[-_]+/g, ' ')
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessSlug: string }> }
) {
  const { businessSlug } = await params
  let business: { name: string; primaryColor: string | null } | null = null

  try {
    business = await prisma.business.findFirst({
      where: { slug: businessSlug, isActive: true },
      select: { name: true, primaryColor: true },
    })
  } catch {
    business = null
  }

  const svg = buildBusinessFaviconSvg({
    name: business?.name ?? labelFromSlug(businessSlug),
    primaryColor: business?.primaryColor,
  })

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
