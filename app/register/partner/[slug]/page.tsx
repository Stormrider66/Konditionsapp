import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PartnerRegistrationClient } from './PartnerRegistrationClient'
import { getTranslations } from '@/i18n/server'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = await getTranslations('metadata.register.partner')
  const tCommon = await getTranslations('common')
  const appName = tCommon('appName')

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: { name: true }
  })

  if (!business) {
    return { title: t('notFound') }
  }

  return {
    title: t('title', { businessName: business.name, appName }),
    description: t('description', { businessName: business.name }),
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
