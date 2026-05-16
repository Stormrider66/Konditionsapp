import type {
  CoachCommandCenterData,
  CommandCenterQueueItem,
} from '@/lib/coach/command-center'

type OperatorTone = 'risk' | 'watch' | 'steady'

export interface CoachOperatorBriefItem {
  id: string
  title: string
  description: string
  priority: CommandCenterQueueItem['priority']
  category: CommandCenterQueueItem['category']
  clientName?: string
  href: string
  ctaLabel: string
  meta?: string
}

export interface CoachOperatorPrompt {
  label: string
  prompt: string
}

export interface CoachOperatorAIContext {
  status: 'attention' | 'stable'
  tone: OperatorTone
  headline: string
  summary: {
    urgentCount: number
    reviewCount: number
    queueCount: number
    activeAlerts: number
    recommendationCount: number
  }
  focusAreas: string[]
  topQueue: Array<{
    priority: CommandCenterQueueItem['priority']
    category: CommandCenterQueueItem['category']
    title: string
    hasNamedAthlete: boolean
    meta?: string
  }>
  recommendations: Array<{
    recommendation: string
    confidence: string
    evidence: string[]
  }>
}

export interface CoachOperatorBriefData {
  tone: OperatorTone
  headline: string
  subheadline: string
  summary: CoachOperatorAIContext['summary']
  topItems: CoachOperatorBriefItem[]
  promptSuggestions: CoachOperatorPrompt[]
  aiContext: CoachOperatorAIContext
}

const categoryLabels: Record<CommandCenterQueueItem['category'], string> = {
  readiness: 'beredskap',
  load: 'belastning',
  injury: 'skada',
  feedback: 'feedback',
  program: 'program',
  testing: 'tester',
  alert: 'alerts',
}

export function buildCoachOperatorBriefData(data: CoachCommandCenterData): CoachOperatorBriefData {
  const topItems = data.queueItems.slice(0, 3).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    priority: item.priority,
    category: item.category,
    clientName: item.clientName,
    href: item.href,
    ctaLabel: item.ctaLabel,
    meta: item.meta,
  }))

  const queueCount = data.queueItems.length
  const recommendationCount = data.recommendations.length
  const urgentCount = data.summary.urgentCount
  const reviewCount = data.summary.reviewCount
  const activeAlerts = data.summary.activeAlerts
  const tone: OperatorTone = urgentCount > 0 ? 'risk' : queueCount > 0 || activeAlerts > 0 ? 'watch' : 'steady'

  const headline = urgentCount > 0
    ? `${urgentCount} akuta coachärenden kräver uppmärksamhet`
    : queueCount > 0
      ? `${queueCount} coachärenden ligger i arbetskön`
      : 'Coachoperatorn ser ett stabilt läge'

  const subheadline = topItems[0]?.description ??
    (recommendationCount > 0
      ? data.recommendations[0]?.recommendation
      : 'Fortsätt följa readiness, belastning och väntande feedback.')

  const focusAreas = getFocusAreas(data.queueItems)
  const promptSuggestions = buildPromptSuggestions({ queueCount, urgentCount, focusAreas })
  const summary = {
    urgentCount,
    reviewCount,
    queueCount,
    activeAlerts,
    recommendationCount,
  }

  const aiContext: CoachOperatorAIContext = {
    status: queueCount > 0 || activeAlerts > 0 ? 'attention' : 'stable',
    tone,
    headline,
    summary,
    focusAreas,
    topQueue: topItems.map(item => ({
      priority: item.priority,
      category: item.category,
      title: item.title,
      hasNamedAthlete: Boolean(item.clientName),
      ...(item.meta ? { meta: item.meta } : {}),
    })),
    recommendations: data.recommendations.slice(0, 4).map(recommendation => ({
      recommendation: recommendation.recommendation,
      confidence: recommendation.confidence,
      evidence: recommendation.evidence.map(item => `${item.label}: ${item.value}`),
    })),
  }

  return {
    tone,
    headline,
    subheadline,
    summary,
    topItems,
    promptSuggestions,
    aiContext,
  }
}

function getFocusAreas(items: CommandCenterQueueItem[]) {
  const counts = new Map<CommandCenterQueueItem['category'], number>()
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => `${categoryLabels[category]} (${count})`)
}

function buildPromptSuggestions({
  queueCount,
  urgentCount,
  focusAreas,
}: {
  queueCount: number
  urgentCount: number
  focusAreas: string[]
}): CoachOperatorPrompt[] {
  const focusText = focusAreas.length > 0 ? ` Fokusområden: ${focusAreas.join(', ')}.` : ''

  if (queueCount === 0) {
    return [
      {
        label: 'Veckosummering',
        prompt: 'Gör en kort proaktiv veckosummering från coachdashboardens operatorläge. Lyft stabila signaler, saker att fortsätta bevaka och ett konkret nästa steg.',
      },
      {
        label: 'Planera framåt',
        prompt: 'Utifrån coachdashboardens operatorläge: vilka tre saker bör jag kontrollera innan nästa träningsvecka planeras?',
      },
    ]
  }

  return [
    {
      label: urgentCount > 0 ? 'Akut brief' : 'Operatorbrief',
      prompt: `Gör en proaktiv coach-operator brief från dashboardens arbetskö. Prioritera akuta risker, följ upp feedback och ge mig en tydlig ordning för vad jag ska göra först.${focusText}`,
    },
    {
      label: 'Förbered uppföljning',
      prompt: `Föreslå en uppföljningsplan för coachärendena i operator-kön. Om ett meddelande till atlet eller lag behövs, förbered bara ett utkast med bekräftelse.${focusText}`,
    },
    {
      label: 'Riskkontroll',
      prompt: 'Granska operator-kön för readiness, ACWR, skada och missade pass. Separera säkerhetsrisker från vanlig planeringsadmin och föreslå nästa app-vy att öppna.',
    },
  ]
}
