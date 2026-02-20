/**
 * Seed AI Models
 *
 * Run with: npx ts-node scripts/seed-ai-models.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AI_MODELS = [
  // Anthropic Models (Current as of February 2026)
  // Source: https://platform.claude.com/docs/en/about-claude/models/overview
  {
    provider: 'ANTHROPIC' as const,
    modelId: 'claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4.6',
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
    modelId: 'claude-opus-4-6',
    displayName: 'Claude Opus 4.6',
    description: 'Mest kapabel modell, bäst för komplexa uppgifter',
    capabilities: ['text', 'code', 'vision', 'reasoning'],
    maxTokens: 200000,
    maxOutputTokens: 128000,
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
  // Google Models (February 2026)
  // Source: https://ai.google.dev/gemini-api/docs/models
  // Model IDs: gemini-3-flash-preview, gemini-2.5-pro, gemini-3.1-pro-preview
  {
    provider: 'GOOGLE' as const,
    modelId: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash',
    description: 'Snabb och kostnadseffektiv, senaste flash-modellen (rekommenderad)',
    capabilities: ['text', 'code', 'vision', 'audio', 'video'],
    maxTokens: 1000000,
    maxOutputTokens: 64000,
    inputCostPer1k: 0.0005,
    outputCostPer1k: 0.003,
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
    modelId: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro',
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
  // Source: https://platform.openai.com/docs/models, https://openai.com/index/introducing-gpt-5-2/
  {
    provider: 'OPENAI' as const,
    modelId: 'gpt-5.2-pro',
    displayName: 'GPT-5.2 Pro',
    description: 'Mest kraftfulla modellen med xhigh reasoning för avancerad forskning',
    capabilities: ['text', 'code', 'vision', 'reasoning', 'thinking'],
    maxTokens: 400000,
    maxOutputTokens: 128000,
    inputCostPer1k: 0.021,  // $21/1M tokens
    outputCostPer1k: 0.168, // $168/1M tokens
    isActive: true,
    isDefault: false,
  },
  {
    provider: 'OPENAI' as const,
    modelId: 'gpt-5.2',
    displayName: 'GPT-5.2',
    description: 'OpenAIs flaggskeppsmodell med 128K output - bäst för långa program',
    capabilities: ['text', 'code', 'vision', 'reasoning'],
    maxTokens: 400000,
    maxOutputTokens: 128000,
    inputCostPer1k: 0.00175, // $1.75/1M tokens
    outputCostPer1k: 0.014,  // $14/1M tokens
    isActive: true,
    isDefault: false,
  },
  {
    provider: 'OPENAI' as const,
    modelId: 'gpt-5.2-instant',
    displayName: 'GPT-5.2 Instant',
    description: 'Snabb och billig för vardagsuppgifter',
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

  // First, deactivate all existing models
  const deactivated = await prisma.aIModel.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  console.log(`  → Deactivated ${deactivated.count} existing models`);

  // Then upsert and activate the current models
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
