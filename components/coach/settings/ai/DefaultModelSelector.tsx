'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { RolePanel, roleMutedBlockClass } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Check, Brain, Sparkles, Zap, Bot, AlertCircle, FileText, DollarSign } from 'lucide-react';
import type { AIProvider } from '@prisma/client';
import { formatTokenCount, estimateWeeksFromTokens } from '@/types/ai-models';
import { getBusinessScopeHeaders } from '@/lib/business-scope-client';
import { useLocale } from 'next-intl';

type AppLocale = 'en' | 'sv';

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en;

interface AIModel {
  id: string;
  provider: AIProvider;
  modelId: string;
  displayName?: string;
  name: string;
  description: string | null;
  capabilities: {
    reasoning: string;
    speed: string;
    contextWindow: number;
    maxOutputTokens: number;
  };
  pricing: {
    input: number;
    output: number;
  };
  recommended?: boolean;
  bestForLongOutput?: boolean;
}

interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  valid: boolean;
}

export function DefaultModelSelector() {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const pathname = usePathname();
  const [models, setModels] = useState<AIModel[]>([]);
  const [defaultModel, setDefaultModel] = useState<AIModel | null>(null);
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const businessHeaders = getBusinessScopeHeaders(pathname);
      const [modelsRes, defaultRes, keysRes] = await Promise.all([
        fetch('/api/ai/models', businessHeaders ? { headers: businessHeaders } : undefined),
        fetch('/api/settings/default-model'),
        fetch('/api/settings/api-keys'),
      ]);

      const modelsData = await modelsRes.json();
      const defaultData = await defaultRes.json();
      const keysData = await keysRes.json();

      if (modelsData.success) {
        setModels(modelsData.models);
      }

      if (defaultData.success && defaultData.defaultModel) {
        setDefaultModel(defaultData.defaultModel);
      }

      if (keysData.success) {
        setKeyStatus(keysData.keys);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleModelChange(modelId: string) {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/settings/default-model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: modelId || null }),
      });

      const data = await response.json();

      if (data.success) {
        setDefaultModel(data.defaultModel);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || copy(locale, 'Could not save the setting', 'Kunde inte spara inställningen'));
      }
    } catch {
      setError(copy(locale, 'Network error. Try again.', 'Nätverksfel. Försök igen.'));
    } finally {
      setSaving(false);
    }
  }

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'ANTHROPIC':
        return <Brain className="h-4 w-4" />;
      case 'GOOGLE':
        return <Sparkles className="h-4 w-4" />;
      case 'OPENAI':
        return <Zap className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getProviderLabel = (provider: AIProvider) => {
    switch (provider) {
      case 'ANTHROPIC':
        return 'Anthropic';
      case 'GOOGLE':
        return 'Google';
      case 'OPENAI':
        return 'OpenAI';
      default:
        return provider;
    }
  };

  const isProviderAvailable = (provider: AIProvider) => {
    const status = keyStatus.find(
      (k) => k.provider.toLowerCase() === provider.toLowerCase()
    );
    return status?.valid ?? false;
  };

  const availableModels = models.filter((m) => isProviderAvailable(m.provider));
  const unavailableModels = models.filter((m) => !isProviderAvailable(m.provider));

  if (loading) {
    return (
      <RolePanel className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500 dark:text-zinc-400" />
      </RolePanel>
    );
  }

  return (
    <RolePanel className="p-5">
      <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{copy(locale, 'Default AI model', 'Standard AI-modell')}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {copy(locale, 'Choose which AI model should be used as the default across all AI features', 'Välj vilken AI-modell som ska användas som standard i alla AI-funktioner')}
              </p>
            </div>
          </div>
          {defaultModel && (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <Check className="h-3 w-3" />
              {copy(locale, 'Configured', 'Konfigurerad')}
            </Badge>
          )}
        </div>
      </div>
      <div className="mt-5 space-y-4">
          <Select
            value={defaultModel?.id || ''}
            onValueChange={handleModelChange}
            disabled={saving}
          >
            <SelectTrigger className="w-full border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900">
              <SelectValue placeholder={copy(locale, 'Choose default model', 'Välj standardmodell')}>
                {defaultModel && (
                  <div className="flex items-center gap-2">
                    {getProviderIcon(defaultModel.provider)}
                    <span>{defaultModel.displayName || defaultModel.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({getProviderLabel(defaultModel.provider)})
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-w-[500px]">
              {availableModels.length > 0 && (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {copy(locale, 'Available models', 'Tillgängliga modeller')}
                </div>
              )}
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id} className="py-3">
                  <div className="flex items-start gap-2">
                    {getProviderIcon(model.provider)}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{model.displayName || model.name}</span>
                        {model.recommended && (
                          <Badge variant="secondary" className="text-xs py-0">
                            {copy(locale, 'Recommended', 'Rekommenderad')}
                          </Badge>
                        )}
                        {model.bestForLongOutput && (
                          <Badge variant="outline" className="text-xs py-0 border-green-500 text-green-600">
                            <FileText className="h-3 w-3 mr-1" />
                            {copy(locale, 'Long programs', 'Långa program')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {formatTokenCount(model.capabilities?.maxOutputTokens)} output
                          <span className="text-muted-foreground/70">
                            (~{estimateWeeksFromTokens(model.capabilities?.maxOutputTokens)} {copy(locale, 'weeks', 'veckor')})
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${model.pricing?.output}/1M
                        </span>
                      </div>
                      {model.description && (
                        <span className="text-xs text-muted-foreground/80">
                          {model.description}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}

              {unavailableModels.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2">
                    {copy(locale, 'Unavailable (missing API key)', 'Ej tillgängliga (saknar API-nyckel)')}
                  </div>
                  {unavailableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id} disabled className="py-3">
                      <div className="flex items-start gap-2 opacity-50">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <div className="flex flex-col gap-1">
                          <span>{model.displayName || model.name}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{formatTokenCount(model.capabilities?.maxOutputTokens)} output</span>
                            <span>${model.pricing?.output}/1M</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {getProviderLabel(model.provider)} - {copy(locale, 'API key missing', 'API-nyckel saknas')}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}

              {models.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {copy(locale, 'No AI models available', 'Inga AI-modeller tillgängliga')}
                </div>
              )}
            </SelectContent>
          </Select>

          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy(locale, 'Saving...', 'Sparar...')}
            </div>
          )}

          {success && (
            <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              {copy(locale, 'Default model saved!', 'Standardmodell sparad!')}
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Model details for selected model */}
          {defaultModel && (
            <div className={roleMutedBlockClass('space-y-3')}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{copy(locale, 'Selected model', 'Vald modell')}: {defaultModel.displayName || defaultModel.name}</span>
                {defaultModel.bestForLongOutput && (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    {copy(locale, 'Good for long programs', 'Bra för långa program')}
                  </Badge>
                )}
              </div>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Max output:</span>{' '}
                  <span className="font-medium">{formatTokenCount(defaultModel.capabilities?.maxOutputTokens)} tokens</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{copy(locale, 'Estimated capacity', 'Uppskattad kapacitet')}:</span>{' '}
                  <span className="font-medium">~{estimateWeeksFromTokens(defaultModel.capabilities?.maxOutputTokens)} {copy(locale, 'weeks of programming', 'veckors program')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{copy(locale, 'Input price', 'Input-pris')}:</span>{' '}
                  <span className="font-medium">${defaultModel.pricing?.input}/1M tokens</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{copy(locale, 'Output price', 'Output-pris')}:</span>{' '}
                  <span className="font-medium">${defaultModel.pricing?.output}/1M tokens</span>
                </div>
              </div>
            </div>
          )}

          {/* Long program recommendation */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
            <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
              {copy(locale, 'Tips for long training programs', 'Tips för långa träningsprogram')}
            </p>
            <p className="mb-2 text-xs text-blue-800 dark:text-blue-200">
              {copy(locale, 'To generate 6-9 month programs, choose a model with high output capacity:', 'För att generera 6-9 månaders program, välj en modell med hög output-kapacitet:')}
            </p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-blue-800 dark:text-blue-200">
              <li><strong>GPT-5.4</strong> - 128K output (~32 {copy(locale, 'weeks', 'veckor')}) - {copy(locale, 'Best for longer programs', 'Bäst för längre program')}</li>
              <li><strong>Gemini 3.1 Pro / Claude Sonnet 4.6</strong> - 64K output (~16 {copy(locale, 'weeks', 'veckor')}) - {copy(locale, 'Good balance', 'Bra balans')}</li>
              <li><strong>Haiku / Nano</strong> - 8-16K output (~2-4 {copy(locale, 'weeks', 'veckor')}) - {copy(locale, 'Fast for short programs', 'Snabbt för korta program')}</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            {copy(locale, 'This model is used automatically in AI Studio, program generation, and other AI features unless you choose another model explicitly.', 'Denna modell används automatiskt i AI Studio, programgenerering, och andra AI-funktioner om du inte väljer en annan modell specifikt.')}
          </p>
      </div>
    </RolePanel>
  );
}
