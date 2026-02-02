/**
 * AI Assessment Onboarding Page
 *
 * Multi-step wizard for AI-coached athletes to complete their
 * fitness assessment. Data is used to generate personalized
 * AI training programs.
 */

import { redirect } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AIAssessmentWizard } from '@/components/athlete/ai-coach/AIAssessmentWizard'

export default async function AIAssessmentPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

  // Get client with sport profile and agent preferences
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      sportProfile: true,
      agentPreferences: true,
      agentConsent: true,
    },
  })

  if (!client) {
    redirect('/login')
  }

  // Only AI-coached athletes should be here
  if (!client.isAICoached) {
    redirect('/athlete/onboarding')
  }

  // If onboarding is already completed, redirect to dashboard
  if (client.sportProfile?.onboardingCompleted) {
    redirect('/athlete/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <AIAssessmentWizard
        clientId={clientId}
        clientName={client.name}
        hasConsent={!!client.agentConsent?.dataProcessingConsent}
      />
    </div>
  )
}
