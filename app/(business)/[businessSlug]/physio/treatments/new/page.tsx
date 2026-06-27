'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { TreatmentSessionForm } from '@/components/physio/TreatmentSessionForm'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

function NewTreatmentContent() {
    const params = useParams()
    const businessSlug = params.businessSlug as string
    const basePath = `/${businessSlug}/physio`

    const searchParams = useSearchParams()
    const clientId = searchParams.get('clientId') || undefined
    const injuryId = searchParams.get('injuryId') || undefined

    return (
        <RolePageFrame contentClassName="max-w-4xl">
            <Button
                variant="ghost"
                className="mb-6 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                asChild
            >
                <Link href={`${basePath}/treatments`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Treatments
                </Link>
            </Button>

            <RolePageHeader
                eyebrow="Clinical log"
                title="New Treatment Session"
                description="Document a new treatment session with SOAP notes."
            />

            <TreatmentSessionForm
                preselectedClientId={clientId}
                preselectedInjuryId={injuryId}
                basePath={basePath}
            />
        </RolePageFrame>
    )
}

export default function BusinessNewTreatmentPage() {
    return (
        <Suspense fallback={
            <RolePageFrame contentClassName="max-w-4xl">
                <p className="text-center text-zinc-500 dark:text-zinc-400">Loading...</p>
            </RolePageFrame>
        }>
            <NewTreatmentContent />
        </Suspense>
    )
}
