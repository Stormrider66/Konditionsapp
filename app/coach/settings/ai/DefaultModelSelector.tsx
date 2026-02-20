'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [models, setModels] = useState<AIModel[]>([]);
  const [defaultModel, setDefaultModel] = useState<AIModel | null>(null);
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [modelsRes, defaultRes, keysRes] = await Promise.all([
        fetch('/api/ai/models'),
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
  }

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
        setError(data.error || 'Kunde inte spara inställningen');
      }
    } catch (err) {
      setError('Nätverksfel. Försök igen.');
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
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <CardTitle className="text-lg">Standard AI-modell</CardTitle>
              <CardDescription>
                Välj vilken AI-modell som ska användas som standard i alla AI-funktioner
              </CardDescription>
            </div>
          </div>
          {defaultModel && (
            <Badge variant="default" className="bg-blue-500">
              <Check className="h-3 w-3 mr-1" />
              Konfigurerad
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select
            value={defaultModel?.id || ''}
            onValueChange={handleModelChange}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj standardmodell">
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
                  Tillgängliga modeller
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
                            Rekommenderad
                          </Badge>
                        )}
                        {model.bestForLongOutput && (
                          <Badge variant="outline" className="text-xs py-0 border-green-500 text-green-600">
                            <FileText className="h-3 w-3 mr-1" />
                            Långa program
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {formatTokenCount(model.capabilities?.maxOutputTokens)} output
                          <span className="text-muted-foreground/70">
                            (~{estimateWeeksFromTokens(model.capabilities?.maxOutputTokens)} veckor)
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
                    Ej tillgängliga (saknar API-nyckel)
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
                            {getProviderLabel(model.provider)} - API-nyckel saknas
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}

              {models.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Inga AI-modeller tillgängliga
                </div>
              )}
            </SelectContent>
          </Select>

          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sparar...
            </div>
          )}

          {success && (
            <p className="text-sm text-green-600 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Standardmodell sparad!
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Model details for selected model */}
          {defaultModel && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Vald modell: {defaultModel.displayName || defaultModel.name}</span>
                {defaultModel.bestForLongOutput && (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    Bra för långa program
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Max output:</span>{' '}
                  <span className="font-medium">{formatTokenCount(defaultModel.capabilities?.maxOutputTokens)} tokens</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Uppskattad kapacitet:</span>{' '}
                  <span className="font-medium">~{estimateWeeksFromTokens(defaultModel.capabilities?.maxOutputTokens)} veckors program</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Input-pris:</span>{' '}
                  <span className="font-medium">${defaultModel.pricing?.input}/1M tokens</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Output-pris:</span>{' '}
                  <span className="font-medium">${defaultModel.pricing?.output}/1M tokens</span>
                </div>
              </div>
            </div>
          )}

          {/* Long program recommendation */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Tips för långa träningsprogram
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
              För att generera 6-9 månaders program, välj en modell med hög output-kapacitet:
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>GPT-5.2</strong> - 128K output (~32 veckor) - Bäst för längre program</li>
              <li>• <strong>Gemini 3.1 Pro / Claude Sonnet 4.6</strong> - 64K output (~16 veckor) - Bra balans</li>
              <li>• <strong>Haiku / Nano</strong> - 8-16K output (~2-4 veckor) - Snabbt för korta program</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Denna modell används automatiskt i AI Studio, programgenerering, och andra AI-funktioner
            om du inte väljer en annan modell specifikt.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
