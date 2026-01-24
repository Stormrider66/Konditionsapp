'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Users,
    Search,
    Filter,
    AlertTriangle,
    Activity,
    Ban,
    ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Athlete {
    id: string
    name: string
    email: string
    gender: string | null
    birthDate: string | null
    team: { id: string; name: string } | null
    stats: {
        activeInjuries: number
        activeRestrictions: number
        activeRehabPrograms: number
        totalTreatmentSessions: number
    }
    currentInjury: {
        id: string
        injuryType: string
        bodyPart: string
        painLevel: number
        phase: string
    } | null
    activeRestrictions: {
        id: string
        type: string
        severity: string
        endDate: string | null
    }[]
    activeRehabProgram: {
        id: string
        name: string
        currentPhase: string
    } | null
    latestCheckIn: {
        date: string
        injuryPain: number | null
        readinessLevel: number | null
    } | null
}

export default function PhysioAthletesPage() {
    const [athletes, setAthletes] = useState<Athlete[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'injured' | 'restricted'>('all')
    const [total, setTotal] = useState(0)

    useEffect(() => {
        const fetchAthletes = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                if (search) params.set('search', search)
                if (filter === 'injured') params.set('hasActiveInjury', 'true')
                if (filter === 'restricted') params.set('hasActiveRestriction', 'true')

                const res = await fetch(`/api/physio/athletes?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    setAthletes(data.athletes)
                    setTotal(data.total)
                }
            } catch (error) {
                console.error('Error fetching athletes:', error)
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(fetchAthletes, 300)
        return () => clearTimeout(debounce)
    }, [search, filter])

    const severityColors: Record<string, string> = {
        MILD: 'bg-green-500/20 text-green-400',
        MODERATE: 'bg-yellow-500/20 text-yellow-400',
        SEVERE: 'bg-orange-500/20 text-orange-400',
        COMPLETE: 'bg-red-500/20 text-red-400',
    }

    const phaseColors: Record<string, string> = {
        ACUTE: 'bg-red-500/20 text-red-400',
        SUBACUTE: 'bg-orange-500/20 text-orange-400',
        REMODELING: 'bg-yellow-500/20 text-yellow-400',
        FUNCTIONAL: 'bg-blue-500/20 text-blue-400',
        RETURN_TO_SPORT: 'bg-green-500/20 text-green-400',
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Athletes</h1>
                <p className="text-slate-400">Manage and monitor your assigned athletes</p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search athletes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                </div>
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <SelectTrigger className="w-[180px] bg-slate-900/50 border-white/10 text-white">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="all" className="text-slate-200">All Athletes</SelectItem>
                        <SelectItem value="injured" className="text-slate-200">With Injuries</SelectItem>
                        <SelectItem value="restricted" className="text-slate-200">With Restrictions</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Results count */}
            <p className="text-slate-400 text-sm mb-4">
                Showing {athletes.length} of {total} athletes
            </p>

            {/* Athletes Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48 bg-slate-800/50" />
                    ))}
                </div>
            ) : athletes.length === 0 ? (
                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-12 text-center">
                        <Users className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400 text-lg">No athletes found</p>
                        <p className="text-slate-500 text-sm mt-2">
                            {search ? 'Try adjusting your search terms' : 'You have no assigned athletes'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {athletes.map((athlete) => (
                        <Link
                            key={athlete.id}
                            href={`/physio/athletes/${athlete.id}`}
                            className="block"
                        >
                            <Card className="bg-slate-900/50 border-white/10 hover:border-emerald-500/30 transition-all h-full">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-white text-lg">{athlete.name}</h3>
                                            <p className="text-slate-400 text-sm">{athlete.email}</p>
                                            {athlete.team && (
                                                <p className="text-slate-500 text-xs mt-1">{athlete.team.name}</p>
                                            )}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-600" />
                                    </div>

                                    {/* Status Badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {athlete.stats.activeInjuries > 0 && (
                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                {athlete.stats.activeInjuries} Injury
                                            </Badge>
                                        )}
                                        {athlete.stats.activeRestrictions > 0 && (
                                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                                <Ban className="w-3 h-3 mr-1" />
                                                {athlete.stats.activeRestrictions} Restriction
                                            </Badge>
                                        )}
                                        {athlete.stats.activeRehabPrograms > 0 && (
                                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                <Activity className="w-3 h-3 mr-1" />
                                                In Rehab
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Current Injury */}
                                    {athlete.currentInjury && (
                                        <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-slate-300">
                                                    {athlete.currentInjury.injuryType}
                                                </span>
                                                <Badge className={phaseColors[athlete.currentInjury.phase] || 'bg-slate-500/20 text-slate-400'}>
                                                    {athlete.currentInjury.phase}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-2">{athlete.currentInjury.bodyPart}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">Pain:</span>
                                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                                        style={{ width: `${athlete.currentInjury.painLevel * 10}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-400">{athlete.currentInjury.painLevel}/10</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Restrictions */}
                                    {athlete.activeRestrictions.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {athlete.activeRestrictions.slice(0, 2).map((restriction) => (
                                                <Badge
                                                    key={restriction.id}
                                                    variant="outline"
                                                    className={`text-xs ${severityColors[restriction.severity] || ''}`}
                                                >
                                                    {restriction.type.replace(/_/g, ' ')}
                                                </Badge>
                                            ))}
                                            {athlete.activeRestrictions.length > 2 && (
                                                <Badge variant="outline" className="text-xs text-slate-400">
                                                    +{athlete.activeRestrictions.length - 2} more
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    {/* Latest Check-in */}
                                    {athlete.latestCheckIn && (
                                        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
                                            Last check-in: {new Date(athlete.latestCheckIn.date).toLocaleDateString()}
                                            {athlete.latestCheckIn.injuryPain !== null && (
                                                <span className="ml-2">
                                                    Pain: {athlete.latestCheckIn.injuryPain}/10
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
