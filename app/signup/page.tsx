'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Dumbbell, Building2, Users, Crown, Stethoscope } from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useTranslations } from '@/i18n/client'

const ROLES = [
  {
    id: 'athlete',
    icon: User,
    href: '/signup/athlete',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderHover: 'hover:border-blue-300',
  },
  {
    id: 'coach',
    icon: Dumbbell,
    href: '/signup/coach',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderHover: 'hover:border-green-300',
  },
  {
    id: 'physio',
    icon: Stethoscope,
    href: '/signup/physio',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderHover: 'hover:border-emerald-300',
  },
  {
    id: 'gym',
    icon: Building2,
    href: '/signup/gym',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderHover: 'hover:border-purple-300',
  },
  {
    id: 'team',
    icon: Users,
    href: '/signup/team',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderHover: 'hover:border-orange-300',
  },
  {
    id: 'enterprise',
    icon: Crown,
    href: '/contact',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderHover: 'hover:border-amber-300',
  },
] as const

function RoleSelectorContent() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const [invitationRedirectResolved, setInvitationRedirectResolved] = useState(false)
  const [inviteRedirectResolved, setInviteRedirectResolved] = useState(false)

  // If there's an invite code, redirect directly to athlete signup
  const invite = searchParams.get('invite')
  useEffect(() => {
    if (!invite || inviteRedirectResolved) return
    window.location.href = `/signup/athlete?invite=${encodeURIComponent(invite)}`
    setInviteRedirectResolved(true)
  }, [invite, inviteRedirectResolved])

  // If there's a business invitation code, redirect to the invited role signup
  const invitation = searchParams.get('invitation')
  useEffect(() => {
    if (!invitation || invitationRedirectResolved) return

    fetch(`/api/business/invitations/validate?code=${encodeURIComponent(invitation)}`)
      .then((res) => res.json())
      .then((data) => {
        const target = data?.role === 'PHYSIO' ? 'physio' : 'coach'
        window.location.href = `/signup/${target}?invitation=${encodeURIComponent(invitation)}`
      })
      .catch(() => {
        window.location.href = `/signup/coach?invitation=${encodeURIComponent(invitation)}`
      })
      .finally(() => {
        setInvitationRedirectResolved(true)
      })
  }, [invitation, invitationRedirectResolved])

  if (invite) {
    return null
  }

  if (invitation) {
    return null
  }

  const mode = searchParams.get('mode')
  const tier = searchParams.get('tier')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('signupChooser.title')}</h1>
          <p className="mt-2 text-gray-600">{t('signupChooser.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((role) => {
            const Icon = role.icon
            const params = new URLSearchParams()
            if (role.id === 'athlete') {
              if (mode) params.set('mode', mode)
              if (tier) params.set('tier', tier)
            }
            const href = params.size > 0 ? `${role.href}?${params.toString()}` : role.href

            return (
              <Link key={role.id} href={href} className="block">
                <Card className={`h-full transition-all duration-200 border-2 border-transparent ${role.borderHover} hover:shadow-md cursor-pointer`}>
                  <CardContent className="p-6 flex flex-col items-center text-center h-full">
                    <div className={`w-14 h-14 ${role.bgColor} rounded-full flex items-center justify-center mb-4`}>
                      <Icon className={`h-7 w-7 ${role.color}`} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      {t(`signupChooser.roles.${role.id}.title`)}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {t(`signupChooser.roles.${role.id}.description`)}
                    </p>
                    <Button
                      variant={role.id === 'enterprise' ? 'outline' : 'default'}
                      className="w-full"
                    >
                      {role.id === 'enterprise' ? t('signupChooser.contactUs') : t('signupChooser.getStarted')}
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              {t('signInLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  const tCommon = useTranslations('common')

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">{tCommon('loading')}</div>
      </div>
    }>
      <RoleSelectorContent />
    </Suspense>
  )
}
