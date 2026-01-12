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

interface AvailableClient {
  id: string
  name: string
}

interface AddParticipantDialogProps {
  availableClients: AvailableClient[]
  onAdd: (clientIds: string[]) => Promise<void>
}

export function AddParticipantDialog({ availableClients, onAdd }: AddParticipantDialogProps) {
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
          Lägg till atleter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lägg till atleter</DialogTitle>
          <DialogDescription>
            Välj atleter att lägga till i sessionen.
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
            Avbryt
          </Button>
          <Button onClick={handleAdd} disabled={isLoading || selectedIds.size === 0}>
            {isLoading ? 'Lägger till...' : `Lägg till (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
