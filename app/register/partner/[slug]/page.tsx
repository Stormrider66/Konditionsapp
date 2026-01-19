import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PartnerRegistrationClient } from './PartnerRegistrationClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: { name: true }
  })

  if (!business) {
    return { title: 'Partner Not Found' }
  }

  return {
    title: `Sign Up with ${business.name} | VO2max App`,
    description: `Join through ${business.name} and get exclusive access to professional training tools.`
  }
}

export default async function PartnerRegistrationPage({ params }: Props) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      description: true,
      enterpriseContract: {
        select: {
          revenueSharePercent: true,
          status: true
        }
      }
    }
  })

  if (!business) {
    notFound()
  }

  // Only allow registration through active contracts
  if (!business.enterpriseContract || business.enterpriseContract.status !== 'ACTIVE') {
    notFound()
  }

  return (
    <PartnerRegistrationClient
      business={{
        id: business.id,
        name: business.name,
        slug: business.slug,
        logoUrl: business.logoUrl,
        primaryColor: business.primaryColor,
        description: business.description,
        revenueSharePercent: business.enterpriseContract.revenueSharePercent
      }}
    />
  )
}
