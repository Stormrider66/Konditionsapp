import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import {
  CoachDirectoryClient,
  type CoachDirectoryClientLabels,
} from '@/components/coaches/CoachDirectoryClient'

// Sport type labels
const SPORT_LABELS: Record<string, { en: string; sv: string }> = {
  RUNNING: { en: 'Running', sv: 'Löpning' },
  CYCLING: { en: 'Cycling', sv: 'Cykling' },
  TRIATHLON: { en: 'Triathlon', sv: 'Triathlon' },
  SWIMMING: { en: 'Swimming', sv: 'Simning' },
  SKIING: { en: 'Skiing', sv: 'Skidåkning' },
  HYROX: { en: 'HYROX', sv: 'HYROX' },
  GENERAL_FITNESS: { en: 'General Fitness', sv: 'Allmän fitness' },
  FUNCTIONAL_FITNESS: { en: 'Functional Fitness', sv: 'Funktionell fitness' },
}

type PublicLocale = 'en' | 'sv'

/**
 * Returns a translator that matches the legacy inline helper
 * `t(en, sv)` the page used to have — except we resolve the locale
 * from a cookie on the server instead of `document.cookie` at runtime.
 */
function makeTranslator(locale: PublicLocale) {
  return (en: string, sv: string) => (locale === 'sv' ? sv : en)
}

function resolveLocaleSync(cookieValue: string | undefined): PublicLocale {
  return cookieValue === 'en' ? 'en' : 'sv'
}

export default async function CoachDirectoryPage() {
  const cookieStore = await cookies()
  const locale = resolveLocaleSync(cookieStore.get('locale')?.value)
  const t = makeTranslator(locale)

  // Pre-localise the sport labels that the client island needs so the
  // client component doesn't need to know about SPORT_LABELS at all.
  const localisedSportLabels: Record<string, string> = Object.fromEntries(
    Object.entries(SPORT_LABELS).map(([key, labels]) => [
      key,
      locale === 'sv' ? labels.sv : labels.en,
    ])
  )

  const clientLabels: CoachDirectoryClientLabels = {
    searchPlaceholder: t(
      'Search coaches, sports, or locations...',
      'Sök coacher, sporter eller platser...'
    ),
    sportPlaceholder: t('Sport', 'Sport'),
    allSports: t('All Sports', 'Alla sporter'),
    sortPlaceholder: t('Sort by', 'Sortera efter'),
    sortRating: t('Highest Rated', 'Högst betyg'),
    sortClients: t('Most Clients', 'Flest klienter'),
    sortNewest: t('Newest', 'Nyast'),
    emptyState: t(
      'No coaches found matching your criteria.',
      'Inga coacher hittades som matchar dina kriterier.'
    ),
    clients: t('clients', 'klienter'),
    sportLabels: localisedSportLabels,
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Trainomics"
              width={140}
              height={40}
              className="h-9 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/#features"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t('Features', 'Funktioner')}
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t('Pricing', 'Priser')}
            </Link>
            <Link href="/coaches" className="text-primary font-semibold">
              {t('Find a Coach', 'Hitta en coach')}
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher showLabel={false} variant="ghost" />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t('Log in', 'Logga in')}
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                {t('Get Started', 'Kom igång')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 lg:py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              {t('Find Your Perfect Coach', 'Hitta din perfekta coach')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {t(
                'Browse certified coaches specializing in your sport and connect directly for personalized training.',
                'Bläddra bland certifierade coacher som specialiserar sig på din sport och anslut direkt för personlig träning.'
              )}
            </p>
          </div>
        </section>

        {/* Interactive filter + grid — the only client island on this page */}
        <CoachDirectoryClient labels={clientLabels} />

        {/* CTA Section */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t('Are you a coach?', 'Är du en coach?')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t(
                'Join our marketplace and connect with athletes looking for professional coaching.',
                'Gå med i vår marknadsplats och anslut till atleter som letar efter professionell coaching.'
              )}
            </p>
            <Link href="/signup/coach">
              <Button size="lg">
                {t('Create Your Coach Profile', 'Skapa din coachprofil')}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-background border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Trainomics"
              width={120}
              height={34}
              className="h-7 w-auto"
            />
          </div>
          <p>&copy; {new Date().getFullYear()} Trainomics.</p>
        </div>
      </footer>
    </div>
  )
}
