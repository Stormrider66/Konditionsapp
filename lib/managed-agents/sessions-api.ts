/**
 * Sessions API Migration Layer
 *
 * Provides a transport abstraction so the system can switch between:
 * 1. Messages API (current) — agentic tool-calling loop in our code
 * 2. Sessions API (future) — persistent sessions managed by Anthropic
 *
 * To migrate:
 * 1. Set MANAGED_AGENTS_TRANSPORT=sessions in .env.local
 * 2. Set MANAGED_AGENTS_AGENT_ID and MANAGED_AGENTS_ENVIRONMENT_ID
 * 3. The invokeAgent function in agent-client.ts will use this transport
 *
 * The Sessions API benefits:
 * - Persistent conversation history (no need to replay messages)
 * - Server-side session management (auto-resume on events)
 * - Built-in tool execution for standard tools
 * - Streaming events for real-time UI updates
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'

export type AgentTransport = 'messages' | 'sessions'

/**
 * Get the configured transport mode.
 */
export function getTransport(): AgentTransport {
  const transport = process.env.MANAGED_AGENTS_TRANSPORT as AgentTransport | undefined
  return transport === 'sessions' ? 'sessions' : 'messages'
}

/**
 * Get pre-configured agent/environment IDs for the Sessions API.
 */
export function getSessionsConfig(): {
  agentId: string | null
  environmentId: string | null
} {
  return {
    agentId: process.env.MANAGED_AGENTS_AGENT_ID || null,
    environmentId: process.env.MANAGED_AGENTS_ENVIRONMENT_ID || null,
  }
}

/**
 * Create or resume a session using the Anthropic Sessions API.
 *
 * This is the future transport — currently behind a feature flag.
 * When MANAGED_AGENTS_TRANSPORT=sessions, this is used instead of
 * the Messages API agentic loop.
 */
export async function createOrResumeSession(
  client: Anthropic,
  options: {
    agentId: string
    environmentId: string
    resumeSessionId?: string
    title?: string
  }
): Promise<{ sessionId: string }> {
  try {
    const session = await (client as any).beta.sessions.create({
      agent: options.agentId,
      environment_id: options.environmentId,
      title: options.title || 'Managed Agent Session',
      ...(options.resumeSessionId ? { resume: options.resumeSessionId } : {}),
    })

    return { sessionId: session.id }
  } catch (error) {
    logger.error('[sessions-api] Failed to create/resume session', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    throw error
  }
}

/**
 * Send a message to a session and process the response stream.
 *
 * Handles custom tool calls by executing them locally and sending
 * results back to the session.
 */
export async function sendSessionMessage(
  client: Anthropic,
  sessionId: string,
  message: string,
  onToolCall: (name: string, input: Record<string, unknown>) => Promise<string>
): Promise<{
  response: string
  toolsUsed: string[]
}> {
  const toolsUsed: string[] = []
  let response = ''

  try {
    // Open the event stream
    const stream = await (client as any).beta.sessions.events.stream(sessionId)

    // Send the user message
    await (client as any).beta.sessions.events.send(sessionId, {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: message }],
        },
      ],
    })

    // Process events
    for await (const event of stream) {
      if (event.type === 'agent.message') {
        for (const block of event.content) {
          if (block.type === 'text') {
            response += block.text
          }
        }
      } else if (event.type === 'agent.tool_use') {
        toolsUsed.push(event.name)

        // Execute the tool locally
        const toolResult = await onToolCall(event.name, event.input as Record<string, unknown>)

        // Send the result back
        await (client as any).beta.sessions.events.send(sessionId, {
          events: [
            {
              type: 'tool.result',
              tool_use_id: event.id,
              content: [{ type: 'text', text: toolResult }],
            },
          ],
        })
      } else if (event.type === 'session.status_idle') {
        break
      }
    }

    return { response, toolsUsed }
  } catch (error) {
    logger.error('[sessions-api] Session message failed', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    throw error
  }
}

/**
 * One-time setup: Create the agent and environment definitions.
 *
 * Run this once to get the IDs, then store them in env vars.
 * POST /api/agent-tools/setup-sessions
 */
export async function setupAgentsAndEnvironments(
  client: Anthropic,
  agentConfigs: {
    name: string
    model: string
    system: string
    tools: Anthropic.Tool[]
  }[]
): Promise<{
  agents: { name: string; id: string; version: string }[]
  environment: { id: string }
}> {
  // Create environment (shared across all agents)
  const environment = await (client as any).beta.environments.create({
    name: 'konditionsapp-production',
    config: {
      type: 'cloud',
      networking: { type: 'restricted' }, // Only allow callbacks to our API
    },
  })

  // Create agent definitions
  const agents: { name: string; id: string; version: string }[] = []
  for (const config of agentConfigs) {
    const agent = await (client as any).beta.agents.create({
      name: config.name,
      model: config.model,
      system: config.system,
      tools: config.tools.map(t => ({ type: 'custom', ...t })),
    })
    agents.push({ name: config.name, id: agent.id, version: agent.version })
  }

  logger.info('[sessions-api] Setup complete', {
    environmentId: environment.id,
    agents: agents.map(a => `${a.name}: ${a.id}`),
  })

  return { agents, environment: { id: environment.id } }
}
