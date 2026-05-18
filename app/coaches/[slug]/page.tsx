'use client'

import Link from 'next/link'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Image from 'next/image'
import {
  MapPin,
  Star,
  Users,
  CheckCircle2,
  Clock,
  Globe,
  Award,
  ArrowLeft,
  MessageSquare,
  Send,
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useToast } from '@/hooks/use-toast'
import { useLocale, useTranslations } from '@/i18n/client'

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

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  isVerified: boolean
  athleteName: string
  createdAt: string
}

interface CoachProfile {
  id: string
  slug: string
  name: string
  headline: string | null
  bio: string | null
  imageUrl: string | null
  coverImageUrl: string | null
  specialties: string[]
  methodologies: string[]
  experienceYears: number | null
  credentials: string[]
  isVerified: boolean
  isAcceptingClients: boolean
  location: string | null
  timezone: string | null
  languages: string[]
  stats: {
    totalClients: number
    activeClients: number
    averageRating: number | null
    reviewCount: number
  }
  reviews: Review[]
}

interface Props {
  params: Promise<{
    slug: string
  }>
}

export default function CoachProfilePage({ params }: Props) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [coach, setCoach] = useState<CoachProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const locale = useLocale()
  const t = useTranslations('pages.coachProfile')
  const sportsT = useTranslations('pages.coaches.sports')
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch('/api/users/me')
        const data = await res.json()
        if (data.success) {
          setIsLoggedIn(true)
        }
      } catch {
        // Not logged in
      }
    }

    void checkLogin()
  }, [])

  useEffect(() => {
    const fetchCoach = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/coaches/${resolvedParams.slug}`)
        const data = await response.json()

        if (data.success) {
          setCoach(data.data)
        } else {
          setError(data.error || t('errors.profileLoadFailed'))
        }
    } catch (_error) {
      console.error('Failed to fetch coach:', _error)
      setError(t('errors.profileLoadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

    void fetchCoach()
  }, [resolvedParams.slug, t])

  const handleRequestCoach = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/coaches/${resolvedParams.slug}`)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/athlete/coach-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachUserId: coach?.id, // We need the user ID, not profile ID
          message: requestMessage,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t('notifications.requestSent.title'),
          description: t('notifications.requestSent.description'),
        })
        setIsRequestDialogOpen(false)
        setRequestMessage('')
      } else {
        toast({
          title: t('notifications.requestError.title'),
          description: data.error || t('notifications.requestError.description'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('notifications.requestError.title'),
        description: t('notifications.requestError.description'),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const sportLabels: Record<SportType, string> = SPORT_TYPES.reduce(
    (acc, sportType) => {
      acc[sportType] = sportsT(sportType)
      return acc
    },
    {} as Record<SportType, string>
  )
  const getSportLabel = (sport: string) => sportLabels[sport as SportType] || sport

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-48 w-full rounded-xl mb-6" />
            <div className="flex gap-6">
              <Skeleton className="w-32 h-32 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !coach) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {t('notFound.title')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('notFound.description')}
          </p>
          <Link href="/coaches">
            <Button>{t('notFound.browseCoaches')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="Trainomics" width={140} height={40} className="h-9 w-auto" />
          </Link>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher showLabel={false} variant="ghost" />
            {!isLoggedIn && (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">{t('navigation.login')}</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    {t('actions.getStarted')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pb-16">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-4">
          <Link href="/coaches" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('navigation.backToCoaches')}
          </Link>
        </div>

        {/* Cover Image */}
        {coach.coverImageUrl ? (
          <div className="w-full h-48 md:h-64 bg-cover bg-center" style={{ backgroundImage: `url(${coach.coverImageUrl})` }} />
        ) : (
          <div className="w-full h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/5" />
        )}

        {/* Profile Header */}
        <div className="container mx-auto px-4 -mt-16 md:-mt-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                <AvatarImage src={coach.imageUrl || undefined} alt={coach.name} />
                <AvatarFallback className="text-3xl">
                  {coach.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 pt-4 md:pt-8">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{coach.name}</h1>
                  {coach.isVerified && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('badges.verified')}
                    </Badge>
                  )}
                </div>
                {coach.headline && (
                  <p className="text-lg text-muted-foreground mb-4">{coach.headline}</p>
                )}

                {/* Stats Row */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  {coach.stats.averageRating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-foreground">{coach.stats.averageRating.toFixed(1)}</span>
                      <span>({coach.stats.reviewCount} {t('stats.reviews')})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{coach.stats.activeClients} {t('stats.activeClients')}</span>
                  </div>
                  {coach.experienceYears && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{coach.experienceYears} {t('stats.yearsExperience')}</span>
                    </div>
                  )}
                  {coach.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{coach.location}</span>
                    </div>
                  )}
                  {coach.languages.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <span>{coach.languages.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                {coach.isAcceptingClients ? (
                  <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="mt-2">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {t('actions.requestToConnect')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {t('request.connectWith')} {coach.name}
                        </DialogTitle>
                        <DialogDescription>
                          {t('request.description')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Textarea
                          placeholder={t('request.placeholder')}
                          value={requestMessage}
                          onChange={(e) => setRequestMessage(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                          {t('actions.cancel')}
                        </Button>
                        <Button onClick={handleRequestCoach} disabled={isSubmitting}>
                          {isSubmitting ? (
                            t('request.sending')
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              {t('request.send')}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Badge variant="secondary" className="mt-2">
                    {t('badges.notAcceptingClients')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="container mx-auto px-4 mt-8">
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-8">
              {/* About */}
              {coach.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('sections.about')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-muted-foreground">{coach.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Reviews */}
              {coach.reviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('sections.reviews')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {coach.reviews.map((review) => (
                      <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                          {review.isVerified && (
                            <Badge variant="outline" className="text-xs">
                              {t('badges.verified')}
                            </Badge>
                          )}
                        </div>
                        {review.title && (
                          <p className="font-medium mb-1">{review.title}</p>
                        )}
                        {review.comment && (
                          <p className="text-muted-foreground text-sm">{review.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {review.athleteName} - {new Date(review.createdAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Specialties */}
              {coach.specialties.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('sections.specialties')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {coach.specialties.map((sport) => (
                        <Badge key={sport} variant="secondary">
                          {getSportLabel(sport)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Methodologies */}
              {coach.methodologies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('sections.trainingMethods')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {coach.methodologies.map((method) => (
                        <Badge key={method} variant="outline">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Credentials */}
              {coach.credentials.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      {t('sections.credentials')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {coach.credentials.map((credential, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          {credential}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 bg-background border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="Trainomics" width={120} height={34} className="h-7 w-auto" />
          </div>
          <p>&copy; {new Date().getFullYear()} Trainomics.</p>
        </div>
      </footer>
    </div>
  )
}
