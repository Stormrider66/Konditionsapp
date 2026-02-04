'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  Search,
  MapPin,
  Star,
  Users,
  CheckCircle2,
  Filter,
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

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

interface Coach {
  id: string
  slug: string
  name: string
  headline: string | null
  bio: string | null
  imageUrl: string | null
  specialties: string[]
  methodologies: string[]
  experienceYears: number | null
  credentials: string[]
  isVerified: boolean
  location: string | null
  languages: string[]
  stats: {
    activeClients: number
    averageRating: number | null
    reviewCount: number
  }
}

export default function CoachDirectoryPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('rating')
  const [locale, setLocale] = useState<'en' | 'sv'>('sv')

  useEffect(() => {
    // Detect locale from browser or cookie
    const savedLocale = document.cookie.match(/locale=([^;]+)/)?.[1] as 'en' | 'sv' | undefined
    if (savedLocale) {
      setLocale(savedLocale)
    }
  }, [])

  useEffect(() => {
    const fetchCoaches = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (sportFilter && sportFilter !== 'all') {
          params.set('sport', sportFilter)
        }
        if (sortBy) {
          params.set('sort', sortBy)
        }

        const response = await fetch(`/api/coaches?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setCoaches(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch coaches:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCoaches()
  }, [sportFilter, sortBy])

  // Filter by search query (client-side)
  const filteredCoaches = coaches.filter(coach => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      coach.name.toLowerCase().includes(query) ||
      coach.headline?.toLowerCase().includes(query) ||
      coach.location?.toLowerCase().includes(query) ||
      coach.specialties.some(s => SPORT_LABELS[s]?.sv.toLowerCase().includes(query) || SPORT_LABELS[s]?.en.toLowerCase().includes(query))
    )
  })

  const t = (en: string, sv: string) => locale === 'sv' ? sv : en

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Star by Thomson</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/#features" className="text-muted-foreground hover:text-primary transition-colors">
              {t('Features', 'Funktioner')}
            </Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
              {t('Pricing', 'Priser')}
            </Link>
            <Link href="/coaches" className="text-primary font-semibold">
              {t('Find a Coach', 'Hitta en coach')}
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher showLabel={false} variant="ghost" />
            <Link href="/login">
              <Button variant="ghost" size="sm">{t('Log in', 'Logga in')}</Button>
            </Link>
            <Link href="/register">
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

        {/* Filters */}
        <section className="py-6 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('Search coaches, sports, or locations...', 'Sök coacher, sporter eller platser...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-4">
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder={t('Sport', 'Sport')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Sports', 'Alla sporter')}</SelectItem>
                    {Object.entries(SPORT_LABELS).map(([value, labels]) => (
                      <SelectItem key={value} value={value}>
                        {locale === 'sv' ? labels.sv : labels.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('Sort by', 'Sortera efter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">{t('Highest Rated', 'Högst betyg')}</SelectItem>
                    <SelectItem value="clients">{t('Most Clients', 'Flest klienter')}</SelectItem>
                    <SelectItem value="newest">{t('Newest', 'Nyast')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Coach Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCoaches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {t('No coaches found matching your criteria.', 'Inga coacher hittades som matchar dina kriterier.')}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCoaches.map((coach) => (
                  <Link key={coach.id} href={`/coaches/${coach.slug}`}>
                    <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={coach.imageUrl || undefined} alt={coach.name} />
                            <AvatarFallback className="text-lg">
                              {coach.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg truncate">{coach.name}</CardTitle>
                              {coach.isVerified && (
                                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            {coach.headline && (
                              <CardDescription className="line-clamp-2">
                                {coach.headline}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {coach.stats.averageRating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium text-foreground">
                                {coach.stats.averageRating.toFixed(1)}
                              </span>
                              <span>({coach.stats.reviewCount})</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{coach.stats.activeClients} {t('clients', 'klienter')}</span>
                          </div>
                        </div>

                        {/* Location */}
                        {coach.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{coach.location}</span>
                          </div>
                        )}

                        {/* Specialties */}
                        <div className="flex flex-wrap gap-2">
                          {coach.specialties.slice(0, 3).map((sport) => (
                            <Badge key={sport} variant="secondary" className="text-xs">
                              {locale === 'sv' ? SPORT_LABELS[sport]?.sv : SPORT_LABELS[sport]?.en || sport}
                            </Badge>
                          ))}
                          {coach.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{coach.specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

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
            <Link href="/register?role=coach">
              <Button size="lg">
                {t('Create Your Coach Profile', 'Skapa din coachprofil')}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-background border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Star by Thomson</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Star by Thomson.</p>
        </div>
      </footer>
    </div>
  )
}
