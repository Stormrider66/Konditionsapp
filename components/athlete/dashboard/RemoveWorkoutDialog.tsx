'use client'

import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import type { DashboardItem } from '@/types/dashboard-items'

interface RemoveWorkoutDialogProps {
  item: DashboardItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isRemoving: boolean
}

function getItemLabel(item: DashboardItem): string {
  if (item.kind === 'wod') return item.title
  if (item.kind === 'program') return item.workout.name
  return item.name
}

function getDescription(item: DashboardItem): string {
  if (item.kind === 'wod') {
    return 'Passet tas bort från din dashboard.'
  }
  if (item.kind === 'program') {
    if (item.workout.isCustom) {
      return 'Passet tas bort permanent.'
    }
    return 'Passet markeras som inställt. Din coach kan fortfarande se det.'
  }
  // assignment
  return 'Passet markeras som hoppat. Din coach kan fortfarande se detta.'
}

export function RemoveWorkoutDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  isRemoving,
}: RemoveWorkoutDialogProps) {
  if (!item) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ta bort pass?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{getItemLabel(item)}</span>
            <br />
            {getDescription(item)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isRemoving}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isRemoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tar bort…
              </>
            ) : (
              'Ta bort'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
