'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FlaskConical,
  Clock,
  User,
  ChevronRight,
  Sparkles,
  Zap,
  Brain,
  Search,
  Crown,
  ArrowLeft,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface SharedResearchItem {
  shareId: string
  sessionId: string
  sharedAt: string
  notified: boolean
  provider: string
  query: string
  queryPreview: string
  completedAt: string | null
  coachName: string
}

interface SharedResearchListProps {
  research: SharedResearchItem[]
  coachName: string
  basePath?: string
}

// ============================================
// Helper Functions
// ============================================

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'GEMINI':
      return <Sparkles className="h-4 w-4 text-blue-500" />
    case 'OPENAI_QUICK':
      return <Zap className="h-4 w-4 text-yellow-500" />
    case 'OPENAI_STANDARD':
      return <Brain className="h-4 w-4 text-purple-500" />
    case 'OPENAI_DEEP':
      return <Search className="h-4 w-4 text-green-500" />
    case 'OPENAI_EXPERT':
      return <Crown className="h-4 w-4 text-amber-500" />
    default:
      return <FlaskConical className="h-4 w-4" />
  }
}

const formatProvider = (provider: string) => {
  switch (provider) {
    case 'GEMINI':
      return 'Gemini'
    case 'OPENAI_QUICK':
      return 'Quick'
    case 'OPENAI_STANDARD':
      return 'Standard'
    case 'OPENAI_DEEP':
      return 'Deep'
    case 'OPENAI_EXPERT':
      return 'Expert'
    default:
      return provider
  }
}

// ============================================
// Component
// ============================================

export function SharedResearchList({ research, coachName, basePath = '' }: SharedResearchListProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Shared Research</h1>
          </div>
          <p className="text-muted-foreground">
            Research reports shared with you by {coachName}
          </p>
        </div>
        <Link href={`${basePath}/athlete/dashboard`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>

      {/* Research List */}
      {research.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Research Yet</h2>
            <p className="text-muted-foreground">
              Your coach hasn&apos;t shared any research reports with you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {research.map((item) => (
            <Link
              key={item.shareId}
              href={`${basePath}/athlete/research/${item.sessionId}`}
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getProviderIcon(item.provider)}
                        <Badge variant="secondary" className="text-xs">
                          {formatProvider(item.provider)}
                        </Badge>
                        {!item.notified && (
                          <Badge variant="default" className="text-xs bg-primary">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium line-clamp-2 mb-2">
                        {item.queryPreview}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Shared {new Date(item.sharedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.coachName}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
