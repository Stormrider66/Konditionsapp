'use client'

/**
 * Add Participant Dialog
 *
 * Modal for adding athletes to a live HR session.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserPlus } from 'lucide-react'
import { useLocale } from '@/i18n/client'

interface AvailableClient {
  id: string
  name: string
}

interface AddParticipantDialogProps {
  availableClients: AvailableClient[]
  onAdd: (clientIds: string[]) => Promise<void>
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  trigger: string
  title: string
  description: string
  cancel: string
  adding: string
  add: (count: number) => string
}> = {
  en: {
    trigger: 'Add athletes',
    title: 'Add athletes',
    description: 'Select athletes to add to the session.',
    cancel: 'Cancel',
    adding: 'Adding...',
    add: (count) => `Add (${count})`,
  },
  sv: {
    trigger: 'Lägg till atleter',
    title: 'Lägg till atleter',
    description: 'Välj atleter att lägga till i sessionen.',
    cancel: 'Avbryt',
    adding: 'Lägger till...',
    add: (count) => `Lägg till (${count})`,
  },
}

export function AddParticipantDialog({ availableClients, onAdd }: AddParticipantDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleClient = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleAdd = async () => {
    if (selectedIds.size === 0) return

    setIsLoading(true)
    try {
      await onAdd(Array.from(selectedIds))
      setOpen(false)
      setSelectedIds(new Set())
    } finally {
      setIsLoading(false)
    }
  }

  if (availableClients.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-1" />
          {copy.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2 py-4">
            {availableClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                onClick={() => toggleClient(client.id)}
              >
                <Checkbox
                  checked={selectedIds.has(client.id)}
                  onCheckedChange={() => toggleClient(client.id)}
                />
                <span>{client.name}</span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={handleAdd} disabled={isLoading || selectedIds.size === 0}>
            {isLoading ? copy.adding : copy.add(selectedIds.size)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
