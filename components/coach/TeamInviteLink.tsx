'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Link2, Copy, RefreshCw, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface TeamInviteLinkProps {
  teamId: string
}

interface Invite {
  id: string
  code: string
  currentUses: number
  maxUses: number
  expiresAt: string | null
}

export function TeamInviteLink({ teamId }: TeamInviteLinkProps) {
  const [invite, setInvite] = useState<Invite | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchInvite = useCallback(async () => {
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/invite`)
      if (res.ok) {
        const data = await res.json()
        setInvite(data.invite || null)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchInvite()
  }, [fetchInvite])

  const createInvite = useCallback(async () => {
    setCreating(true)
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxUses: 50, expiresInDays: 30 }),
      })

      if (!res.ok) throw new Error('Failed')

      const data = await res.json()
      setInvite(data.invite)
      toast.success('Inbjudningslänk skapad!')
    } catch {
      toast.error('Kunde inte skapa inbjudan')
    } finally {
      setCreating(false)
    }
  }, [teamId])

  const copyLink = useCallback(() => {
    if (!invite) return
    const url = `${window.location.origin}/join/${invite.code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Länk kopierad!')
    setTimeout(() => setCopied(false), 2000)
  }, [invite])

  if (loading) return null

  if (!invite) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={createInvite}
        disabled={creating}
        className="h-8 text-xs gap-1.5"
      >
        {creating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        )}
        Skapa inbjudningslänk
      </Button>
    )
  }

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${invite.code}`
  const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date()
  const isFull = invite.currentUses >= invite.maxUses

  if (isExpired || isFull) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          {isExpired ? 'Utgången' : 'Full'}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={createInvite}
          disabled={creating}
          className="h-7 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Ny länk
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={joinUrl}
        readOnly
        className="h-7 text-xs font-mono flex-1 bg-muted"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        className="h-7 text-xs gap-1 flex-shrink-0"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
        {copied ? 'Kopierad' : 'Kopiera'}
      </Button>
      <Badge variant="outline" className="text-[9px] flex-shrink-0">
        {invite.currentUses}/{invite.maxUses}
      </Badge>
    </div>
  )
}
