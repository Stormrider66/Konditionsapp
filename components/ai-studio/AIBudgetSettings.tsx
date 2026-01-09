'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Settings,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Calendar,
  FlaskConical,
  MessageSquare,
  Sparkles,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface BudgetStatus {
  monthlyBudget: number | null
  alertThreshold: number
  researchBudget: number | null
  chatBudget: number | null
  periodStart: string
  periodSpent: number
  remaining: number | null
  percentUsed: number
  alertSent: boolean
  usageByCategory: Record<string, number>
  isOverBudget: boolean
  isNearLimit: boolean
}

interface UsageStats {
  total: number
  byCategory: Record<string, number>
  byProvider: Record<string, number>
  history: Array<{ date: string; cost: number }>
}

interface AIBudgetSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: () => void
}

// ============================================
// Component
// ============================================

export function AIBudgetSettings({
  open,
  onOpenChange,
  onSave,
}: AIBudgetSettingsProps) {
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)

  // Form state
  const [monthlyBudget, setMonthlyBudget] = useState<string>('')
  const [alertThreshold, setAlertThreshold] = useState(80)
  const [researchBudget, setResearchBudget] = useState<string>('')
  const [chatBudget, setChatBudget] = useState<string>('')

  // Fetch budget status
  const fetchBudgetStatus = async () => {
    setIsLoading(true)
    try {
      const [budgetRes, usageRes] = await Promise.all([
        fetch('/api/ai/budget'),
        fetch('/api/ai/budget/usage?period=month'),
      ])

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json()
        setBudgetStatus(budgetData)
        setMonthlyBudget(budgetData.monthlyBudget?.toString() || '')
        setAlertThreshold(budgetData.alertThreshold * 100)
        setResearchBudget(budgetData.researchBudget?.toString() || '')
        setChatBudget(budgetData.chatBudget?.toString() || '')
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsageStats(usageData)
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load budget settings.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchBudgetStatus()
    }
  }, [open])

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true)

    try {
      const response = await fetch('/api/ai/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
          alertThreshold: alertThreshold / 100,
          researchBudget: researchBudget ? parseFloat(researchBudget) : null,
          chatBudget: chatBudget ? parseFloat(chatBudget) : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      toast({
        title: 'Settings saved',
        description: 'Your budget settings have been updated.',
      })

      onSave?.()
      fetchBudgetStatus()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save settings.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Reset period
  const resetPeriod = async () => {
    try {
      const response = await fetch('/api/ai/budget/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to reset')
      }

      toast({
        title: 'Period reset',
        description: 'Your budget period has been reset.',
      })

      fetchBudgetStatus()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reset period.',
        variant: 'destructive',
      })
    }
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            AI Budget Settings
          </DialogTitle>
          <DialogDescription>
            Set monthly spending limits for AI features. Leave empty for unlimited.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Usage Overview */}
            {budgetStatus && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Current Period Usage
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Started {new Date(budgetStatus.periodStart).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatCurrency(budgetStatus.periodSpent)}
                      </span>
                      {budgetStatus.monthlyBudget && (
                        <span className="text-sm text-muted-foreground">
                          of {formatCurrency(budgetStatus.monthlyBudget)}
                        </span>
                      )}
                    </div>

                    {budgetStatus.monthlyBudget && (
                      <div className="space-y-1">
                        <Progress
                          value={Math.min(budgetStatus.percentUsed, 100)}
                          className="h-2"
                          indicatorClassName={
                            budgetStatus.isOverBudget
                              ? 'bg-destructive'
                              : budgetStatus.isNearLimit
                                ? 'bg-yellow-500'
                                : undefined
                          }
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{budgetStatus.percentUsed.toFixed(1)}% used</span>
                          <span>
                            {formatCurrency(budgetStatus.remaining || 0)} remaining
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Warning Badges */}
                    <div className="flex gap-2">
                      {budgetStatus.isOverBudget && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Over Budget
                        </Badge>
                      )}
                      {budgetStatus.isNearLimit && !budgetStatus.isOverBudget && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Near Limit
                        </Badge>
                      )}
                      {!budgetStatus.monthlyBudget && (
                        <Badge variant="secondary">Unlimited</Badge>
                      )}
                    </div>

                    {/* Category Breakdown */}
                    {usageStats && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <FlaskConical className="h-3 w-3" />
                            Research
                          </div>
                          <p className="text-sm font-medium">
                            {formatCurrency(usageStats.byCategory.research || 0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            Chat
                          </div>
                          <p className="text-sm font-medium">
                            {formatCurrency(usageStats.byCategory.chat || 0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3" />
                            Embedding
                          </div>
                          <p className="text-sm font-medium">
                            {formatCurrency(usageStats.byCategory.embedding || 0)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Budget Limits
              </h4>

              {/* Monthly Budget */}
              <div className="space-y-2">
                <Label htmlFor="monthlyBudget">Monthly Budget (USD)</Label>
                <Input
                  id="monthlyBudget"
                  type="number"
                  placeholder="e.g., 50.00 (leave empty for unlimited)"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Total monthly limit across all AI features
                </p>
              </div>

              {/* Alert Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Alert Threshold</Label>
                  <span className="text-sm text-muted-foreground">{alertThreshold}%</span>
                </div>
                <Slider
                  value={[alertThreshold]}
                  onValueChange={([v]) => setAlertThreshold(v)}
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Show warning when usage reaches this percentage
                </p>
              </div>

              {/* Category Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="researchBudget">Research Limit (USD)</Label>
                  <Input
                    id="researchBudget"
                    type="number"
                    placeholder="Optional"
                    value={researchBudget}
                    onChange={(e) => setResearchBudget(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chatBudget">Chat Limit (USD)</Label>
                  <Input
                    id="chatBudget"
                    type="number"
                    placeholder="Optional"
                    value={chatBudget}
                    onChange={(e) => setChatBudget(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={resetPeriod}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Period
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
