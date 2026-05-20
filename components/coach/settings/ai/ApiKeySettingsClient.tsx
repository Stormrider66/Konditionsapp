'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
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
  placeholder: string;
  docsUrl: string;
  icon: string;
}

type AppLocale = 'en' | 'sv';
type ProviderId = 'anthropic' | 'google' | 'openai';

const COPY = {
  en: {
    providers: {
      anthropic: 'Used for program generation and AI chat',
      google: 'Used for video analysis and vision features',
      openai: 'Used for document embeddings and search',
    },
    missingKey: 'Enter an API key',
    saveError: 'Could not save the key',
    networkError: 'Network error. Try again.',
    confirmRemove: (provider: string) => `Are you sure you want to remove the ${provider} key?`,
    businessKeys: (businessName?: string) => (
      <>
        You are using <strong>{businessName}</strong>
        {'\'s '}AI keys. Add your own below to use them instead.
      </>
    ),
    userKeys: 'You are using your own AI keys. Remove them to use the business keys.',
    noKeys: 'No AI keys configured. Add keys below to enable AI features.',
    active: 'Active',
    invalid: 'Invalid',
    notConfigured: 'Not configured',
    updateApiKey: 'Update API key',
    apiKey: 'API key',
    save: 'Save',
    keySaved: 'Key saved.',
    lastValidated: 'Last validated',
    getApiKey: 'Get API key',
  },
  sv: {
    providers: {
      anthropic: 'Används för programgenerering och AI-chatt',
      google: 'Används för videoanalys och vision-funktioner',
      openai: 'Används för dokumentembeddings och sökning',
    },
    missingKey: 'Ange en API-nyckel',
    saveError: 'Kunde inte spara nyckeln',
    networkError: 'Nätverksfel. Försök igen.',
    confirmRemove: (provider: string) => `Är du säker på att du vill ta bort ${provider}-nyckeln?`,
    businessKeys: (businessName?: string) => (
      <>
        Du använder <strong>{businessName}</strong>s AI-nycklar. Lägg till egna nedan för att använda dem istället.
      </>
    ),
    userKeys: 'Du använder egna AI-nycklar. Ta bort dem för att använda verksamhetens nycklar.',
    noKeys: 'Inga AI-nycklar konfigurerade. Lägg till nycklar nedan för att aktivera AI-funktioner.',
    active: 'Aktiv',
    invalid: 'Ogiltig',
    notConfigured: 'Ej konfigurerad',
    updateApiKey: 'Uppdatera API-nyckel',
    apiKey: 'API-nyckel',
    save: 'Spara',
    keySaved: 'Nyckeln sparades.',
    lastValidated: 'Senast validerad',
    getApiKey: 'Hämta API-nyckel',
  },
} as const;

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    icon: '🤖',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: '🎥',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: '📚',
  },
];

export function ApiKeySettingsClient() {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const copy = COPY[locale];
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US';
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
    void fetchKeyStatus();
    void fetchKeySource();
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
      setErrors({ ...errors, [provider]: copy.missingKey });
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
          [provider]: data.invalidKeys?.[0]?.error || data.error || copy.saveError,
        });
      }
    } catch (_error) {
      setErrors({
        ...errors,
        [provider]: copy.networkError,
      });
    } finally {
      setSaving(null);
    }
  }

  async function removeKey(provider: string) {
    if (!confirm(copy.confirmRemove(provider))) {
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
        <GlassCard glow="blue">
          <GlassCardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {copy.businessKeys(keySource.businessName)}
            </p>
          </GlassCardContent>
        </GlassCard>
      )}
      {keySource && keySource.source === 'user' && (
        <GlassCard glow="emerald">
          <GlassCardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-300">
              {copy.userKeys}
            </p>
          </GlassCardContent>
        </GlassCard>
      )}
      {keySource && keySource.source === 'none' && (
        <GlassCard glow="amber">
          <GlassCardContent className="p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {copy.noKeys}
            </p>
          </GlassCardContent>
        </GlassCard>
      )}

      {PROVIDERS.map((provider) => {
        const status = getStatusForProvider(provider.id);
        const isConfigured = status?.configured ?? false;
        const isValid = status?.valid ?? false;
        const glowColor =
          provider.id === 'anthropic' ? 'purple' :
          provider.id === 'google' ? 'emerald' :
          provider.id === 'openai' ? 'blue' : 'slate';

        return (
          <GlassCard key={provider.id} glow={glowColor}>
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <GlassCardTitle className="text-lg">{provider.name}</GlassCardTitle>
                    <GlassCardDescription>{copy.providers[provider.id as ProviderId]}</GlassCardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConfigured ? (
                    isValid ? (
                      <Badge variant="default" className="bg-green-500">
                        <Check className="h-3 w-3 mr-1" />
                        {copy.active}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        {copy.invalid}
                      </Badge>
                    )
                  ) : (
                    <Badge variant="secondary">{copy.notConfigured}</Badge>
                  )}
                </div>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-4">
                {/* Input for new/update key */}
                <div className="space-y-2">
                  <Label htmlFor={`key-${provider.id}`}>
                    {isConfigured ? copy.updateApiKey : copy.apiKey}
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
                        copy.save
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
                    <p className="text-sm text-green-500">{copy.keySaved}</p>
                  )}
                </div>

                {/* Status info */}
                {isConfigured && status?.lastValidated && (
                  <p className="text-xs text-gray-500">
                    {copy.lastValidated}:{' '}
                    {new Date(status.lastValidated).toLocaleString(dateLocale)}
                  </p>
                )}

                {/* Link to get API key */}
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  {copy.getApiKey}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </GlassCardContent>
          </GlassCard>
        );
      })}
    </div>
  );
}
