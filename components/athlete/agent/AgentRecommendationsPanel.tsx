'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Settings, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { AgentActionCard } from './AgentActionCard'
import { AgentStatusBadge } from './AgentStatusBadge'
import { AgentConsentBanner } from './AgentConsentBanner'

interface ActionData {
  type: string
  reductionPercent?: number
  originalIntensity?: string
  newIntensity?: string
  reason?: string
  message?: string
  targetDate?: string
}

interface AgentAction {
  id: string
  actionType: string
  actionData: ActionData
  reasoning: string
  confidence: string
  confidenceScore: number
  priority: string
  status: string
  targetDate: string | null
  proposedAt: string
  expiresAt: string | null
}

interface AgentStatus {
  isActive: boolean
  hasConsent: boolean
  consentWithdrawn: boolean
  autonomyLevel: string
  pendingActions: number
  lastPerception: string | null
}

interface AgentRecommendationsPanelProps {
  basePath?: string
}

export function AgentRecommendationsPanel({
  basePath = '/athlete',
}: AgentRecommendationsPanelProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [actions, setActions] = useState<AgentAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showConsentBanner, setShowConsentBanner] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // Fetch status
      const statusRes = await fetch('/api/agent/status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setStatus(statusData)

        // Show consent banner if no consent
        if (!statusData.hasConsent) {
          setShowConsentBanner(true)
        }
      }

      // Fetch actions if we have consent
      const actionsRes = await fetch('/api/agent/actions?status=PROPOSED&limit=5')
      if (actionsRes.ok) {
        const actionsData = await actionsRes.json()
        setActions(actionsData.actions || [])
      }
    } catch (error) {
      console.error('Error fetching agent data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = async () => {
    setIsRefreshing(true)

    // Trigger new perception/decision cycle
    try {
      await fetch('/api/agent/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forcePerception: true }),
      })
    } catch (error) {
      console.error('Error triggering agent:', error)
    }

    // Refetch data
    fetchData()
  }

  const handleAccept = async (actionId: string, feedback?: string) => {
    try {
      const res = await fetch(`/api/agent/actions/${actionId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      })

      if (res.ok) {
        // Remove from list
        setActions((prev) => prev.filter((a) => a.id !== actionId))
      }
    } catch (error) {
      console.error('Error accepting action:', error)
    }
  }

  const handleReject = async (actionId: string, reason?: string) => {
    try {
      const res = await fetch(`/api/agent/actions/${actionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (res.ok) {
        // Remove from list
        setActions((prev) => prev.filter((a) => a.id !== actionId))
      }
    } catch (error) {
      console.error('Error rejecting action:', error)
    }
  }

  const handleConsentGranted = () => {
    setShowConsentBanner(false)
    fetchData()
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Show consent banner if needed
  if (showConsentBanner && !status?.hasConsent) {
    return (
      <AgentConsentBanner
        onConsentGranted={handleConsentGranted}
        basePath={basePath}
      />
    )
  }

  // No consent and dismissed banner - show minimal prompt
  if (!status?.hasConsent) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">AI Training Agent</p>
              <p className="text-xs text-muted-foreground">
                Enable to get personalized recommendations
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConsentBanner(true)}
            >
              Enable
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Agent is active
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">AI Agent</CardTitle>
            <AgentStatusBadge
              isActive={status?.isActive ?? false}
              hasConsent={status?.hasConsent ?? false}
              autonomyLevel={status?.autonomyLevel ?? 'ADVISORY'}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
            <Link href={`${basePath}/settings/agent`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {actions.length === 0 ? (
          <div className="text-center py-6">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-3">
              <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              All good!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No recommendations right now. Keep up the great work!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <AgentActionCard
                key={action.id}
                action={action}
                onAccept={handleAccept}
                onReject={handleReject}
                basePath={basePath}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
