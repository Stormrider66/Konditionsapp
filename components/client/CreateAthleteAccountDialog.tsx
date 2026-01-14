// components/client/CreateAthleteAccountDialog.tsx
'use client'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UserPlus, Mail, Check, Copy, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CreateAthleteAccountDialogProps {
  clientId: string
  clientName: string
  clientEmail?: string | null
  hasExistingAccount?: boolean
  onAccountCreated?: () => void
  trigger?: React.ReactNode
}

interface CreatedAccountInfo {
  email: string
  temporaryPassword: string
}

export function CreateAthleteAccountDialog({
  clientId,
  clientName,
  clientEmail,
  hasExistingAccount = false,
  onAccountCreated,
  trigger,
}: CreateAthleteAccountDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState(clientEmail || '')
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountInfo | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const handleCreate = async () => {
    if (!email) {
      toast({
        title: 'E-post krävs',
        description: 'Ange en e-postadress för atletkontot',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/athlete-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          email,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCreatedAccount({
          email,
          temporaryPassword: data.temporaryPassword,
        })
        toast({
          title: 'Atletkonto skapat!',
          description: `Ett välkomstmail har skickats till ${email}`,
        })
        onAccountCreated?.()
      } else {
        toast({
          title: 'Kunde inte skapa konto',
          description: data.error || 'Ett fel uppstod',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Nätverksfel',
        description: 'Kunde inte ansluta till servern',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyPassword = async () => {
    if (createdAccount?.temporaryPassword) {
      await navigator.clipboard.writeText(createdAccount.temporaryPassword)
      setCopiedPassword(true)
      toast({
        title: 'Kopierat!',
        description: 'Lösenordet har kopierats till urklipp',
      })
      setTimeout(() => setCopiedPassword(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setCreatedAccount(null)
      setCopiedPassword(false)
      setEmail(clientEmail || '')
    }, 200)
  }

  // If athlete already has an account, show disabled state
  if (hasExistingAccount) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Check className="w-4 h-4 mr-2 text-green-600" />
        Har atletkonto
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Skapa atletkonto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skapa atletkonto</DialogTitle>
          <DialogDescription>
            Skapa ett inloggningskonto för <strong>{clientName}</strong> så att de kan logga in i atletportalen
          </DialogDescription>
        </DialogHeader>

        {createdAccount ? (
          // Success state - show credentials
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Atletkontot har skapats! Ett välkomstmail med inloggningsuppgifter har skickats.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs text-gray-500">E-post</Label>
                <p className="font-medium">{createdAccount.email}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Temporärt lösenord</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-sm">
                    {createdAccount.temporaryPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Atleten kommer att uppmanas att byta lösenord vid första inloggningen.
            </p>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Stäng
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Input state - enter email
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="athlete-email">E-postadress</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="athlete-email"
                  type="email"
                  placeholder="atlet@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500">
                Ett välkomstmail med inloggningsuppgifter skickas till denna adress
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Detta skapar ett nytt användarkonto kopplat till klienten {clientName}.
                Atleten får tillgång till sin träningsdata, program och kan logga pass.
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Avbryt
              </Button>
              <Button onClick={handleCreate} disabled={isLoading || !email}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Skapar...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Skapa konto
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
