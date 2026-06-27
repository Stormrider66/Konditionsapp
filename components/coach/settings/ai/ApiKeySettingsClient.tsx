'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge';
import {
  type LucideIcon,
  Bot,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  FileSearch,
  Info,
  Loader2,
  Trash2,
  Video,
  X,
} from 'lucide-react';

interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  valid: boolean;
  lastValidated: string | null;
}

interface ProviderConfig {
  id: ProviderId;
  name: string;
  placeholder: string;
  docsUrl: string;
  icon: LucideIcon;
  toneClassName: string;
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
    icon: Bot,
    toneClassName: 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    icon: Video,
    toneClassName: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    icon: FileSearch,
    toneClassName: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300',
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
      <RolePanel className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500 dark:text-zinc-400" />
      </RolePanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key source banner */}
      {keySource && keySource.source === 'business' && (
        <RolePanel className="flex items-start gap-3 border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
          <p className="text-sm leading-6 text-blue-800 dark:text-blue-200">
            {copy.businessKeys(keySource.businessName)}
          </p>
        </RolePanel>
      )}
      {keySource && keySource.source === 'user' && (
        <RolePanel className="flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <p className="text-sm leading-6 text-emerald-800 dark:text-emerald-200">
            {copy.userKeys}
          </p>
        </RolePanel>
      )}
      {keySource && keySource.source === 'none' && (
        <RolePanel className="flex items-start gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="text-sm leading-6 text-amber-800 dark:text-amber-200">
            {copy.noKeys}
          </p>
        </RolePanel>
      )}

      {PROVIDERS.map((provider) => {
        const status = getStatusForProvider(provider.id);
        const isConfigured = status?.configured ?? false;
        const isValid = status?.valid ?? false;
        const ProviderIcon = provider.icon;

        return (
          <RolePanel key={provider.id} className="p-5">
            <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${provider.toneClassName}`}>
                    <ProviderIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{provider.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{copy.providers[provider.id]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConfigured ? (
                    isValid ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <Check className="h-3 w-3" />
                        {copy.active}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3" />
                        {copy.invalid}
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                      {copy.notConfigured}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <div className="space-y-5">
                {/* Input for new/update key */}
                <div className="space-y-2">
                  <Label htmlFor={`key-${provider.id}`} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {isConfigured ? copy.updateApiKey : copy.apiKey}
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Input
                        id={`key-${provider.id}`}
                        type={showKey[provider.id] ? 'text' : 'password'}
                        placeholder={provider.placeholder}
                        value={keyValues[provider.id] || ''}
                        onChange={(e) =>
                          setKeyValues({ ...keyValues, [provider.id]: e.target.value })
                        }
                        className="border-zinc-200 bg-white pr-10 dark:border-white/10 dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKey({ ...showKey, [provider.id]: !showKey[provider.id] })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                        aria-label={showKey[provider.id] ? 'Hide API key' : 'Show API key'}
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
                      className="sm:w-auto"
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
                        className="text-red-500 hover:text-red-700 sm:shrink-0"
                        aria-label={`Remove ${provider.name} API key`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {errors[provider.id] && (
                    <p className="text-sm text-red-500">{errors[provider.id]}</p>
                  )}
                  {success[provider.id] && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">{copy.keySaved}</p>
                  )}
                </div>

                {/* Status info */}
                {isConfigured && status?.lastValidated && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {copy.lastValidated}:{' '}
                    {new Date(status.lastValidated).toLocaleString(dateLocale)}
                  </p>
                )}

                {/* Link to get API key */}
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  {copy.getApiKey}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </RolePanel>
        );
      })}
    </div>
  );
}
