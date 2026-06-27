// app/(business)/[businessSlug]/coach/settings/athlete-profile/page.tsx
import { getCurrentUser } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { AthleteProfileSetupForm } from '@/components/coach/AthleteProfileSetupForm'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle, User } from 'lucide-react'
import Link from 'next/link'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'

interface BusinessAthleteProfileSettingsPageProps {
  params: Promise<{ businessSlug: string }>
}

function formatMetric(value: number | null | undefined, unit: string) {
  return value == null ? 'Not set' : `${value} ${unit}`
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'
}

export default async function BusinessAthleteProfileSettingsPage({ params }: BusinessAthleteProfileSettingsPageProps) {
  const { businessSlug } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  if (!(await canAccessCoachPlatform(user.id))) {
    redirect(`/${businessSlug}/coach/dashboard`)
  }

  const basePath = `/${businessSlug}`

  // Check if user already has an athlete profile
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      selfAthleteClientId: true,
      selfAthleteClient: {
        select: {
          id: true,
          name: true,
          email: true,
          gender: true,
          birthDate: true,
          height: true,
          weight: true,
        },
      },
    },
  })

  const hasAthleteProfile = !!fullUser?.selfAthleteClientId
  const profile = fullUser?.selfAthleteClient

  return (
    <RolePageFrame contentClassName="max-w-3xl">
      <RolePageHeader
        eyebrow="Settings"
        title="Athlete Mode"
        description="Manage your personal athlete profile for self-coaching and checking the athlete experience."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/coach/dashboard`}>
              Back to Dashboard
            </Link>
          </Button>
        }
      />

      <div className="space-y-5">
        {hasAthleteProfile && profile ? (
          <RolePanel className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Athlete profile active</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Your personal athlete profile is ready for athlete-mode tracking.
                  </p>
                </div>
              </div>
              <Button asChild size="sm">
                <Link href={`${basePath}/athlete/dashboard`}>
                  <User className="h-4 w-4" />
                  Athlete Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">Name</p>
                <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-100">{profile.name}</p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">Gender</p>
                <p className="mt-2 text-sm font-medium capitalize text-zinc-950 dark:text-zinc-100">
                  {profile.gender?.toLowerCase() || 'Not set'}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">Birth date</p>
                <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-100">{formatDate(profile.birthDate)}</p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">Email</p>
                <p className="mt-2 truncate text-sm font-medium text-zinc-950 dark:text-zinc-100">{profile.email || 'Not set'}</p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">Height</p>
                <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-100">
                  {formatMetric(profile.height, 'cm')}
                </p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">Weight</p>
                <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-zinc-100">
                  {formatMetric(profile.weight, 'kg')}
                </p>
              </div>
            </div>
          </RolePanel>
        ) : (
          <AthleteProfileSetupForm userName={user.name} />
        )}

        <RolePanel className="p-5">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Athlete-mode access</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Use the athlete view when you want to log your own training, test program flows personally, or review the athlete experience from inside the platform.
          </p>
        </RolePanel>
      </div>
    </RolePageFrame>
  )
}
