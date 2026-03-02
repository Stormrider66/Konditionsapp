'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Dumbbell, Building2, Users, Crown } from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useTranslations } from '@/i18n/client'

const ROLES = [
  {
    id: 'athlete',
    icon: User,
    title: 'Atlet',
    description: 'Skapa ett atletkonto för att logga träning, få AI-coachning och följa din utveckling.',
    href: '/signup/athlete',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderHover: 'hover:border-blue-300',
  },
  {
    id: 'coach',
    icon: Dumbbell,
    title: 'PT / Coach',
    description: 'Hantera dina atleter, skapa träningsprogram och använd avancerade analysverktyg.',
    href: '/signup/coach',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderHover: 'hover:border-green-300',
  },
  {
    id: 'gym',
    icon: Building2,
    title: 'Gym',
    description: 'Skapa ett gymkonto med stöd för flera coacher, teamhantering och anpassad branding.',
    href: '/signup/gym',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderHover: 'hover:border-purple-300',
  },
  {
    id: 'team',
    icon: Users,
    title: 'Team / Förening',
    description: 'Klubbar och föreningar med atletportal, laghantering och träningsprogram.',
    href: '/signup/team',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderHover: 'hover:border-orange-300',
  },
  {
    id: 'enterprise',
    icon: Crown,
    title: 'Enterprise',
    description: 'Skräddarsydda lösningar för större organisationer med dedikerad support.',
    href: '/contact',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderHover: 'hover:border-amber-300',
    cta: 'Kontakta oss',
  },
] as const

function RoleSelectorContent() {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()

  // If there's an invite code, redirect directly to athlete signup
  const invite = searchParams.get('invite')
  if (invite) {
    if (typeof window !== 'undefined') {
      window.location.href = `/signup/athlete?invite=${encodeURIComponent(invite)}`
    }
    return null
  }

  // If there's a business invitation code, redirect to coach signup
  const invitation = searchParams.get('invitation')
  if (invitation) {
    if (typeof window !== 'undefined') {
      window.location.href = `/signup/coach?invitation=${encodeURIComponent(invitation)}`
    }
    return null
  }

  const mode = searchParams.get('mode')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showLabel={false} />
      </div>

      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Skapa ditt konto</h1>
          <p className="mt-2 text-gray-600">Välj den kontotyp som passar dig bäst</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((role) => {
            const Icon = role.icon
            const href = mode && role.id === 'athlete'
              ? `${role.href}?mode=${mode}`
              : role.href

            return (
              <Link key={role.id} href={href} className="block">
                <Card className={`h-full transition-all duration-200 border-2 border-transparent ${role.borderHover} hover:shadow-md cursor-pointer`}>
                  <CardContent className="p-6 flex flex-col items-center text-center h-full">
                    <div className={`w-14 h-14 ${role.bgColor} rounded-full flex items-center justify-center mb-4`}>
                      <Icon className={`h-7 w-7 ${role.color}`} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{role.title}</h2>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{role.description}</p>
                    <Button
                      variant={role.id === 'enterprise' ? 'outline' : 'default'}
                      className="w-full"
                    >
                      {role.id === 'enterprise' ? 'Kontakta oss' : 'Kom igång'}
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
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Laddar...</div>
      </div>
    }>
      <RoleSelectorContent />
    </Suspense>
  )
}
