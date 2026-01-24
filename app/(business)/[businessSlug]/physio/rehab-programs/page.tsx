'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
    Activity,
    Search,
    Filter,
    Plus,
    ChevronRight,
    User,
    Target,
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

interface RehabProgram {
    id: string
    name: string
    description: string | null
    status: string
    currentPhase: string
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
        phase: string
    } | null
    exercises: any[]
    milestones: any[]
    _count: {
        exercises: number
        milestones: number
        progressLogs: number
    }
}

const phaseLabels: Record<string, string> = {
    ACUTE: 'Acute',
    SUBACUTE: 'Subacute',
    REMODELING: 'Remodeling',
    FUNCTIONAL: 'Functional',
    RETURN_TO_SPORT: 'Return to Sport',
}

const phaseColors: Record<string, string> = {
    ACUTE: 'bg-red-500/20 text-red-400 border-red-500/30',
    SUBACUTE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    REMODELING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    FUNCTIONAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    RETURN_TO_SPORT: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-500/20 text-slate-400',
    ACTIVE: 'bg-emerald-500/20 text-emerald-400',
    PAUSED: 'bg-yellow-500/20 text-yellow-400',
    COMPLETED: 'bg-blue-500/20 text-blue-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
}

export default function BusinessPhysioRehabProgramsPage() {
    const params = useParams()
    const businessSlug = params.businessSlug as string
    const basePath = `/${businessSlug}/physio`

    const [programs, setPrograms] = useState<RehabProgram[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ACTIVE')
    const [phaseFilter, setPhaseFilter] = useState<string>('all')
    const [total, setTotal] = useState(0)

    useEffect(() => {
        const fetchPrograms = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                if (statusFilter && statusFilter !== 'all') {
                    params.set('status', statusFilter)
                }
                if (phaseFilter && phaseFilter !== 'all') {
                    params.set('phase', phaseFilter)
                }

                const res = await fetch(`/api/physio/rehab-programs?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    // Filter by search client-side
                    let filtered = data.programs
                    if (search) {
                        const searchLower = search.toLowerCase()
                        filtered = filtered.filter((p: RehabProgram) =>
                            p.name.toLowerCase().includes(searchLower) ||
                            p.client.name.toLowerCase().includes(searchLower)
                        )
                    }
                    setPrograms(filtered)
                    setTotal(data.total)
                }
            } catch (error) {
                console.error('Error fetching rehab programs:', error)
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(fetchPrograms, 300)
        return () => clearTimeout(debounce)
    }, [search, statusFilter, phaseFilter])

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Rehab Programs</h1>
                    <p className="text-slate-400">Manage rehabilitation programs for your athletes</p>
                </div>
                <Button asChild className="bg-blue-500 hover:bg-blue-600">
                    <Link href={`${basePath}/rehab-programs/new`}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Program
                    </Link>
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by program name or athlete..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-slate-900/50 border-white/10 text-white">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="all" className="text-slate-200">All Status</SelectItem>
                        <SelectItem value="ACTIVE" className="text-slate-200">Active</SelectItem>
                        <SelectItem value="DRAFT" className="text-slate-200">Draft</SelectItem>
                        <SelectItem value="PAUSED" className="text-slate-200">Paused</SelectItem>
                        <SelectItem value="COMPLETED" className="text-slate-200">Completed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                    <SelectTrigger className="w-[180px] bg-slate-900/50 border-white/10 text-white">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Phase" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="all" className="text-slate-200">All Phases</SelectItem>
                        {Object.entries(phaseLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value} className="text-slate-200">
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Results count */}
            <p className="text-slate-400 text-sm mb-4">
                Showing {programs.length} rehab programs
            </p>

            {/* Programs Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48 bg-slate-800/50" />
                    ))}
                </div>
            ) : programs.length === 0 ? (
                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-12 text-center">
                        <Activity className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400 text-lg">No rehab programs found</p>
                        <p className="text-slate-500 text-sm mt-2 mb-4">
                            {search ? 'Try adjusting your search or filters' : 'Start by creating your first rehab program'}
                        </p>
                        <Button asChild className="bg-blue-500 hover:bg-blue-600">
                            <Link href={`${basePath}/rehab-programs/new`}>
                                <Plus className="w-4 h-4 mr-2" />
                                New Program
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {programs.map((program) => (
                        <Link
                            key={program.id}
                            href={`${basePath}/rehab-programs/${program.id}`}
                            className="block"
                        >
                            <Card className="bg-slate-900/50 border-white/10 hover:border-blue-500/30 transition-all h-full">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white text-lg truncate">{program.name}</h3>
                                            <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                                                <User className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{program.client.name}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
                                    </div>

                                    {/* Status and Phase Badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <Badge className={statusColors[program.status] || 'bg-slate-500/20 text-slate-400'}>
                                            {program.status}
                                        </Badge>
                                        <Badge className={phaseColors[program.currentPhase] || 'bg-slate-500/20 text-slate-400'}>
                                            {phaseLabels[program.currentPhase] || program.currentPhase}
                                        </Badge>
                                    </div>

                                    {/* Injury Info */}
                                    {program.injury && (
                                        <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                                            <p className="text-sm text-slate-300">{program.injury.injuryType}</p>
                                            <p className="text-xs text-slate-500">{program.injury.bodyPart}</p>
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Activity className="w-3 h-3" />
                                            <span>{program._count.exercises} exercises</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Target className="w-3 h-3" />
                                            <span>{program._count.milestones} milestones</span>
                                        </div>
                                    </div>

                                    {/* Milestone Progress */}
                                    {program.milestones && program.milestones.length > 0 && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-slate-500">Milestone Progress</span>
                                                <span className="text-slate-400">
                                                    {program.milestones.filter((m: any) => m.achieved).length}/{program.milestones.length}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{
                                                        width: `${(program.milestones.filter((m: any) => m.achieved).length / program.milestones.length) * 100}%`
                                                    }}
                                                />
                                            </div>
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
