'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    User,
    AlertTriangle,
    Activity,
    Ban,
    Stethoscope,
    Calendar,
    TrendingUp,
    MessageSquare,
    FileText,
    ChevronRight,
    Plus,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from '@/i18n/client'

interface AthleteDetail {
    id: string
    name: string
    email: string
    gender: string | null
    birthDate: string | null
    height: number | null
    weight: number | null
    team: { id: string; name: string } | null
    sport: {
        sport: string
        discipline: string | null
        trainingAge: number | null
    } | null
    injuryAssessments: any[]
    trainingRestrictions: any[]
    rehabPrograms: any[]
    treatmentSessions: any[]
    dailyMetrics: any[]
    movementScreens: any[]
    acuteInjuryReports: any[]
    summary: {
        activeInjuries: number
        activeRestrictions: number
        activeRehabPrograms: number
        recentTreatments: number
        avgRecentPain: number | null
    }
}

interface PhysioAthleteDetailProps {
    athleteId: string
    basePath: string
}

export function PhysioAthleteDetail({ athleteId, basePath }: PhysioAthleteDetailProps) {
    const router = useRouter()
    const t = useTranslations('components.physioAthleteDetail')
    const [athlete, setAthlete] = useState<AthleteDetail | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAthlete = async () => {
            try {
                const res = await fetch(`/api/physio/athletes/${athleteId}`)
                if (res.ok) {
                    const data = await res.json()
                    setAthlete(data)
                } else if (res.status === 403 || res.status === 404) {
                    router.push(`${basePath}/athletes`)
                }
            } catch (error) {
                console.error('Error fetching athlete:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchAthlete()
    }, [athleteId, basePath, router])

    const severityColors: Record<string, string> = {
        MILD: 'bg-green-500/20 text-green-400 border-green-500/30',
        MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        SEVERE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        COMPLETE: 'bg-red-500/20 text-red-400 border-red-500/30',
    }

    const phaseColors: Record<string, string> = {
        ACUTE: 'bg-red-500/20 text-red-400',
        SUBACUTE: 'bg-orange-500/20 text-orange-400',
        REMODELING: 'bg-yellow-500/20 text-yellow-400',
        FUNCTIONAL: 'bg-blue-500/20 text-blue-400',
        RETURN_TO_SPORT: 'bg-green-500/20 text-green-400',
    }

    const formatPhase = (phase: string) => {
        return t(`phases.${phase}` as any)
    }

    const formatRestrictionType = (value: string) => {
        return value.replace(/_/g, ' ')
    }

    const formatSeverity = (severity: string) => {
        return t(`severity.${severity}` as any)
    }

    const formatTreatmentType = (value: string) => {
        switch (value) {
            case 'INITIAL_ASSESSMENT':
                return t('treatmentTypes.initialAssessment')
            case 'FOLLOW_UP':
                return t('treatmentTypes.followUp')
            case 'MANUAL_THERAPY':
                return t('treatmentTypes.manualTherapy')
            case 'DRY_NEEDLING':
                return t('treatmentTypes.dryNeedling')
            case 'EXERCISE_THERAPY':
                return t('treatmentTypes.exerciseTherapy')
            case 'ELECTROTHERAPY':
                return t('treatmentTypes.electrotherapy')
            case 'ULTRASOUND':
                return t('treatmentTypes.ultrasound')
            case 'TAPING':
                return t('treatmentTypes.taping')
            case 'MASSAGE':
                return t('treatmentTypes.massage')
            case 'STRETCHING':
                return t('treatmentTypes.stretching')
            case 'MOBILIZATION':
                return t('treatmentTypes.mobilization')
            case 'DISCHARGE':
                return t('treatmentTypes.discharge')
            case 'OTHER':
                return t('treatmentTypes.other')
            default:
                return value.replace(/_/g, ' ')
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-8 w-32 mb-8 bg-slate-800/50" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 bg-slate-800/50" />
                    <Skeleton className="h-64 lg:col-span-2 bg-slate-800/50" />
                </div>
            </div>
        )
    }

    if (!athlete) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-slate-400">{t('errors.notFound')}</p>
            </div>
        )
    }

    const calculateAge = (birthDate: string | null) => {
        if (!birthDate) return null
        const birth = new Date(birthDate)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--
        }
        return age
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <Button
                variant="ghost"
                className="mb-6 text-slate-400 hover:text-white"
                onClick={() => router.back()}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('actions.backToAthletes')}
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Athlete Info */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <Card className="bg-slate-900/50 border-white/10">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <User className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">{athlete.name}</h1>
                                    <p className="text-slate-400">{athlete.email}</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                {athlete.birthDate && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">{t('profile.age.label')}</span>
                                        <span className="text-white">{calculateAge(athlete.birthDate)} {t('profile.age.unit')}</span>
                                    </div>
                                )}
                                {athlete.gender && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">{t('profile.gender')}</span>
                                        <span className="text-white capitalize">{athlete.gender.toLowerCase()}</span>
                                    </div>
                                )}
                                {athlete.height && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">{t('profile.height.label')}</span>
                                        <span className="text-white">{athlete.height} {t('profile.height.unit')}</span>
                                    </div>
                                )}
                                {athlete.weight && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">{t('profile.weight.label')}</span>
                                        <span className="text-white">{athlete.weight} {t('profile.weight.unit')}</span>
                                    </div>
                                )}
                                {athlete.team && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">{t('profile.team')}</span>
                                        <span className="text-white">{athlete.team.name}</span>
                                    </div>
                                )}
                                {athlete.sport && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">{t('profile.sport')}</span>
                                        <span className="text-white">
                                            {athlete.sport.sport}
                                            {athlete.sport.discipline && ` - ${athlete.sport.discipline}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Card */}
                    <Card className="bg-slate-900/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">{t('stats.title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded-lg bg-red-500/10">
                                <p className="text-2xl font-bold text-red-400">{athlete.summary.activeInjuries}</p>
                                <p className="text-xs text-slate-400">{t('stats.activeInjuries')}</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-orange-500/10">
                                <p className="text-2xl font-bold text-orange-400">{athlete.summary.activeRestrictions}</p>
                                <p className="text-xs text-slate-400">{t('stats.activeRestrictions')}</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-blue-500/10">
                                <p className="text-2xl font-bold text-blue-400">{athlete.summary.activeRehabPrograms}</p>
                                <p className="text-xs text-slate-400">{t('stats.activeRehabPrograms')}</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                                <p className="text-2xl font-bold text-emerald-400">{athlete.summary.recentTreatments}</p>
                                <p className="text-xs text-slate-400">{t('stats.recentTreatments')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="bg-slate-900/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">{t('quickActions.title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button asChild className="w-full justify-start bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400">
                                <Link href={`${basePath}/treatments/new?clientId=${athlete.id}`}>
                                    <Stethoscope className="w-4 h-4 mr-2" />
                                    {t('quickActions.newTreatmentSession')}
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-start border-white/10 text-slate-300 hover:text-white">
                                <Link href={`${basePath}/rehab-programs/new?clientId=${athlete.id}`}>
                                    <Activity className="w-4 h-4 mr-2" />
                                    {t('quickActions.createRehabProgram')}
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-start border-white/10 text-slate-300 hover:text-white">
                                <Link href={`${basePath}/restrictions/new?clientId=${athlete.id}`}>
                                    <Ban className="w-4 h-4 mr-2" />
                                    {t('quickActions.addRestriction')}
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-start border-white/10 text-slate-300 hover:text-white">
                                <Link href={`${basePath}/screenings/new?clientId=${athlete.id}`}>
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    {t('quickActions.movementScreen')}
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-start border-white/10 text-slate-300 hover:text-white">
                                <Link href={`${basePath}/messages?clientId=${athlete.id}`}>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    {t('quickActions.careTeamChat')}
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Tabs */}
                <div className="lg:col-span-2">
                    <Tabs defaultValue="injuries" className="w-full">
                        <TabsList className="bg-slate-900/50 border border-white/10 w-full justify-start mb-4">
                            <TabsTrigger value="injuries" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                                {t('tabs.injuries')}
                            </TabsTrigger>
                            <TabsTrigger value="restrictions" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                                {t('tabs.restrictions')}
                            </TabsTrigger>
                            <TabsTrigger value="rehab" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                                {t('tabs.rehab')}
                            </TabsTrigger>
                            <TabsTrigger value="treatments" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                                {t('tabs.treatments')}
                            </TabsTrigger>
                            <TabsTrigger value="metrics" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                                {t('tabs.checkIns')}
                            </TabsTrigger>
                        </TabsList>

                        {/* Injuries Tab */}
                        <TabsContent value="injuries">
                            <Card className="bg-slate-900/50 border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                        {t('sections.activeInjuries')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {athlete.injuryAssessments.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">{t('empty.noActiveInjuries')}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {athlete.injuryAssessments.map((injury: any) => (
                                                <div
                                                    key={injury.id}
                                                    className="p-4 rounded-lg bg-slate-800/50 border border-white/5"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <p className="font-medium text-white">{injury.injuryType}</p>
                                                            <p className="text-sm text-slate-400">{injury.bodyPart}</p>
                                                        </div>
                                                        <Badge className={phaseColors[injury.phase] || ''}>
                                                            {formatPhase(injury.phase)}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <span className="text-xs text-slate-500">{t('labels.pain')}:</span>
                                                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                                                style={{ width: `${injury.painLevel * 10}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-slate-400">{injury.painLevel}/10</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        {t('labels.assessed')}: {new Date(injury.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Restrictions Tab */}
                        <TabsContent value="restrictions">
                            <Card className="bg-slate-900/50 border-white/10">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Ban className="w-5 h-5 text-orange-500" />
                                        {t('sections.activeRestrictions')}
                                    </CardTitle>
                                    <Button asChild size="sm" className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400">
                                        <Link href={`${basePath}/restrictions/new?clientId=${athlete.id}`}>
                                            <Plus className="w-4 h-4 mr-1" />
                                            {t('actions.add')}
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {athlete.trainingRestrictions.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">{t('empty.noActiveRestrictions')}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {athlete.trainingRestrictions.map((restriction: any) => (
                                                <div
                                                    key={restriction.id}
                                                    className="p-4 rounded-lg bg-slate-800/50 border border-white/5"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <p className="font-medium text-white">
                                                                {formatRestrictionType(restriction.type)}
                                                            </p>
                                                            {restriction.bodyParts?.length > 0 && (
                                                                <p className="text-sm text-slate-400">
                                                                    {restriction.bodyParts.join(', ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <Badge className={severityColors[restriction.severity] || ''}>
                                                            {formatSeverity(restriction.severity)}
                                                        </Badge>
                                                    </div>
                                                    {restriction.reason && (
                                                        <p className="text-sm text-slate-400 mt-2">{restriction.reason}</p>
                                                    )}
                                                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                                                        <span>{t('labels.createdBy')}: {restriction.createdBy?.name || t('labels.unknown')}</span>
                                                        {restriction.endDate && (
                                                            <span>{t('labels.until')}: {new Date(restriction.endDate).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Rehab Tab */}
                        <TabsContent value="rehab">
                            <Card className="bg-slate-900/50 border-white/10">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-blue-500" />
                                        {t('sections.rehabPrograms')}
                                    </CardTitle>
                                    <Button asChild size="sm" className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400">
                                        <Link href={`${basePath}/rehab-programs/new?clientId=${athlete.id}`}>
                                            <Plus className="w-4 h-4 mr-1" />
                                            {t('actions.create')}
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {athlete.rehabPrograms.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">{t('empty.noActiveRehabPrograms')}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {athlete.rehabPrograms.map((program: any) => (
                                                <Link
                                                    key={program.id}
                                                    href={`${basePath}/rehab-programs/${program.id}`}
                                                    className="block p-4 rounded-lg bg-slate-800/50 border border-white/5 hover:border-blue-500/30 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <p className="font-medium text-white">{program.name}</p>
                                                            {program.injury && (
                                                                <p className="text-sm text-slate-400">
                                                                    {program.injury.injuryType} - {program.injury.bodyPart}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge className={phaseColors[program.currentPhase] || ''}>
                                                                {formatPhase(program.currentPhase)}
                                                            </Badge>
                                                            <ChevronRight className="w-4 h-4 text-slate-600" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                                        <span>{program.exercises?.length || 0} {t('labels.exercises')}</span>
                                                        <span>{program.milestones?.length || 0} {t('labels.milestones')}</span>
                                                        <span>{program._count?.progressLogs || 0} {t('labels.logs')}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Treatments Tab */}
                        <TabsContent value="treatments">
                            <Card className="bg-slate-900/50 border-white/10">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Stethoscope className="w-5 h-5 text-emerald-500" />
                                        {t('sections.recentTreatments')}
                                    </CardTitle>
                                    <Button asChild size="sm" className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400">
                                        <Link href={`${basePath}/treatments/new?clientId=${athlete.id}`}>
                                            <Plus className="w-4 h-4 mr-1" />
                                            {t('actions.new')}
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {athlete.treatmentSessions.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">{t('empty.noTreatmentSessions')}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {athlete.treatmentSessions.map((session: any) => (
                                                <Link
                                                    key={session.id}
                                                    href={`${basePath}/treatments/${session.id}`}
                                                    className="block p-4 rounded-lg bg-slate-800/50 border border-white/5 hover:border-emerald-500/30 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <p className="font-medium text-white">
                                                                {formatTreatmentType(session.treatmentType)}
                                                            </p>
                                                            <p className="text-sm text-slate-400">
                                                                {new Date(session.sessionDate).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                                    </div>
                                                    {(session.painBefore !== null || session.painAfter !== null) && (
                                                        <div className="flex items-center gap-4 text-sm">
                                                            {session.painBefore !== null && (
                                                                <span className="text-slate-400">
                                                                    {t('labels.painBefore')}: <span className="text-white">{session.painBefore}/10</span>
                                                                </span>
                                                            )}
                                                            {session.painAfter !== null && (
                                                                <span className="text-slate-400">
                                                                    {t('labels.after')}: <span className="text-white">{session.painAfter}/10</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                    <Button asChild variant="ghost" className="w-full mt-4 text-slate-400 hover:text-white">
                                        <Link href={`${basePath}/athletes/${athlete.id}/history`}>
                                            {t('actions.viewFullHistory')}
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Check-ins Tab */}
                        <TabsContent value="metrics">
                            <Card className="bg-slate-900/50 border-white/10">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-purple-500" />
                                        {t('sections.recentCheckIns')}
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        {t('descriptions.recentCheckIns')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {athlete.dailyMetrics.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">{t('empty.noRecentCheckIns')}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {athlete.dailyMetrics.map((metric: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                                                >
                                                    <span className="text-slate-300">
                                                        {new Date(metric.date).toLocaleDateString()}
                                                    </span>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        {metric.injuryPain !== null && (
                                                            <span className="text-slate-400">
                                                                {t('labels.pain')}: <span className="text-white">{metric.injuryPain}/10</span>
                                                            </span>
                                                        )}
                                                        {metric.soreness !== null && (
                                                            <span className="text-slate-400">
                                                                {t('labels.soreness')}: <span className="text-white">{metric.soreness}/10</span>
                                                            </span>
                                                        )}
                                                        {metric.readinessLevel !== null && (
                                                            <span className="text-slate-400">
                                                                {t('labels.readiness')}: <span className="text-white">{metric.readinessLevel}/10</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
