'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
    Ban,
    Search,
    Filter,
    Plus,
    Calendar,
    User,
    ChevronRight,
    AlertTriangle,
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

interface TrainingRestriction {
    id: string
    type: string
    severity: string
    source: string
    bodyParts: string[]
    affectedWorkoutTypes: string[]
    description: string | null
    reason: string | null
    endDate: string | null
    isActive: boolean
    createdAt: string
    client: {
        id: string
        name: string
        email: string
    }
    injury: {
        id: string
        injuryType: string
        bodyPart: string
    } | null
    createdBy: {
        id: string
        name: string
        role: string
    }
}

const restrictionTypeLabels: Record<string, string> = {
    NO_RUNNING: 'No Running',
    NO_JUMPING: 'No Jumping',
    NO_IMPACT: 'No Impact',
    NO_UPPER_BODY: 'No Upper Body',
    NO_LOWER_BODY: 'No Lower Body',
    REDUCED_VOLUME: 'Reduced Volume',
    REDUCED_INTENSITY: 'Reduced Intensity',
    MODIFIED_ONLY: 'Modified Only',
    SPECIFIC_EXERCISES: 'Specific Exercises',
    CUSTOM: 'Custom',
}

const severityColors: Record<string, string> = {
    MILD: 'bg-green-500/20 text-green-400 border-green-500/30',
    MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    SEVERE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    COMPLETE: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const sourceLabels: Record<string, string> = {
    INJURY_CASCADE: 'Injury Cascade',
    PHYSIO_MANUAL: 'Physio',
    COACH_MANUAL: 'Coach',
    AI_RECOMMENDED: 'AI Recommended',
}

export default function BusinessPhysioRestrictionsPage() {
    const params = useParams()
    const businessSlug = params.businessSlug as string
    const basePath = `/${businessSlug}/physio`

    const [restrictions, setRestrictions] = useState<TrainingRestriction[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState<'active' | 'all'>('active')
    const [total, setTotal] = useState(0)

    useEffect(() => {
        const fetchRestrictions = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                params.set('activeOnly', activeFilter === 'active' ? 'true' : 'false')

                const res = await fetch(`/api/physio/restrictions?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    // Filter by search client-side
                    let filtered = data.restrictions
                    if (search) {
                        const searchLower = search.toLowerCase()
                        filtered = filtered.filter((r: TrainingRestriction) =>
                            r.client.name.toLowerCase().includes(searchLower) ||
                            r.type.toLowerCase().includes(searchLower)
                        )
                    }
                    setRestrictions(filtered)
                    setTotal(data.total)
                }
            } catch (error) {
                console.error('Error fetching restrictions:', error)
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(fetchRestrictions, 300)
        return () => clearTimeout(debounce)
    }, [search, activeFilter])

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Training Restrictions</h1>
                    <p className="text-slate-400">Manage training restrictions for your athletes</p>
                </div>
                <Button asChild className="bg-orange-500 hover:bg-orange-600">
                    <Link href={`${basePath}/restrictions/new`}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Restriction
                    </Link>
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by athlete name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                </div>
                <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
                    <SelectTrigger className="w-[180px] bg-slate-900/50 border-white/10 text-white">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="active" className="text-slate-200">Active Only</SelectItem>
                        <SelectItem value="all" className="text-slate-200">All Restrictions</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Results count */}
            <p className="text-slate-400 text-sm mb-4">
                Showing {restrictions.length} of {total} restrictions
            </p>

            {/* Restrictions List */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 bg-slate-800/50" />
                    ))}
                </div>
            ) : restrictions.length === 0 ? (
                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-12 text-center">
                        <Ban className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400 text-lg">No restrictions found</p>
                        <p className="text-slate-500 text-sm mt-2 mb-4">
                            {activeFilter === 'active' ? 'No active restrictions at this time' : 'Create a restriction for an athlete'}
                        </p>
                        <Button asChild className="bg-orange-500 hover:bg-orange-600">
                            <Link href={`${basePath}/restrictions/new`}>
                                <Plus className="w-4 h-4 mr-2" />
                                New Restriction
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {restrictions.map((restriction) => (
                        <Link
                            key={restriction.id}
                            href={`${basePath}/restrictions/${restriction.id}`}
                            className="block"
                        >
                            <Card className={`bg-slate-900/50 border-white/10 hover:border-orange-500/30 transition-all ${!restriction.isActive ? 'opacity-60' : ''}`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                                <Ban className="w-6 h-6 text-orange-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-semibold text-white">
                                                        {restrictionTypeLabels[restriction.type] || restriction.type}
                                                    </h3>
                                                    <Badge className={severityColors[restriction.severity]}>
                                                        {restriction.severity}
                                                    </Badge>
                                                    {!restriction.isActive && (
                                                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                                    <User className="w-4 h-4" />
                                                    <span>{restriction.client.name}</span>
                                                    <span className="text-slate-600">•</span>
                                                    <span className="text-slate-500">{sourceLabels[restriction.source] || restriction.source}</span>
                                                </div>
                                                {restriction.injury && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        <span>{restriction.injury.injuryType} - {restriction.injury.bodyPart}</span>
                                                    </div>
                                                )}
                                                {restriction.bodyParts && restriction.bodyParts.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {restriction.bodyParts.map((part, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-xs border-slate-700 text-slate-400">
                                                                {part}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {restriction.endDate && (
                                                <div className="text-right text-sm text-slate-500">
                                                    <Calendar className="w-3 h-3 inline mr-1" />
                                                    Until {new Date(restriction.endDate).toLocaleDateString()}
                                                </div>
                                            )}
                                            <ChevronRight className="w-5 h-5 text-slate-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
