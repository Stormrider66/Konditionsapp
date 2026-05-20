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
import { useLocale } from '@/i18n/client'

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
  const isSv = useLocale() === 'sv'

  const handleAdd = (clientId: string) => {
    onAdd(clientId)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          {isSv ? 'Lägg till atlet' : 'Add athlete'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isSv ? 'Lägg till atlet' : 'Add athlete'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {availableClients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isSv ? 'Alla atleter är redan tillagda' : 'All athletes have already been added'}
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
