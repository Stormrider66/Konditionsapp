'use client'

/**
 * Share Report Button Component
 *
 * Allows coaches to generate and share public links to test reports.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Share2, Copy, Link2, Loader2, Check, Trash2 } from 'lucide-react'

interface ShareReportButtonProps {
  testId: string
  hasExistingLink?: boolean
  existingToken?: string
}

export function ShareReportButton({
  testId,
  hasExistingLink = false,
  existingToken,
}: ShareReportButtonProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(
    existingToken ? `${window.location.origin}/report/${existingToken}` : null
  )
  const [copied, setCopied] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const generateLink = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/reports/${testId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 30 }),
      })

      const data = await response.json()

      if (response.ok) {
        setShareLink(data.publicUrl)
        setExpiresAt(data.expiresAt)
        toast({
          title: 'Delningslänk skapad',
          description: 'Länken är giltig i 30 dagar',
        })
      } else {
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte skapa delningslänk',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte skapa delningslänk',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const revokeLink = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/reports/${testId}/share`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShareLink(null)
        setExpiresAt(null)
        toast({
          title: 'Länk borttagen',
          description: 'Delningslänken har tagits bort',
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Fel',
          description: data.error || 'Kunde inte ta bort länken',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte ta bort länken',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyLink = async () => {
    if (!shareLink) return

    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      toast({
        title: 'Kopierad!',
        description: 'Länken har kopierats till urklipp',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte kopiera länken',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Dela rapport
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dela testrapport</DialogTitle>
          <DialogDescription>
            Skapa en publik länk som atleten kan använda för att se sin rapport
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {shareLink ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                  <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{shareLink}</span>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyLink}
                  disabled={copied}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {expiresAt && (
                <p className="text-sm text-muted-foreground">
                  Länken är giltig till {formatDate(expiresAt)}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={revokeLink}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Ta bort länk
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Ingen delningslänk finns. Skapa en för att låta atleten se rapporten utan att logga in.
              </p>
              <Button
                onClick={generateLink}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Skapa delningslänk
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
