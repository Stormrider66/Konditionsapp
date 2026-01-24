'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
    Stethoscope,
    Search,
    Filter,
    Plus,
    ChevronRight,
    User,
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

interface TreatmentSession {
    id: string
    sessionDate: string
    treatmentType: string
    painBefore: number | null
    painAfter: number | null
    modalitiesUsed: string[]
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
}

const treatmentTypeLabels: Record<string, string> = {
    INITIAL_ASSESSMENT: 'Initial Assessment',
    FOLLOW_UP: 'Follow-up',
    MANUAL_THERAPY: 'Manual Therapy',
    DRY_NEEDLING: 'Dry Needling',
    EXERCISE_THERAPY: 'Exercise Therapy',
    ELECTROTHERAPY: 'Electrotherapy',
    ULTRASOUND: 'Ultrasound',
    TAPING: 'Taping',
    MASSAGE: 'Massage',
    STRETCHING: 'Stretching',
    MOBILIZATION: 'Mobilization',
    DISCHARGE: 'Discharge',
    OTHER: 'Other',
}

export default function BusinessPhysioTreatmentsPage() {
    const params = useParams()
    const businessSlug = params.businessSlug as string
    const basePath = `/${businessSlug}/physio`

    const [treatments, setTreatments] = useState<TreatmentSession[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [treatmentType, setTreatmentType] = useState<string>('all')
    const [total, setTotal] = useState(0)

    useEffect(() => {
        const fetchTreatments = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                if (treatmentType && treatmentType !== 'all') {
                    params.set('treatmentType', treatmentType)
                }

                const res = await fetch(`/api/physio/treatments?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    // Filter by search client-side
                    let filtered = data.sessions
                    if (search) {
                        const searchLower = search.toLowerCase()
                        filtered = filtered.filter((t: TreatmentSession) =>
                            t.client.name.toLowerCase().includes(searchLower) ||
                            t.client.email.toLowerCase().includes(searchLower)
                        )
                    }
                    setTreatments(filtered)
                    setTotal(data.total)
                }
            } catch (error) {
                console.error('Error fetching treatments:', error)
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(fetchTreatments, 300)
        return () => clearTimeout(debounce)
    }, [search, treatmentType])

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Treatment Sessions</h1>
                    <p className="text-slate-400">View and manage your treatment sessions</p>
                </div>
                <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
                    <Link href={`${basePath}/treatments/new`}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Treatment
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
                <Select value={treatmentType} onValueChange={setTreatmentType}>
                    <SelectTrigger className="w-[200px] bg-slate-900/50 border-white/10 text-white">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Treatment Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="all" className="text-slate-200">All Types</SelectItem>
                        {Object.entries(treatmentTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value} className="text-slate-200">
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Results count */}
            <p className="text-slate-400 text-sm mb-4">
                Showing {treatments.length} treatment sessions
            </p>

            {/* Treatments List */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 bg-slate-800/50" />
                    ))}
                </div>
            ) : treatments.length === 0 ? (
                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-12 text-center">
                        <Stethoscope className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400 text-lg">No treatment sessions found</p>
                        <p className="text-slate-500 text-sm mt-2 mb-4">
                            Start by creating your first treatment session
                        </p>
                        <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
                            <Link href={`${basePath}/treatments/new`}>
                                <Plus className="w-4 h-4 mr-2" />
                                New Treatment
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {treatments.map((treatment) => (
                        <Link
                            key={treatment.id}
                            href={`${basePath}/treatments/${treatment.id}`}
                            className="block"
                        >
                            <Card className="bg-slate-900/50 border-white/10 hover:border-emerald-500/30 transition-all">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                                <Stethoscope className="w-6 h-6 text-emerald-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-semibold text-white">
                                                        {treatmentTypeLabels[treatment.treatmentType] || treatment.treatmentType}
                                                    </h3>
                                                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                                                        {new Date(treatment.sessionDate).toLocaleDateString()}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                    <User className="w-4 h-4" />
                                                    <span>{treatment.client.name}</span>
                                                </div>
                                                {treatment.injury && (
                                                    <p className="text-slate-500 text-sm mt-1">
                                                        {treatment.injury.injuryType} - {treatment.injury.bodyPart}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {(treatment.painBefore !== null || treatment.painAfter !== null) && (
                                                <div className="text-right text-sm">
                                                    {treatment.painBefore !== null && (
                                                        <div className="text-slate-400">
                                                            Before: <span className="text-white">{treatment.painBefore}/10</span>
                                                        </div>
                                                    )}
                                                    {treatment.painAfter !== null && (
                                                        <div className="text-slate-400">
                                                            After: <span className={treatment.painAfter < (treatment.painBefore || 0) ? 'text-green-400' : 'text-white'}>{treatment.painAfter}/10</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <ChevronRight className="w-5 h-5 text-slate-600" />
                                        </div>
                                    </div>
                                    {treatment.modalitiesUsed && treatment.modalitiesUsed.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3 ml-16">
                                            {treatment.modalitiesUsed.slice(0, 4).map((modality, idx) => (
                                                <Badge key={idx} variant="outline" className="text-xs border-slate-700 text-slate-400">
                                                    {modality}
                                                </Badge>
                                            ))}
                                            {treatment.modalitiesUsed.length > 4 && (
                                                <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                                                    +{treatment.modalitiesUsed.length - 4} more
                                                </Badge>
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
