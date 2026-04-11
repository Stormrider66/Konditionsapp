'use client'

/**
 * Client island for the public /coaches directory.
 *
 * Holds the interactive bits — search text, sport filter, sort order,
 * and the fetch-on-filter-change behaviour — while the surrounding
 * page shell (header, hero, CTA, footer) stays a server component.
 *
 * All translation strings are pre-resolved on the server and passed
 * in as props so this file doesn't need any client-side i18n.
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, MapPin, Star, Users, CheckCircle2, Filter } from 'lucide-react'

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

interface SportLabels {
  [sportKey: string]: string
}

export interface CoachDirectoryClientLabels {
  searchPlaceholder: string
  sportPlaceholder: string
  allSports: string
  sortPlaceholder: string
  sortRating: string
  sortClients: string
  sortNewest: string
  emptyState: string
  clients: string
  /** Per-sport labels already localised to the active locale. */
  sportLabels: SportLabels
}

interface CoachDirectoryClientProps {
  labels: CoachDirectoryClientLabels
}

export function CoachDirectoryClient({ labels }: CoachDirectoryClientProps) {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('rating')

  useEffect(() => {
    let cancelled = false
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

        if (!cancelled && data.success) {
          setCoaches(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch coaches:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchCoaches()
    return () => {
      cancelled = true
    }
  }, [sportFilter, sortBy])

  const filteredCoaches = useMemo(() => {
    if (!searchQuery) return coaches
    const query = searchQuery.toLowerCase()
    return coaches.filter((coach) => {
      return (
        coach.name.toLowerCase().includes(query) ||
        coach.headline?.toLowerCase().includes(query) ||
        coach.location?.toLowerCase().includes(query) ||
        coach.specialties.some((s) =>
          labels.sportLabels[s]?.toLowerCase().includes(query)
        )
      )
    })
  }, [coaches, searchQuery, labels.sportLabels])

  return (
    <>
      {/* Filters */}
      <section className="py-6 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={labels.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-4">
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={labels.sportPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{labels.allSports}</SelectItem>
                  {Object.entries(labels.sportLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={labels.sortPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">{labels.sortRating}</SelectItem>
                  <SelectItem value="clients">{labels.sortClients}</SelectItem>
                  <SelectItem value="newest">{labels.sortNewest}</SelectItem>
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
              <p className="text-lg text-muted-foreground">{labels.emptyState}</p>
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
                            {coach.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
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
                          <span>
                            {coach.stats.activeClients} {labels.clients}
                          </span>
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
                            {labels.sportLabels[sport] ?? sport}
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
    </>
  )
}

