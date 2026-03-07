'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

interface AvailableClient {
  id: string
  name: string
}

interface AddParticipantDialogProps {
  availableClients: AvailableClient[]
  onAdd: (clientId: string) => void
}

export function AddParticipantDialog({
  availableClients,
  onAdd,
}: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false)

  const handleAdd = (clientId: string) => {
    onAdd(clientId)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Lagg till atlet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Lagg till atlet</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availableClients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Alla atleter ar redan tillagda
            </p>
          ) : (
            availableClients.map((client) => (
              <Button
                key={client.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleAdd(client.id)}
              >
                {client.name}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
