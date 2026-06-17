export type CommandCenterPriority = 'critical' | 'high' | 'medium' | 'low'
export type CommandCenterQueueFilter = 'all' | 'high' | 'overdue' | 'review' | 'injury' | 'testing'

export interface CommandCenterQueueItem {
  id: string
  alertId?: string
  alertStatus?: string
  alertType?: string
  title: string
  description: string
  priority: CommandCenterPriority
  category: 'readiness' | 'load' | 'injury' | 'feedback' | 'program' | 'testing' | 'alert'
  clientName?: string
  href: string
  ctaLabel: string
  meta?: string
  opsLabel?: string
  opsTone?: 'overdue' | 'watch' | 'neutral'
}

export interface CommandCenterRecommendation {
  id: string
  title: string
  recommendation: string
  why: string[]
  evidence: Array<{
    label: string
    value: string
    tone: 'good' | 'watch' | 'risk' | 'neutral'
  }>
  confidence: 'High' | 'Medium' | 'Low'
  href: string
  ctaLabel: string
}

export interface CoachCommandCenterData {
  summary: {
    totalClients: number
    urgentCount: number
    reviewCount: number
    stableCount: number
    activeAlerts: number
    pendingTestReviews: number
    unresolvedPainAlerts: number
    overdueCount: number
  }
  queueItems: CommandCenterQueueItem[]
  recommendations: CommandCenterRecommendation[]
}

export function filterCommandCenterQueueItems(
  items: CommandCenterQueueItem[],
  filter: CommandCenterQueueFilter,
): CommandCenterQueueItem[] {
  switch (filter) {
    case 'high':
      return items.filter(item => item.priority === 'critical' || item.priority === 'high')
    case 'overdue':
      return items.filter(item => item.opsTone === 'overdue')
    case 'review':
      return items.filter(item => item.priority === 'medium' || item.category === 'feedback')
    case 'injury':
      return items.filter(item => item.category === 'injury')
    case 'testing':
      return items.filter(item => item.category === 'testing')
    case 'all':
    default:
      return items
  }
}
