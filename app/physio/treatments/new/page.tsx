'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { TreatmentSessionForm } from '@/components/physio/TreatmentSessionForm'

function NewTreatmentContent() {
    const searchParams = useSearchParams()
    const clientId = searchParams.get('clientId') || undefined
    const injuryId = searchParams.get('injuryId') || undefined

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Back Button */}
            <Button
                variant="ghost"
                className="mb-6 text-slate-400 hover:text-white"
                asChild
            >
                <Link href="/physio/treatments">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Treatments
                </Link>
            </Button>

            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">New Treatment Session</h1>
                </div>
                <p className="text-slate-400">Document a new treatment session with SOAP notes</p>
            </div>

            {/* Form */}
            <TreatmentSessionForm
                preselectedClientId={clientId}
                preselectedInjuryId={injuryId}
            />
        </div>
    )
}

export default function NewTreatmentPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-slate-400">Loading...</p>
            </div>
        }>
            <NewTreatmentContent />
        </Suspense>
    )
}
