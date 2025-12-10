/**
 * AI Settings Page
 *
 * Allows coaches to configure their own API keys for AI features.
 * BYOK (Bring Your Own Key) model for cost transparency.
 */

import { requireCoach } from '@/lib/auth-utils';
import { ApiKeySettingsClient } from './ApiKeySettingsClient';
import { DefaultModelSelector } from './DefaultModelSelector';

export default async function AISettingsPage() {
  await requireCoach();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI-inställningar</h1>
        <p className="mt-2 text-gray-600">
          Konfigurera AI-modeller och API-nycklar för AI-funktionerna.
        </p>
      </div>

      {/* Default Model Selection - Most Important */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Standardmodell</h2>
        <DefaultModelSelector />
      </div>

      {/* API Keys Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">API-nycklar</h2>
        <ApiKeySettingsClient />
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900">Om BYOK (Bring Your Own Key)</h3>
        <p className="mt-2 text-sm text-blue-800">
          AI Studio använder en BYOK-modell där du tillhandahåller dina egna API-nycklar.
          Detta ger dig full kontroll över kostnader och användning. Dina nycklar lagras
          krypterade och används endast för dina förfrågningar.
        </p>
        <div className="mt-4 space-y-2 text-sm text-blue-800">
          <p><strong>Anthropic (Claude):</strong> Bäst för komplexa träningsprogram och resonemang</p>
          <p><strong>Google (Gemini):</strong> Bäst för videoanalys och multimodal input</p>
          <p><strong>OpenAI:</strong> Används för embeddings och dokumentsökning</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 rounded-lg">
        <h3 className="font-semibold text-amber-900">Uppskattade kostnader</h3>
        <div className="mt-2 text-sm text-amber-800">
          <ul className="space-y-1">
            <li>Programgenerering (Claude): ~$0.15-0.30 per program</li>
            <li>Dokumentembedding (OpenAI): ~$0.0001 per sida</li>
            <li>Videoanalys (Gemini): ~$0.20 per video</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
