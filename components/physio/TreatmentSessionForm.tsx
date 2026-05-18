'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Stethoscope,
    User,
    Save,
    AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useTranslations } from '@/i18n/client'

interface Athlete {
    id: string
    name: string
    email: string
    injuryAssessments?: {
        id: string
        injuryType: string
        bodyPart: string
    }[]
}

interface TreatmentSessionFormProps {
    preselectedClientId?: string
    preselectedInjuryId?: string
    basePath?: string
}

type SelectOption = { value: string; label: string }

export function TreatmentSessionForm({ preselectedClientId, preselectedInjuryId, basePath = '' }: TreatmentSessionFormProps) {
    const router = useRouter()
    const t = useTranslations('components.treatmentSessionForm')
    const [loading, setLoading] = useState(false)
    const [athletes, setAthletes] = useState<Athlete[]>([])
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)

    const treatmentTypes: SelectOption[] = [
        { value: 'INITIAL_ASSESSMENT', label: t('treatmentTypes.initialAssessment') },
        { value: 'FOLLOW_UP', label: t('treatmentTypes.followUp') },
        { value: 'MANUAL_THERAPY', label: t('treatmentTypes.manualTherapy') },
        { value: 'DRY_NEEDLING', label: t('treatmentTypes.dryNeedling') },
        { value: 'EXERCISE_THERAPY', label: t('treatmentTypes.exerciseTherapy') },
        { value: 'ELECTROTHERAPY', label: t('treatmentTypes.electrotherapy') },
        { value: 'ULTRASOUND', label: t('treatmentTypes.ultrasound') },
        { value: 'TAPING', label: t('treatmentTypes.taping') },
        { value: 'MASSAGE', label: t('treatmentTypes.massage') },
        { value: 'STRETCHING', label: t('treatmentTypes.stretching') },
        { value: 'MOBILIZATION', label: t('treatmentTypes.mobilization') },
        { value: 'DISCHARGE', label: t('treatmentTypes.discharge') },
        { value: 'OTHER', label: t('treatmentTypes.other') },
    ]

    const modalities: SelectOption[] = [
        { value: 'Ice', label: t('modalities.ice') },
        { value: 'Heat', label: t('modalities.heat') },
        { value: 'TENS', label: t('modalities.tens') },
        { value: 'Ultrasound', label: t('modalities.ultrasound') },
        { value: 'Laser', label: t('modalities.laser') },
        { value: 'Shockwave', label: t('modalities.shockwave') },
        { value: 'Cupping', label: t('modalities.cupping') },
        { value: 'Kinesio Tape', label: t('modalities.kinesioTape') },
        { value: 'Rigid Tape', label: t('modalities.rigidTape') },
        { value: 'Foam Rolling', label: t('modalities.foamRolling') },
        { value: 'Instrument Assisted Soft Tissue', label: t('modalities.instrumentAssistedSoftTissue') },
    ]

    // Form state
    const [formData, setFormData] = useState({
        clientId: preselectedClientId || '',
        injuryId: preselectedInjuryId || '',
        treatmentType: 'FOLLOW_UP',
        sessionDate: new Date().toISOString().split('T')[0],
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        painBefore: 5,
        painAfter: 5,
        modalitiesUsed: [] as string[],
        exercisesPrescribed: '',
        homeExerciseProgram: '',
        notes: '',
    })

    // Fetch athletes on mount
    useEffect(() => {
        const fetchAthletes = async () => {
            try {
                const res = await fetch('/api/physio/athletes')
                if (res.ok) {
                    const data = await res.json()
                    setAthletes(data.athletes)

                    // If preselected, find and set the athlete
                    if (preselectedClientId) {
                        const athlete = data.athletes.find((a: Athlete) => a.id === preselectedClientId)
                        if (athlete) {
                            setSelectedAthlete(athlete)
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching athletes:', error)
            }
        }

        fetchAthletes()
    }, [preselectedClientId])

    // When athlete changes, fetch their details including injuries
    useEffect(() => {
        if (formData.clientId && formData.clientId !== selectedAthlete?.id) {
            const fetchAthleteDetails = async () => {
                try {
                    const res = await fetch(`/api/physio/athletes/${formData.clientId}`)
                    if (res.ok) {
                        const data = await res.json()
                        setSelectedAthlete(data)
                    }
                } catch (error) {
                    console.error('Error fetching athlete details:', error)
                }
            }

            fetchAthleteDetails()
        }
    }, [formData.clientId, selectedAthlete?.id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/physio/treatments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    sessionDate: new Date(formData.sessionDate).toISOString(),
                    injuryId: formData.injuryId || undefined,
                    exercisesPrescribed: formData.exercisesPrescribed
                        ? formData.exercisesPrescribed.split('\n').filter(Boolean)
                        : [],
                }),
            })

            if (res.ok) {
                const data = await res.json()
                router.push(basePath ? `${basePath}/treatments/${data.id}` : '/login')
            } else {
                const error = await res.json()
                alert(error.error || t('alerts.failedToCreate'))
            }
        } catch (error) {
            console.error('Error creating treatment:', error)
            alert(t('alerts.failedToCreate'))
        } finally {
            setLoading(false)
        }
    }

    const toggleModality = (modality: string) => {
        setFormData(prev => ({
            ...prev,
            modalitiesUsed: prev.modalitiesUsed.includes(modality)
                ? prev.modalitiesUsed.filter(m => m !== modality)
                : [...prev.modalitiesUsed, modality]
        }))
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Athlete Selection */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-emerald-500" />
                        {t('sections.athlete')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="text-slate-300">{t('fields.selectAthlete')}</Label>
                        <Select
                            value={formData.clientId}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value, injuryId: '' }))}
                        >
                            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                                <SelectValue placeholder={t('placeholders.selectAthlete')} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10">
                                {athletes.map((athlete) => (
                                    <SelectItem key={athlete.id} value={athlete.id} className="text-slate-200">
                                        {athlete.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedAthlete?.injuryAssessments && selectedAthlete.injuryAssessments.length > 0 && (
                        <div>
                            <Label className="text-slate-300">{t('fields.relatedInjury')}</Label>
                            <Select
                                value={formData.injuryId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, injuryId: value }))}
                            >
                                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                                    <SelectValue placeholder={t('placeholders.selectInjury')} />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                    <SelectItem value="" className="text-slate-200">{t('selection.none')}</SelectItem>
                                    {selectedAthlete.injuryAssessments.map((injury) => (
                                        <SelectItem key={injury.id} value={injury.id} className="text-slate-200">
                                            {injury.injuryType} - {injury.bodyPart}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Session Details */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-emerald-500" />
                        {t('sections.session')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-300">{t('fields.treatmentType')}</Label>
                            <Select
                                value={formData.treatmentType}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, treatmentType: value }))}
                            >
                                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                    {treatmentTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value} className="text-slate-200">
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-slate-300">{t('fields.sessionDate')}</Label>
                            <Input
                                type="date"
                                value={formData.sessionDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, sessionDate: e.target.value }))}
                                className="bg-slate-800 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    {/* Pain Levels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="text-slate-300 mb-2 block">
                                {t('fields.painBefore')}: <span className="text-white">{formData.painBefore}/10</span>
                            </Label>
                            <Slider
                                value={[formData.painBefore]}
                                onValueChange={([value]) => setFormData(prev => ({ ...prev, painBefore: value }))}
                                min={0}
                                max={10}
                                step={1}
                                className="py-4"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-300 mb-2 block">
                                {t('fields.painAfter')}: <span className="text-white">{formData.painAfter}/10</span>
                            </Label>
                            <Slider
                                value={[formData.painAfter]}
                                onValueChange={([value]) => setFormData(prev => ({ ...prev, painAfter: value }))}
                                min={0}
                                max={10}
                                step={1}
                                className="py-4"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* SOAP Notes */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">{t('sections.soapNotes')} <InfoTooltip conceptKey="soapNotes" /></CardTitle>
                    <CardDescription className="text-slate-400">
                        {t('descriptions.soapNotes')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="text-slate-300">{t('fields.subjective')}</Label>
                        <Textarea
                            value={formData.subjective}
                            onChange={(e) => setFormData(prev => ({ ...prev, subjective: e.target.value }))}
                            placeholder={t('placeholders.subjective')}
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">{t('fields.objective')}</Label>
                        <Textarea
                            value={formData.objective}
                            onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                            placeholder={t('placeholders.objective')}
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">{t('fields.assessment')}</Label>
                        <Textarea
                            value={formData.assessment}
                            onChange={(e) => setFormData(prev => ({ ...prev, assessment: e.target.value }))}
                            placeholder={t('placeholders.assessment')}
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">{t('fields.plan')}</Label>
                        <Textarea
                            value={formData.plan}
                            onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                            placeholder={t('placeholders.plan')}
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Modalities Used */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">{t('sections.modalities')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {modalities.map((modality) => (
                            <label
                                key={modality.value}
                                className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                                    formData.modalitiesUsed.includes(modality.value)
                                        ? 'bg-emerald-500/20 border border-emerald-500/30'
                                        : 'bg-slate-800/50 border border-white/5 hover:border-white/10'
                                }`}
                            >
                                <Checkbox
                                    checked={formData.modalitiesUsed.includes(modality.value)}
                                    onCheckedChange={() => toggleModality(modality.value)}
                                />
                                <span className="text-sm text-slate-200">{modality.label}</span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Exercise Prescription */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">{t('sections.exercisePrescription')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="text-slate-300">
                            {t('fields.exercisesPrescribed')}
                        </Label>
                        <Textarea
                            value={formData.exercisesPrescribed}
                            onChange={(e) => setFormData(prev => ({ ...prev, exercisesPrescribed: e.target.value }))}
                            placeholder={t('placeholders.exercisesPrescribed')}
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">{t('fields.homeExerciseNotes')}</Label>
                        <Textarea
                            value={formData.homeExerciseProgram}
                            onChange={(e) => setFormData(prev => ({ ...prev, homeExerciseProgram: e.target.value }))}
                            placeholder={t('placeholders.homeExerciseNotes')}
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[80px]"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">{t('sections.additionalNotes')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t('placeholders.additionalNotes')}
                        className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                    />
                </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="border-white/10 text-slate-300 hover:text-white"
                >
                    {t('actions.cancel')}
                </Button>
                <Button
                    type="submit"
                    disabled={loading || !formData.clientId}
                    className="bg-emerald-500 hover:bg-emerald-600"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? t('states.saving') : t('actions.saveTreatment')}
                </Button>
            </div>
        </form>
    )
}
