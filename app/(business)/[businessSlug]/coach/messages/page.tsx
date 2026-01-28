// app/(business)/[businessSlug]/coach/messages/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import MessagesClient from './MessagesClient'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessMessagesPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <MessagesClient />
}
