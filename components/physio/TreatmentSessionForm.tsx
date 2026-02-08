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

const treatmentTypes = [
    { value: 'INITIAL_ASSESSMENT', label: 'Initial Assessment' },
    { value: 'FOLLOW_UP', label: 'Follow-up' },
    { value: 'MANUAL_THERAPY', label: 'Manual Therapy' },
    { value: 'DRY_NEEDLING', label: 'Dry Needling' },
    { value: 'EXERCISE_THERAPY', label: 'Exercise Therapy' },
    { value: 'ELECTROTHERAPY', label: 'Electrotherapy' },
    { value: 'ULTRASOUND', label: 'Ultrasound' },
    { value: 'TAPING', label: 'Taping' },
    { value: 'MASSAGE', label: 'Massage' },
    { value: 'STRETCHING', label: 'Stretching' },
    { value: 'MOBILIZATION', label: 'Mobilization' },
    { value: 'DISCHARGE', label: 'Discharge' },
    { value: 'OTHER', label: 'Other' },
]

const modalities = [
    'Ice',
    'Heat',
    'TENS',
    'Ultrasound',
    'Laser',
    'Shockwave',
    'Cupping',
    'Kinesio Tape',
    'Rigid Tape',
    'Foam Rolling',
    'Instrument Assisted Soft Tissue',
]

export function TreatmentSessionForm({ preselectedClientId, preselectedInjuryId, basePath = '/physio' }: TreatmentSessionFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [athletes, setAthletes] = useState<Athlete[]>([])
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)

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
                router.push(`${basePath}/treatments/${data.id}`)
            } else {
                const error = await res.json()
                alert(error.error || 'Failed to create treatment session')
            }
        } catch (error) {
            console.error('Error creating treatment:', error)
            alert('Failed to create treatment session')
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
                        Athlete
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="text-slate-300">Select Athlete</Label>
                        <Select
                            value={formData.clientId}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value, injuryId: '' }))}
                        >
                            <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                                <SelectValue placeholder="Select an athlete" />
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
                            <Label className="text-slate-300">Related Injury (Optional)</Label>
                            <Select
                                value={formData.injuryId}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, injuryId: value }))}
                            >
                                <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                                    <SelectValue placeholder="Select related injury" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                    <SelectItem value="" className="text-slate-200">None</SelectItem>
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
                        Session Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-300">Treatment Type</Label>
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
                            <Label className="text-slate-300">Session Date</Label>
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
                                Pain Before: <span className="text-white">{formData.painBefore}/10</span>
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
                                Pain After: <span className="text-white">{formData.painAfter}/10</span>
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
                    <CardTitle className="text-white">SOAP Notes <InfoTooltip conceptKey="soapNotes" /></CardTitle>
                    <CardDescription className="text-slate-400">
                        Document your clinical findings using the SOAP format
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="text-slate-300">Subjective</Label>
                        <Textarea
                            value={formData.subjective}
                            onChange={(e) => setFormData(prev => ({ ...prev, subjective: e.target.value }))}
                            placeholder="Patient's description of symptoms, history, concerns..."
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">Objective</Label>
                        <Textarea
                            value={formData.objective}
                            onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                            placeholder="Physical examination findings, measurements, tests..."
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">Assessment</Label>
                        <Textarea
                            value={formData.assessment}
                            onChange={(e) => setFormData(prev => ({ ...prev, assessment: e.target.value }))}
                            placeholder="Clinical reasoning, diagnosis, prognosis..."
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">Plan</Label>
                        <Textarea
                            value={formData.plan}
                            onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                            placeholder="Treatment plan, goals, next steps..."
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Modalities Used */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Modalities Used</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {modalities.map((modality) => (
                            <label
                                key={modality}
                                className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                                    formData.modalitiesUsed.includes(modality)
                                        ? 'bg-emerald-500/20 border border-emerald-500/30'
                                        : 'bg-slate-800/50 border border-white/5 hover:border-white/10'
                                }`}
                            >
                                <Checkbox
                                    checked={formData.modalitiesUsed.includes(modality)}
                                    onCheckedChange={() => toggleModality(modality)}
                                />
                                <span className="text-sm text-slate-200">{modality}</span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Exercise Prescription */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Exercise Prescription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="text-slate-300">Exercises Prescribed (one per line)</Label>
                        <Textarea
                            value={formData.exercisesPrescribed}
                            onChange={(e) => setFormData(prev => ({ ...prev, exercisesPrescribed: e.target.value }))}
                            placeholder="e.g., Clamshells 3x15&#10;Single leg bridge 3x12&#10;Hip flexor stretch 3x30s"
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300">Home Exercise Program Notes</Label>
                        <Textarea
                            value={formData.homeExerciseProgram}
                            onChange={(e) => setFormData(prev => ({ ...prev, homeExerciseProgram: e.target.value }))}
                            placeholder="Instructions for home exercises, frequency, precautions..."
                            className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 min-h-[80px]"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any other notes, observations, or follow-up instructions..."
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
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={loading || !formData.clientId}
                    className="bg-emerald-500 hover:bg-emerald-600"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Treatment Session'}
                </Button>
            </div>
        </form>
    )
}
