'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Eye, EyeOff, ExternalLink, Trash2, Info } from 'lucide-react';

interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  valid: boolean;
  lastValidated: string | null;
}

interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  docsUrl: string;
  icon: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Används för programgenerering och AI-chatt',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    icon: '🤖',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    description: 'Används för videoanalys och vision-funktioner',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: '🎥',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Används för dokumentembeddings och sökning',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: '📚',
  },
];

export function ApiKeySettingsClient() {
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [keySource, setKeySource] = useState<{ source: 'user' | 'business' | 'none'; businessName?: string } | null>(null);

  // Fetch current key status and key source
  useEffect(() => {
    fetchKeyStatus();
    fetchKeySource();
  }, []);

  async function fetchKeyStatus() {
    try {
      const response = await fetch('/api/settings/api-keys');
      const data = await response.json();

      if (data.success) {
        setKeyStatus(data.keys);
      }
    } catch (error) {
      console.error('Failed to fetch API key status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchKeySource() {
    try {
      const response = await fetch('/api/settings/ai-key-source');
      const data = await response.json();
      if (data.success) {
        setKeySource({ source: data.source, businessName: data.businessName });
      }
    } catch {
      // Non-critical, silently fail
    }
  }

  async function saveKey(provider: string) {
    const key = keyValues[provider];
    if (!key) {
      setErrors({ ...errors, [provider]: 'Ange en API-nyckel' });
      return;
    }

    setSaving(provider);
    setErrors({ ...errors, [provider]: '' });
    setSuccess({ ...success, [provider]: false });

    try {
      const body: Record<string, string> = {};
      if (provider === 'anthropic') body.anthropicKey = key;
      if (provider === 'google') body.googleKey = key;
      if (provider === 'openai') body.openaiKey = key;

      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess({ ...success, [provider]: true });
        setKeyValues({ ...keyValues, [provider]: '' });
        await fetchKeyStatus();
        await fetchKeySource();

        // Clear success after 3 seconds
        setTimeout(() => {
          setSuccess((prev) => ({ ...prev, [provider]: false }));
        }, 3000);
      } else {
        setErrors({
          ...errors,
          [provider]: data.invalidKeys?.[0]?.error || data.error || 'Kunde inte spara nyckeln',
        });
      }
    } catch (error) {
      setErrors({
        ...errors,
        [provider]: 'Nätverksfel. Försök igen.',
      });
    } finally {
      setSaving(null);
    }
  }

  async function removeKey(provider: string) {
    if (!confirm(`Är du säker på att du vill ta bort ${provider}-nyckeln?`)) {
      return;
    }

    setSaving(provider);

    try {
      // Save empty key to remove it
      const body: Record<string, string> = {};
      if (provider === 'anthropic') body.anthropicKey = '';
      if (provider === 'google') body.googleKey = '';
      if (provider === 'openai') body.openaiKey = '';

      await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      await fetchKeyStatus();
      await fetchKeySource();
    } catch (error) {
      console.error('Failed to remove key:', error);
    } finally {
      setSaving(null);
    }
  }

  function getStatusForProvider(provider: string): ApiKeyStatus | undefined {
    return keyStatus.find((k) => k.provider === provider);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key source banner */}
      {keySource && keySource.source === 'business' && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Du använder <strong>{keySource.businessName}</strong>s AI-nycklar. Lägg till egna nedan för att använda dem istället.
          </p>
        </div>
      )}
      {keySource && keySource.source === 'user' && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Info className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-300">
            Du använder egna AI-nycklar. Ta bort dem för att använda verksamhetens nycklar.
          </p>
        </div>
      )}
      {keySource && keySource.source === 'none' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Inga AI-nycklar konfigurerade. Lägg till nycklar nedan för att aktivera AI-funktioner.
          </p>
        </div>
      )}

      {PROVIDERS.map((provider) => {
        const status = getStatusForProvider(provider.id);
        const isConfigured = status?.configured ?? false;
        const isValid = status?.valid ?? false;

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
                {/* Input for new/update key */}
                <div className="space-y-2">
                  <Label htmlFor={`key-${provider.id}`}>
                    {isConfigured ? 'Uppdatera API-nyckel' : 'API-nyckel'}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`key-${provider.id}`}
                        type={showKey[provider.id] ? 'text' : 'password'}
                        placeholder={provider.placeholder}
                        value={keyValues[provider.id] || ''}
                        onChange={(e) =>
                          setKeyValues({ ...keyValues, [provider.id]: e.target.value })
                        }
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKey({ ...showKey, [provider.id]: !showKey[provider.id] })
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

                {/* Status info */}
                {isConfigured && status?.lastValidated && (
                  <p className="text-xs text-gray-500">
                    Senast validerad:{' '}
                    {new Date(status.lastValidated).toLocaleString('sv-SE')}
                  </p>
                )}

                {/* Link to get API key */}
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
        );
      })}
    </div>
  );
}
