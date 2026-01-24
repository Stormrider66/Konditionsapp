'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Users,
    AlertTriangle,
    Activity,
    Stethoscope,
    Calendar,
    TrendingUp,
    Clock,
    ChevronRight,
    Ban,
    MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardStats {
    totalAthletes: number
    athletesWithActiveInjuries: number
    activeRehabPrograms: number
    pendingAcuteReports: number
    activeRestrictions: number
    unreadMessages: number
}

interface Athlete {
    id: string
    name: string
    email: string
    currentInjury: {
        injuryType: string
        bodyPart: string
        painLevel: number
    } | null
    stats: {
        activeInjuries: number
        activeRestrictions: number
    }
}

interface AcuteReport {
    id: string
    client: { name: string }
    bodyPart: string
    urgency: string
    incidentDate: string
    status: string
}

export default function PhysioDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [athletes, setAthletes] = useState<Athlete[]>([])
    const [acuteReports, setAcuteReports] = useState<AcuteReport[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch athletes
                const athletesRes = await fetch('/api/physio/athletes?hasActiveInjury=true&limit=5')
                if (athletesRes.ok) {
                    const data = await athletesRes.json()
                    setAthletes(data.athletes)
                }

                // Fetch acute reports
                const reportsRes = await fetch('/api/injury/acute-report?status=PENDING_REVIEW&limit=5')
                let reportsData: any[] = []
                if (reportsRes.ok) {
                    const data = await reportsRes.json()
                    reportsData = data.reports
                    setAcuteReports(data.reports)
                }

                // Calculate stats from the responses
                const allAthletesRes = await fetch('/api/physio/athletes')
                const restrictionsRes = await fetch('/api/physio/restrictions?activeOnly=true')
                const programsRes = await fetch('/api/physio/rehab-programs?status=ACTIVE')
                const threadsRes = await fetch('/api/care-team/threads')

                const [allAthletes, restrictions, programs, threads] = await Promise.all([
                    allAthletesRes.ok ? allAthletesRes.json() : { total: 0, athletes: [] },
                    restrictionsRes.ok ? restrictionsRes.json() : { total: 0 },
                    programsRes.ok ? programsRes.json() : { total: 0 },
                    threadsRes.ok ? threadsRes.json() : { threads: [] },
                ])

                const unreadCount = threads.threads?.reduce((sum: number, t: any) => sum + (t.unreadCount || 0), 0) || 0

                setStats({
                    totalAthletes: allAthletes.total,
                    athletesWithActiveInjuries: allAthletes.athletes?.filter((a: any) => a.stats?.activeInjuries > 0).length || 0,
                    activeRehabPrograms: programs.total,
                    pendingAcuteReports: reportsData.length,
                    activeRestrictions: restrictions.total,
                    unreadMessages: unreadCount,
                })
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    const urgencyColors: Record<string, string> = {
        EMERGENCY: 'bg-red-500/20 text-red-400 border-red-500/30',
        URGENT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 bg-slate-800/50" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-96 bg-slate-800/50" />
                    <Skeleton className="h-96 bg-slate-800/50" />
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Physio Dashboard</h1>
                <p className="text-slate-400">Manage your athletes, treatments, and rehabilitation programs</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Athletes</p>
                                <p className="text-3xl font-bold text-white">{stats?.totalAthletes || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Users className="w-6 h-6 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Active Injuries</p>
                                <p className="text-3xl font-bold text-white">{stats?.athletesWithActiveInjuries || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Active Rehab Programs</p>
                                <p className="text-3xl font-bold text-white">{stats?.activeRehabPrograms || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Active Restrictions</p>
                                <p className="text-3xl font-bold text-white">{stats?.activeRestrictions || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                <Ban className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Acute Reports */}
                <Card className="bg-slate-900/50 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Pending Acute Reports
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Injuries requiring your attention
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
                            <Link href="/physio/acute-reports">
                                View All
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {acuteReports.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No pending acute reports</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {acuteReports.map((report) => (
                                    <Link
                                        key={report.id}
                                        href={`/physio/acute-reports/${report.id}`}
                                        className="block p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-white/5"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-white">{report.client.name}</p>
                                                <p className="text-sm text-slate-400">{report.bodyPart}</p>
                                            </div>
                                            <Badge className={urgencyColors[report.urgency]}>
                                                {report.urgency}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                            <Clock className="w-3 h-3" />
                                            {new Date(report.incidentDate).toLocaleDateString()}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Athletes with Active Injuries */}
                <Card className="bg-slate-900/50 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                Athletes with Injuries
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Athletes currently in your care
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
                            <Link href="/physio/athletes">
                                View All
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {athletes.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No athletes with active injuries</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {athletes.map((athlete) => (
                                    <Link
                                        key={athlete.id}
                                        href={`/physio/athletes/${athlete.id}`}
                                        className="block p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-white/5"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-white">{athlete.name}</p>
                                                {athlete.currentInjury && (
                                                    <p className="text-sm text-slate-400">
                                                        {athlete.currentInjury.injuryType} - {athlete.currentInjury.bodyPart}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {athlete.stats.activeInjuries > 0 && (
                                                    <Badge variant="outline" className="border-red-500/30 text-red-400">
                                                        {athlete.stats.activeInjuries} injury
                                                    </Badge>
                                                )}
                                                {athlete.stats.activeRestrictions > 0 && (
                                                    <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                                                        {athlete.stats.activeRestrictions} restriction
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {athlete.currentInjury && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-xs text-slate-500">Pain Level:</span>
                                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                                        style={{ width: `${athlete.currentInjury.painLevel * 10}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-400">{athlete.currentInjury.painLevel}/10</span>
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-slate-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                        <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-slate-800/50 border-white/10 hover:bg-slate-800 hover:border-emerald-500/30">
                            <Link href="/physio/treatments/new">
                                <Stethoscope className="w-6 h-6 text-emerald-500" />
                                <span className="text-slate-200">New Treatment</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-slate-800/50 border-white/10 hover:bg-slate-800 hover:border-blue-500/30">
                            <Link href="/physio/rehab-programs/new">
                                <Activity className="w-6 h-6 text-blue-500" />
                                <span className="text-slate-200">New Rehab Program</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-slate-800/50 border-white/10 hover:bg-slate-800 hover:border-orange-500/30">
                            <Link href="/physio/screenings/new">
                                <TrendingUp className="w-6 h-6 text-orange-500" />
                                <span className="text-slate-200">New Screening</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-slate-800/50 border-white/10 hover:bg-slate-800 hover:border-purple-500/30">
                            <Link href="/physio/messages">
                                <MessageSquare className="w-6 h-6 text-purple-500" />
                                <span className="text-slate-200">Care Team Chat</span>
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Unread Messages */}
                {(stats?.unreadMessages || 0) > 0 && (
                    <Card className="bg-slate-900/50 border-white/10 border-purple-500/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <MessageSquare className="w-6 h-6 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Unread Messages</p>
                                        <p className="text-slate-400 text-sm">
                                            You have {stats?.unreadMessages} unread care team messages
                                        </p>
                                    </div>
                                </div>
                                <Button asChild className="bg-purple-500 hover:bg-purple-600">
                                    <Link href="/physio/messages">View Messages</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
