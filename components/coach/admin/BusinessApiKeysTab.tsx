'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Key,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  requestsPerMinute: number
  requestsPerDay: number
  scopes: string[]
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export function BusinessApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState({
    name: '',
    requestsPerMinute: 60,
    requestsPerDay: 10000,
  })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchApiKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/coach/admin/api-keys')
      if (!response.ok) throw new Error('Failed to fetch API keys')
      const result = await response.json()
      setApiKeys(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  const handleCreateKey = async () => {
    if (!newKey.name) return

    setCreateLoading(true)
    setCreateError(null)

    try {
      const response = await fetch('/api/coach/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create API key')
      }

      setCreatedKey(result.data.key)
      setNewKey({ name: '', requestsPerMinute: 60, requestsPerDay: 10000 })
      fetchApiKeys()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    setActionLoading(keyId)
    try {
      const response = await fetch(`/api/coach/admin/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to revoke API key')
      }

      fetchApiKeys()
    } catch (err) {
      console.error('Failed to revoke API key:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleActive = async (keyId: string, isActive: boolean) => {
    setActionLoading(keyId)
    try {
      const response = await fetch(`/api/coach/admin/api-keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update API key')
      }

      fetchApiKeys()
    } catch (err) {
      console.error('Failed to update API key:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const copyKey = async () => {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = createdKey
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    setCreatedKey(null)
    setCreateError(null)
    setNewKey({ name: '', requestsPerMinute: 60, requestsPerDay: 10000 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchApiKeys} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">API Keys</CardTitle>
            <CardDescription>Manage API keys for external integrations</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {createdKey ? 'API Key Created' : 'Create API Key'}
                </DialogTitle>
                <DialogDescription>
                  {createdKey
                    ? 'Save this key now - it cannot be retrieved again.'
                    : 'Create a new API key for external integrations'}
                </DialogDescription>
              </DialogHeader>

              {createdKey ? (
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md dark:bg-green-950/20 dark:border-green-900/30">
                    <p className="text-sm text-green-800 dark:text-green-400 mb-2">
                      Your API key has been created. Copy it now - you won&apos;t see it again!
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={createdKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="icon" onClick={copyKey}>
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeCreateDialog}>Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {createError && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
                      {createError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      value={newKey.name}
                      onChange={(e) =>
                        setNewKey((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="My Integration Key"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rpm">Requests/min</Label>
                      <Input
                        id="rpm"
                        type="number"
                        value={newKey.requestsPerMinute}
                        onChange={(e) =>
                          setNewKey((prev) => ({
                            ...prev,
                            requestsPerMinute: parseInt(e.target.value) || 60,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rpd">Requests/day</Label>
                      <Input
                        id="rpd"
                        type="number"
                        value={newKey.requestsPerDay}
                        onChange={(e) =>
                          setNewKey((prev) => ({
                            ...prev,
                            requestsPerDay: parseInt(e.target.value) || 10000,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeCreateDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateKey}
                      disabled={createLoading || !newKey.name}
                    >
                      {createLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      Create Key
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No API keys yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create an API key to integrate with external services
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 rounded-lg border dark:border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted dark:bg-white/10">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{key.name}</p>
                      <Badge
                        variant={key.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {key.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.keyPrefix}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {key.lastUsedAt
                        ? `Last used ${formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}`
                        : 'Never used'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggleActive(key.id, key.isActive)}
                    disabled={actionLoading === key.id}
                    title={key.isActive ? 'Disable key' : 'Enable key'}
                  >
                    {key.isActive ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        title="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke <strong>{key.name}</strong>? Any
                          integrations using this key will stop working immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevokeKey(key.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {actionLoading === key.id && (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
