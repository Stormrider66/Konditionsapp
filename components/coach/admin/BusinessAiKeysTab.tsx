'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertCircle,
  Users,
} from 'lucide-react'

interface KeyStatus {
  provider: string
  configured: boolean
  valid: boolean
  lastValidated: string | null
}

interface ProviderConfig {
  id: string
  name: string
  description: string
  placeholder: string
  docsUrl: string
  icon: string
  keyField: string
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Programgenerering, AI-chatt och analys',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    icon: '🤖',
    keyField: 'anthropicKey',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    description: 'Videoanalys och vision-funktioner',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: '🎥',
    keyField: 'googleKey',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Dokumentembeddings och sökning',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: '📚',
    keyField: 'openaiKey',
  },
]

export function BusinessAiKeysTab() {
  const [keys, setKeys] = useState<KeyStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [keyValues, setKeyValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState<Record<string, boolean>>({})
  const [membersUsingBusinessKeys, setMembersUsingBusinessKeys] = useState(0)
  const [totalMembers, setTotalMembers] = useState(0)

  const fetchKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/coach/admin/ai-keys')
      if (!response.ok) throw new Error('Failed to fetch AI keys')
      const data = await response.json()
      setKeys(data.keys)
      setMembersUsingBusinessKeys(data.membersUsingBusinessKeys)
      setTotalMembers(data.totalMembers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function saveKey(providerId: string) {
    const provider = PROVIDERS.find((p) => p.id === providerId)
    if (!provider) return

    const key = keyValues[providerId]
    if (!key) {
      setErrors((prev) => ({ ...prev, [providerId]: 'Ange en API-nyckel' }))
      return
    }

    setSaving(providerId)
    setErrors((prev) => ({ ...prev, [providerId]: '' }))
    setSuccess((prev) => ({ ...prev, [providerId]: false }))

    try {
      const body: Record<string, string> = { [provider.keyField]: key }

      const response = await fetch('/api/coach/admin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess((prev) => ({ ...prev, [providerId]: true }))
        setKeyValues((prev) => ({ ...prev, [providerId]: '' }))
        await fetchKeys()

        setTimeout(() => {
          setSuccess((prev) => ({ ...prev, [providerId]: false }))
        }, 3000)
      } else {
        setErrors((prev) => ({
          ...prev,
          [providerId]: data.invalidKeys?.[0]?.error || data.error || 'Kunde inte spara nyckeln',
        }))
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        [providerId]: 'Nätverksfel. Försök igen.',
      }))
    } finally {
      setSaving(null)
    }
  }

  async function removeKey(providerId: string) {
    const provider = PROVIDERS.find((p) => p.id === providerId)
    if (!provider) return

    if (!confirm(`Är du säker på att du vill ta bort ${provider.name}-nyckeln?`)) {
      return
    }

    setSaving(providerId)

    try {
      const body: Record<string, string> = { [provider.keyField]: '' }

      await fetch('/api/coach/admin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await fetchKeys()
    } catch (err) {
      console.error('Failed to remove key:', err)
    } finally {
      setSaving(null)
    }
  }

  function getStatusForProvider(providerId: string): KeyStatus | undefined {
    return keys.find((k) => k.provider === providerId)
  }

  const hasAnyKeys = keys.some((k) => k.configured)

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
        <Button variant="outline" size="sm" onClick={fetchKeys} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      {hasAnyKeys && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {membersUsingBusinessKeys} av {totalMembers} medlemmar använder verksamhetens AI-nycklar
                </p>
                <p className="text-xs text-muted-foreground">
                  Medlemmar med egna nycklar använder sina egna istället
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider cards */}
      {PROVIDERS.map((provider) => {
        const status = getStatusForProvider(provider.id)
        const isConfigured = status?.configured ?? false
        const isValid = status?.valid ?? false

        return (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConfigured ? (
                    isValid ? (
                      <Badge variant="default" className="bg-green-500">
                        <Check className="h-3 w-3 mr-1" />
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Ogiltig
                      </Badge>
                    )
                  ) : (
                    <Badge variant="secondary">Ej konfigurerad</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`biz-key-${provider.id}`}>
                    {isConfigured ? 'Uppdatera API-nyckel' : 'API-nyckel'}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`biz-key-${provider.id}`}
                        type={showKey[provider.id] ? 'text' : 'password'}
                        placeholder={provider.placeholder}
                        value={keyValues[provider.id] || ''}
                        onChange={(e) =>
                          setKeyValues((prev) => ({ ...prev, [provider.id]: e.target.value }))
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKey((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKey[provider.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      onClick={() => saveKey(provider.id)}
                      disabled={saving === provider.id || !keyValues[provider.id]}
                    >
                      {saving === provider.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : success[provider.id] ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        'Spara'
                      )}
                    </Button>
                    {isConfigured && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeKey(provider.id)}
                        disabled={saving === provider.id}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {errors[provider.id] && (
                    <p className="text-sm text-red-500">{errors[provider.id]}</p>
                  )}
                  {success[provider.id] && (
                    <p className="text-sm text-green-500">Nyckeln sparades!</p>
                  )}
                </div>

                {isConfigured && status?.lastValidated && (
                  <p className="text-xs text-gray-500">
                    Senast validerad:{' '}
                    {new Date(status.lastValidated).toLocaleString('sv-SE')}
                  </p>
                )}

                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  Hämta API-nyckel
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
