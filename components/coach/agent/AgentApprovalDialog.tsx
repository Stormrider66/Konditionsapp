'use client'

/**
 * Agent Approval Dialog
 *
 * Dialog for coaches to approve, modify, or reject agent actions.
 * Allows adding notes and override reasons.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, Edit, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OversightAction } from './AgentOversightCard'

interface AgentApprovalDialogProps {
  action: OversightAction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (actionId: string, notes?: string) => Promise<void>
  onReject: (actionId: string, reason: string) => Promise<void>
  onModify: (actionId: string, modifications: ModificationData) => Promise<void>
}

interface ModificationData {
  notes: string
  adjustedIntensityReduction?: number
  adjustedDuration?: number
  overrideReason?: string
}

type DialogMode = 'review' | 'approve' | 'reject' | 'modify'

export function AgentApprovalDialog({
  action,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onModify,
}: AgentApprovalDialogProps) {
  const [mode, setMode] = useState<DialogMode>('review')
  const [notes, setNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [intensityReduction, setIntensityReduction] = useState(20)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setMode('review')
    setNotes('')
    setRejectReason('')
    setIntensityReduction(20)
    onOpenChange(false)
  }

  const handleApprove = async () => {
    if (!action) return
    setIsSubmitting(true)
    try {
      await onApprove(action.id, notes || undefined)
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!action || !rejectReason.trim()) return
    setIsSubmitting(true)
    try {
      await onReject(action.id, rejectReason)
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModify = async () => {
    if (!action) return
    setIsSubmitting(true)
    try {
      await onModify(action.id, {
        notes,
        adjustedIntensityReduction: intensityReduction,
        overrideReason: notes,
      })
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!action) return null

  const actionData = action.actionData as {
    reductionPercent?: number
    workoutId?: string
    reason?: string
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'review' && 'Review Agent Action'}
            {mode === 'approve' && (
              <>
                <Check className="h-5 w-5 text-green-600" />
                Approve Action
              </>
            )}
            {mode === 'reject' && (
              <>
                <X className="h-5 w-5 text-red-600" />
                Reject Action
              </>
            )}
            {mode === 'modify' && (
              <>
                <Edit className="h-5 w-5 text-amber-600" />
                Modify Action
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'review' && `Action proposed for ${action.client.name}`}
            {mode === 'approve' && 'The action will be executed as proposed.'}
            {mode === 'reject' && 'Provide a reason for rejecting this action.'}
            {mode === 'modify' && 'Adjust the action parameters before approving.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Action Type</span>
              <Badge variant="outline">{action.actionType.replace(/_/g, ' ')}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence</span>
              <Badge
                variant="outline"
                className={cn(
                  action.confidence === 'HIGH' || action.confidence === 'VERY_HIGH'
                    ? 'bg-green-500/10 text-green-600'
                    : action.confidence === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-red-500/10 text-red-600'
                )}
              >
                {Math.round(action.confidenceScore * 100)}%
              </Badge>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">{action.reasoning}</p>
            </div>
          </div>

          {/* Mode-specific content */}
          {mode === 'review' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose how you want to handle this action:
              </p>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as DialogMode)}
                className="space-y-2"
              >
                <div
                  className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => setMode('approve')}
                >
                  <RadioGroupItem value="approve" id="approve" />
                  <Label htmlFor="approve" className="flex-1 cursor-pointer">
                    <div className="font-medium text-green-600">Approve as-is</div>
                    <div className="text-xs text-muted-foreground">
                      Execute the action exactly as proposed
                    </div>
                  </Label>
                </div>
                <div
                  className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => setMode('modify')}
                >
                  <RadioGroupItem value="modify" id="modify" />
                  <Label htmlFor="modify" className="flex-1 cursor-pointer">
                    <div className="font-medium text-amber-600">Modify and approve</div>
                    <div className="text-xs text-muted-foreground">
                      Adjust parameters before executing
                    </div>
                  </Label>
                </div>
                <div
                  className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => setMode('reject')}
                >
                  <RadioGroupItem value="reject" id="reject" />
                  <Label htmlFor="reject" className="flex-1 cursor-pointer">
                    <div className="font-medium text-red-600">Reject</div>
                    <div className="text-xs text-muted-foreground">
                      Dismiss this action (helps the agent learn)
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {mode === 'approve' && (
            <div className="space-y-3">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this approval..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {mode === 'reject' && (
            <div className="space-y-3">
              <Label htmlFor="reason">
                Reason for rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why this action should not be taken..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Your feedback helps the AI agent learn. Be specific about why this
                  action was inappropriate for this athlete.
                </p>
              </div>
            </div>
          )}

          {mode === 'modify' && (
            <div className="space-y-4">
              {/* Show intensity slider if this is an intensity reduction action */}
              {action.actionType.includes('INTENSITY') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Intensity Reduction</Label>
                    <span className="text-sm font-medium">{intensityReduction}%</span>
                  </div>
                  <Slider
                    value={[intensityReduction]}
                    onValueChange={([v]) => setIntensityReduction(v)}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Original proposal: {actionData.reductionPercent || 20}%
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="override-reason">Override Reason</Label>
                <Textarea
                  id="override-reason"
                  placeholder="Explain your modifications..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>

          {mode === 'review' && (
            <Button onClick={() => setMode('approve')}>Continue</Button>
          )}

          {mode === 'approve' && (
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          )}

          {mode === 'reject' && (
            <Button
              onClick={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          )}

          {mode === 'modify' && (
            <Button
              onClick={handleModify}
              disabled={isSubmitting || !notes.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
