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
import { Loader2, UserPlus, Mail, Check, AlertCircle } from 'lucide-react'
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
  mode: 'created' | 'invited'
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

  const handleSubmit = async () => {
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
      const response = await fetch(
        hasExistingAccount ? `/api/athlete-accounts/${clientId}/invite` : '/api/athlete-accounts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: hasExistingAccount ? undefined : JSON.stringify({ clientId, email }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setCreatedAccount({
          email: data.email || email,
          mode: hasExistingAccount ? 'invited' : 'created',
        })
        toast({
          title: hasExistingAccount ? 'Inbjudan skickad!' : 'Atletkonto skapat!',
          description: data.message || `En inbjudan har skickats till ${email}`,
        })
        onAccountCreated?.()
      } else {
        toast({
          title: hasExistingAccount ? 'Kunde inte skicka inbjudan' : 'Kunde inte skapa konto',
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

  const handleClose = () => {
    setOpen(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setCreatedAccount(null)
      setEmail(clientEmail || '')
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            {hasExistingAccount ? (
              <Mail className="w-4 h-4 mr-2" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            {hasExistingAccount ? 'Skicka inbjudan' : 'Bjud in atlet'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasExistingAccount ? 'Skicka inbjudan' : 'Skapa och bjud in atlet'}
          </DialogTitle>
          <DialogDescription>
            {hasExistingAccount
              ? <>Skicka en ny inloggningslänk till <strong>{clientName}</strong>. E-postadressen synkas från klientprofilen först.</>
              : <>Skapa ett inloggningskonto för <strong>{clientName}</strong> och skicka en säker inbjudningslänk.</>}
          </DialogDescription>
        </DialogHeader>

        {createdAccount ? (
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {createdAccount.mode === 'created'
                  ? 'Atletkontot har skapats och inbjudan har skickats.'
                  : 'Inbjudan har skickats.'}
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs text-gray-500">E-post</Label>
                <p className="font-medium">{createdAccount.email}</p>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Atleten väljer sitt eget lösenord via länken. Inga lösenord visas eller delas av coachen.
            </p>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Stäng
              </Button>
            </DialogFooter>
          </div>
        ) : (
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
                  disabled={isLoading || hasExistingAccount}
                />
              </div>
              <p className="text-xs text-gray-500">
                {hasExistingAccount
                  ? 'Ändra e-post i klientprofilen om adressen inte stämmer.'
                  : 'Adressen sparas på klientprofilen och används för atletens inloggning.'}
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {hasExistingAccount
                  ? 'Atletens användarkonto synkas mot profilens e-post innan inbjudan skickas.'
                  : `Detta skapar ett nytt användarkonto kopplat till klienten ${clientName}. Atleten får tillgång till sin träningsdata, program och kan logga pass.`}
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Avbryt
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || !email}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {hasExistingAccount ? 'Skickar...' : 'Skapar...'}
                  </>
                ) : (
                  <>
                    {hasExistingAccount ? (
                      <Mail className="w-4 h-4 mr-2" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    {hasExistingAccount ? 'Skicka inbjudan' : 'Skapa och bjud in'}
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
