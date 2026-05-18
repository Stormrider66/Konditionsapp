import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { getTranslations } from '@/i18n/server'
import {
  CoachDirectoryClient,
  type CoachDirectoryClientLabels,
} from '@/components/coaches/CoachDirectoryClient'

const SPORT_TYPES = [
  'RUNNING',
  'CYCLING',
  'TRIATHLON',
  'SWIMMING',
  'SKIING',
  'HYROX',
  'GENERAL_FITNESS',
  'FUNCTIONAL_FITNESS',
] as const

type SportType = (typeof SPORT_TYPES)[number]

export default async function CoachDirectoryPage() {
  const t = await getTranslations('pages.coaches.directory')
  const sportsT = await getTranslations('pages.coaches.sports')

  const localisedSportLabels: Record<SportType, string> = SPORT_TYPES.reduce(
    (acc, sportType) => {
      acc[sportType] = sportsT(sportType)
      return acc
    },
    {} as Record<SportType, string>
  )

  const tDirectoryLabels = {
    searchPlaceholder: t('labels.searchPlaceholder'),
    sportPlaceholder: t('labels.sportPlaceholder'),
    allSports: t('labels.allSports'),
    sortPlaceholder: t('labels.sortPlaceholder'),
    sortRating: t('labels.sortRating'),
    sortClients: t('labels.sortClients'),
    sortNewest: t('labels.sortNewest'),
    emptyState: t('labels.emptyState'),
    clients: t('labels.clients'),
    sportLabels: localisedSportLabels,
  }

  const clientLabels: CoachDirectoryClientLabels = tDirectoryLabels

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
              {t('navigation.features')}
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t('navigation.pricing')}
            </Link>
            <Link href="/coaches" className="text-primary font-semibold">
              {t('navigation.findCoach')}
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher showLabel={false} variant="ghost" />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t('navigation.login')}
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                {t('navigation.getStarted')}
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
              {t('hero.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {t('hero.subtitle')}
            </p>
          </div>
        </section>

        {/* Interactive filter + grid — the only client island on this page */}
        <CoachDirectoryClient labels={clientLabels} />

        {/* CTA Section */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t('cta.description')}
            </p>
            <Link href="/signup/coach">
              <Button size="lg">
                {t('cta.createProfile')}
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
