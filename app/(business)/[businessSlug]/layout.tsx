// app/(business)/[businessSlug]/layout.tsx
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessLayoutProps {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessLayout({
  children,
  params,
}: BusinessLayoutProps) {
  const { businessSlug } = await params

  // Get current user
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/login?redirect=/${businessSlug}/coach/dashboard`)
  }

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    // User is not a member of this business or business doesn't exist
    notFound()
  }

  // Pass business context to children via layout
  return children
}
