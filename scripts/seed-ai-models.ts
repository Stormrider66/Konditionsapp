/**
 * Seed AI Models
 *
 * Run with: npx ts-node scripts/seed-ai-models.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AI_MODELS = [
  // Anthropic Models (Current as of December 2025)
  // Source: https://docs.anthropic.com/en/docs/about-claude/models/overview
  {
    provider: 'ANTHROPIC' as const,
    modelId: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    description: 'Snabb och intelligent, bra för de flesta uppgifter',
    capabilities: ['text', 'code', 'vision'],
    maxTokens: 200000,
    maxOutputTokens: 64000,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    isActive: true,
    isDefault: true,
  },
  {
    provider: 'ANTHROPIC' as const,
    modelId: 'claude-opus-4-5-20251101',
    displayName: 'Claude Opus 4.5',
    description: 'Mest kapabel modell, bäst för komplexa uppgifter',
    capabilities: ['text', 'code', 'vision', 'reasoning'],
    maxTokens: 200000,
    maxOutputTokens: 64000,
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.025,
    isActive: true,
    isDefault: false,
  },
  {
    provider: 'ANTHROPIC' as const,
    modelId: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    description: 'Snabbast och billigast, bra för enkla uppgifter',
    capabilities: ['text', 'code', 'vision'],
    maxTokens: 200000,
    maxOutputTokens: 64000,
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.005,
    isActive: true,
    isDefault: false,
  },
  // Google Models (December 2025)
  // Source: https://ai.google.dev/gemini-api/docs/models
  // Model IDs: gemini-2.5-flash, gemini-2.5-pro, gemini-3-pro-preview
  {
    provider: 'GOOGLE' as const,
    modelId: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Snabb och kostnadseffektiv, stabil modell (rekommenderad)',
    capabilities: ['text', 'code', 'vision', 'audio', 'video'],
    maxTokens: 1000000,
    maxOutputTokens: 8192,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    isActive: true,
    isDefault: true, // Default for Google
  },
  {
    provider: 'GOOGLE' as const,
    modelId: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'Avancerad modell för komplexa uppgifter',
    capabilities: ['text', 'code', 'vision', 'audio', 'video', 'reasoning'],
    maxTokens: 1000000,
    maxOutputTokens: 65536,
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
    isActive: true,
    isDefault: false,
  },
  {
    provider: 'GOOGLE' as const,
    modelId: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro (Preview)',
    description: 'Nyaste modellen med avancerat resonemang',
    capabilities: ['text', 'code', 'vision', 'audio', 'video', 'reasoning'],
    maxTokens: 1000000,
    maxOutputTokens: 65536,
    inputCostPer1k: 0.002,
    outputCostPer1k: 0.012,
    isActive: true,
    isDefault: false,
  },
  // OpenAI Models (December 2025)
  // Source: https://platform.openai.com/docs/models
  {
    provider: 'OPENAI' as const,
    modelId: 'gpt-5.1',
    displayName: 'GPT-5.1',
    description: 'OpenAIs senaste flaggskeppsmodell med resonemang',
    capabilities: ['text', 'code', 'vision', 'reasoning'],
    maxTokens: 256000,
    maxOutputTokens: 32768,
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
    isActive: true,
    isDefault: false,
  },
  {
    provider: 'OPENAI' as const,
    modelId: 'gpt-5.1-instant',
    displayName: 'GPT-5.1 Instant',
    description: 'Snabbare version av GPT-5.1, bra för vardagsuppgifter',
    capabilities: ['text', 'code', 'vision'],
    maxTokens: 128000,
    maxOutputTokens: 16384,
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.003,
    isActive: true,
    isDefault: false,
  },
];

async function main() {
  console.log('Seeding AI models...');

  for (const model of AI_MODELS) {
    await prisma.aIModel.upsert({
      where: { modelId: model.modelId },
      update: model,
      create: model,
    });
    console.log(`  ✓ ${model.displayName} (${model.provider})`);
  }

  console.log(`\nSeeded ${AI_MODELS.length} AI models successfully!`);
}

main()
  .catch((e) => {
    console.error('Error seeding AI models:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
