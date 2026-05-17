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
import { useTranslations } from '@/i18n/client'

interface RemoveWorkoutDialogProps {
  item: DashboardItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isRemoving: boolean
}

function getItemLabel(item: DashboardItem): string {
  if (item.kind === 'adhoc') return item.workoutName
  if (item.kind === 'wod') return item.title
  if (item.kind === 'program') return item.workout.name
  return item.name
}

type RemoveWorkoutTranslator = ReturnType<typeof useTranslations>

function getDescription(item: DashboardItem, t: RemoveWorkoutTranslator): string {
  if (item.kind === 'adhoc') {
    return t('description.adhoc')
  }
  if (item.kind === 'wod') {
    return t('description.wod')
  }
  if (item.kind === 'program') {
    if (item.workout.isCustom) {
      return t('description.customProgram')
    }
    return t('description.program')
  }
  // assignment
  return t('description.assignment')
}

export function RemoveWorkoutDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  isRemoving,
}: RemoveWorkoutDialogProps) {
  const t = useTranslations('components.removeWorkoutDialog')

  if (!item) return null
  const isUnsupported = item.kind === 'adhoc'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{getItemLabel(item)}</span>
            <br />
            {getDescription(item, t)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>{t('actions.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              if (!isUnsupported) {
                onConfirm()
              }
            }}
            disabled={isRemoving || isUnsupported}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isRemoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('actions.removing')}
              </>
            ) : (
              t('actions.remove')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
