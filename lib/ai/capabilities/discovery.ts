import type { AiCapabilityActionType, AiCapabilityDefinition, AiCapabilityRole } from './registry'

export type AiCapabilityDiscoveryItem = Pick<
  AiCapabilityDefinition,
  'id' | 'label' | 'description' | 'actionType' | 'riskLevel' | 'requiresConfirmation'
>

export interface AiCapabilityDiscoverySummary {
  total: number
  direct: number
  confirmationRequired: number
  byActionType: Record<AiCapabilityActionType, number>
}

export interface AiCapabilityDiscoveryPromptOptions {
  role: AiCapabilityRole
  locale?: 'en' | 'sv'
  operationsEnabled: boolean
  capabilities: AiCapabilityDiscoveryItem[]
  pageTitle?: string | null
}

const actionTypes: AiCapabilityActionType[] = [
  'read',
  'navigation',
  'write',
  'send',
  'delete',
  'major_edit',
]

export function summarizeAiCapabilitiesForDiscovery(
  capabilities: AiCapabilityDiscoveryItem[]
): AiCapabilityDiscoverySummary {
  const byActionType = Object.fromEntries(
    actionTypes.map((actionType) => [actionType, 0])
  ) as Record<AiCapabilityActionType, number>

  for (const capability of capabilities) {
    byActionType[capability.actionType] += 1
  }

  return {
    total: capabilities.length,
    direct: capabilities.filter((capability) => !capability.requiresConfirmation).length,
    confirmationRequired: capabilities.filter((capability) => capability.requiresConfirmation).length,
    byActionType,
  }
}

export function buildAiCapabilityDiscoveryPrompt({
  role,
  locale = 'en',
  operationsEnabled,
  capabilities,
  pageTitle,
}: AiCapabilityDiscoveryPromptOptions): string {
  const summary = summarizeAiCapabilitiesForDiscovery(capabilities)
  const capabilityLines = capabilities.length > 0
    ? capabilities.map((capability) => {
        const mode = capability.requiresConfirmation
          ? (locale === 'sv' ? 'kraver bekraftelse' : 'requires confirmation')
          : (locale === 'sv' ? 'kan koras direkt' : 'can run directly')
        return `- ${capability.label} (${capability.id}): ${capability.description} [${mode}; ${capability.actionType}; ${capability.riskLevel} risk]`
      }).join('\n')
    : (locale === 'sv'
        ? '- Inga registrerade formagor ar tillgangliga just nu.'
        : '- No registered capabilities are available right now.')

  if (locale === 'sv') {
    return `Vad kan du gora har?

Anvand aktuell sidkontext och denna live-lista fran AI Capability Registry. Svara kort och praktiskt:
1. Vad du kan forklara eller lasa direkt.
2. Vilka atgarder som kan forberedas men kraver bekraftelsekort.
3. Vad som inte ar tillgangligt just nu pa grund av roll, behorighet, samtycke, prenumeration eller beta-flagga.

Hitta inte pa formagor utanfor listan. Sag uttryckligen att skrivande/skickande/borttagning inte kors utan bekraftelse.

Roll: ${role}
Sida: ${pageTitle || 'okand sida'}
AI operations beta: ${operationsEnabled ? 'aktiv' : 'inte aktiv'}
Summering: ${summary.total} tillgangliga, ${summary.direct} direkt, ${summary.confirmationRequired} kraver bekraftelse.

Tillgangliga formagor:
${capabilityLines}`
  }

  return `What can you do here?

Use the current page context and this live list from the AI Capability Registry. Answer briefly and practically:
1. What you can explain or read directly.
2. Which actions you can prepare but that require a confirmation card.
3. What is unavailable right now because of role, permission, consent, subscription, or beta flag gates.

Do not invent capabilities outside this list. Say explicitly that writing, sending, or deleting does not run without confirmation.

Role: ${role}
Page: ${pageTitle || 'unknown page'}
AI operations beta: ${operationsEnabled ? 'enabled' : 'not enabled'}
Summary: ${summary.total} available, ${summary.direct} direct, ${summary.confirmationRequired} require confirmation.

Available capabilities:
${capabilityLines}`
}
