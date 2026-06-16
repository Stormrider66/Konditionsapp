import type {
  CoachCommandCenterData,
  CommandCenterQueueItem,
} from '@/lib/coach/command-center'

type OperatorTone = 'risk' | 'watch' | 'steady'
type CoachOperatorLocale = 'en' | 'sv'

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
    testReviewCount: number
    highPriorityTestReviewCount: number
  }
  focusAreas: string[]
  testReview?: {
    count: number
    highPriorityCount: number
    summary: string
  }
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

const categoryLabels: Record<CommandCenterQueueItem['category'], Record<CoachOperatorLocale, string>> = {
  readiness: { en: 'readiness', sv: 'beredskap' },
  load: { en: 'load', sv: 'belastning' },
  injury: { en: 'injury', sv: 'skada' },
  feedback: { en: 'feedback', sv: 'feedback' },
  program: { en: 'program', sv: 'program' },
  testing: { en: 'testing', sv: 'tester' },
  alert: { en: 'alerts', sv: 'alerts' },
}

const testReviewFocusLabel: Record<CoachOperatorLocale, string> = {
  en: 'test approvals',
  sv: 'testgodkännanden',
}

function getCoachOperatorLocale(locale?: string | null): CoachOperatorLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function operatorText(locale: CoachOperatorLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function buildCoachOperatorBriefData(
  data: CoachCommandCenterData,
  localeInput: string = 'en'
): CoachOperatorBriefData {
  const locale = getCoachOperatorLocale(localeInput)
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
  const testReviewItems = data.queueItems.filter(isTestReviewQueueItem)
  const testReviewCount = testReviewItems.length
  const highPriorityTestReviewCount = testReviewItems.filter(
    item => item.priority === 'critical' || item.priority === 'high'
  ).length
  const testReviewSummary = buildTestReviewSummary({ count: testReviewCount, locale })
  const tone: OperatorTone = urgentCount > 0 ? 'risk' : queueCount > 0 || activeAlerts > 0 ? 'watch' : 'steady'

  const headline = urgentCount > 0
    ? operatorText(
      locale,
      `${urgentCount} urgent coach ${urgentCount === 1 ? 'case needs' : 'cases need'} attention`,
      urgentCount === 1
        ? '1 akut coachärende kräver uppmärksamhet'
        : `${urgentCount} akuta coachärenden kräver uppmärksamhet`
    )
    : queueCount > 0
      ? operatorText(
        locale,
        `${queueCount} coach ${queueCount === 1 ? 'case is' : 'cases are'} in the work queue`,
        queueCount === 1
          ? '1 coachärende ligger i arbetskön'
          : `${queueCount} coachärenden ligger i arbetskön`
      )
      : operatorText(locale, 'The coach operator sees a stable situation', 'Coachoperatorn ser ett stabilt läge')

  const subheadline = testReviewCount > 0 && urgentCount === 0
    ? testReviewSummary
    : topItems[0]?.description ??
      (recommendationCount > 0
        ? data.recommendations[0]?.recommendation
        : operatorText(
          locale,
          'Keep monitoring readiness, load, and pending feedback.',
          'Fortsätt följa readiness, belastning och väntande feedback.'
        ))

  const focusAreas = getFocusAreas(data.queueItems, locale)
  const promptSuggestions = buildPromptSuggestions({
    queueCount,
    urgentCount,
    focusAreas,
    testReviewCount,
    locale,
  })
  const summary = {
    urgentCount,
    reviewCount,
    queueCount,
    activeAlerts,
    recommendationCount,
    testReviewCount,
    highPriorityTestReviewCount,
  }

  const aiContext: CoachOperatorAIContext = {
    status: queueCount > 0 || activeAlerts > 0 ? 'attention' : 'stable',
    tone,
    headline,
    summary,
    focusAreas,
    ...(testReviewCount > 0
      ? {
          testReview: {
            count: testReviewCount,
            highPriorityCount: highPriorityTestReviewCount,
            summary: testReviewSummary,
          },
        }
      : {}),
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

function isTestReviewQueueItem(item: Pick<CommandCenterQueueItem, 'id'>): boolean {
  return item.id.startsWith('test-review-')
}

function buildTestReviewSummary({
  count,
  locale,
}: {
  count: number
  locale: CoachOperatorLocale
}) {
  if (count <= 0) return ''

  return operatorText(
    locale,
    `${count} ${count === 1 ? 'test needs' : 'tests need'} coach approval before program decisions use the data.`,
    `${count} ${count === 1 ? 'test behöver' : 'tester behöver'} coachgodkännande innan datan används i programbeslut.`
  )
}

function getFocusAreas(items: CommandCenterQueueItem[], locale: CoachOperatorLocale) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = isTestReviewQueueItem(item)
      ? testReviewFocusLabel[locale]
      : categoryLabels[item.category][locale]
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => `${label} (${count})`)
}

function buildPromptSuggestions({
  queueCount,
  urgentCount,
  focusAreas,
  testReviewCount,
  locale,
}: {
  queueCount: number
  urgentCount: number
  focusAreas: string[]
  testReviewCount: number
  locale: CoachOperatorLocale
}): CoachOperatorPrompt[] {
  const focusText = focusAreas.length > 0
    ? operatorText(locale, ` Focus areas: ${focusAreas.join(', ')}.`, ` Fokusområden: ${focusAreas.join(', ')}.`)
    : ''
  const testReviewText = testReviewCount > 0
    ? operatorText(
      locale,
      ` Include ${testReviewCount} pending ${testReviewCount === 1 ? 'test approval' : 'test approvals'} before program decisions.`,
      ` Ta med ${testReviewCount} väntande ${testReviewCount === 1 ? 'testgodkännande' : 'testgodkännanden'} innan programbeslut.`
    )
    : ''

  if (queueCount === 0) {
    return [
      {
        label: operatorText(locale, 'Weekly summary', 'Veckosummering'),
        prompt: operatorText(
          locale,
          'Create a short proactive weekly summary from the coach dashboard operator view. Highlight stable signals, things to keep monitoring, and one concrete next step.',
          'Gör en kort proaktiv veckosummering från coachdashboardens operatorläge. Lyft stabila signaler, saker att fortsätta bevaka och ett konkret nästa steg.'
        ),
      },
      {
        label: operatorText(locale, 'Plan ahead', 'Planera framåt'),
        prompt: operatorText(
          locale,
          'From the coach dashboard operator view: what three things should I check before planning the next training week?',
          'Utifrån coachdashboardens operatorläge: vilka tre saker bör jag kontrollera innan nästa träningsvecka planeras?'
        ),
      },
    ]
  }

  return [
    {
      label: urgentCount > 0
        ? operatorText(locale, 'Urgent brief', 'Akut brief')
        : operatorText(locale, 'Operator brief', 'Operatorbrief'),
      prompt: operatorText(
        locale,
        `Create a proactive coach-operator brief from the dashboard work queue. Prioritize urgent risks, follow up feedback, pending test approvals, and give me a clear order for what to do first.${focusText}${testReviewText}`,
        `Gör en proaktiv coach-operator brief från dashboardens arbetskö. Prioritera akuta risker, följ upp feedback, väntande testgodkännanden och ge mig en tydlig ordning för vad jag ska göra först.${focusText}${testReviewText}`
      ),
    },
    {
      label: operatorText(locale, 'Prepare follow-up', 'Förbered uppföljning'),
      prompt: operatorText(
        locale,
        `Suggest a follow-up plan for the coach cases in the operator queue. If a message to an athlete or team is needed, only prepare a draft with confirmation.${focusText}`,
        `Föreslå en uppföljningsplan för coachärendena i operator-kön. Om ett meddelande till atlet eller lag behövs, förbered bara ett utkast med bekräftelse.${focusText}`
      ),
    },
    {
      label: operatorText(locale, 'Risk check', 'Riskkontroll'),
      prompt: operatorText(
        locale,
        `Review the operator queue for readiness, ACWR, injury, missed sessions, and test approvals. Separate safety risks from normal planning admin and suggest the next app view to open.${testReviewText}`,
        `Granska operator-kön för readiness, ACWR, skada, missade pass och testgodkännanden. Separera säkerhetsrisker från vanlig planeringsadmin och föreslå nästa app-vy att öppna.${testReviewText}`
      ),
    },
  ]
}
