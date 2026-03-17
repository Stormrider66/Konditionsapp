import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function PublicAchievementPage({ params }: PageProps) {
  const { token } = await params

  const achievement = await prisma.sharedAchievement.findUnique({
    where: { publicToken: token },
    include: {
      client: {
        select: { name: true },
      },
    },
  })

  if (!achievement) {
    notFound()
  }

  // Check expiration
  if (achievement.publicExpiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Länken har gått ut
          </h1>
          <p className="text-gray-600 mb-6">
            Den här delningslänken är inte längre giltig.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Skapa konto på Trainomics
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          {/* Achievement image */}
          {achievement.imageUrl && (
            <div className="rounded-xl overflow-hidden shadow-lg">
              <Image
                src={achievement.imageUrl}
                alt={achievement.title}
                width={1200}
                height={630}
                className="w-full h-auto"
                priority
              />
            </div>
          )}

          {/* Achievement details */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {achievement.title}
            </h1>
            {achievement.description && (
              <p className="text-gray-600">{achievement.description}</p>
            )}
            <p className="text-sm text-gray-400">
              {achievement.client.name} &middot;{' '}
              {achievement.createdAt.toLocaleDateString('sv-SE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Branding + CTA */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500 mb-4">
              Powered by <span className="font-semibold">Trainomics</span>
            </p>
            <Link
              href="/signup"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Börja träna smartare — skapa konto gratis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params

  const achievement = await prisma.sharedAchievement.findUnique({
    where: { publicToken: token },
    include: {
      client: { select: { name: true } },
    },
  })

  if (!achievement) {
    return { title: 'Prestation ej hittad' }
  }

  return {
    title: `${achievement.title} — ${achievement.client.name}`,
    description: achievement.description || 'En prestation delad via Trainomics',
    openGraph: {
      title: `${achievement.title} — ${achievement.client.name}`,
      description: achievement.description || 'En prestation delad via Trainomics',
      images: achievement.imageUrl
        ? [{ url: achievement.imageUrl, width: 1200, height: 630, alt: achievement.title }]
        : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${achievement.title} — ${achievement.client.name}`,
      description: achievement.description || 'En prestation delad via Trainomics',
      images: achievement.imageUrl ? [achievement.imageUrl] : [],
    },
  }
}
