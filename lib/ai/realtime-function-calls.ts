export interface RealtimeFunctionCall {
  name: string
  callId: string
  arguments: string
}

interface RealtimeResponseDoneEvent {
  type?: string
  response?: {
    output?: Array<{
      type?: string
      name?: string
      call_id?: string
      callId?: string
      arguments?: string
    }>
  }
}

export function extractRealtimeFunctionCalls(event: unknown): RealtimeFunctionCall[] {
  const data = event as RealtimeResponseDoneEvent
  if (data?.type !== 'response.done') return []

  return (data.response?.output || [])
    .filter((item) => item?.type === 'function_call' && item.name && (item.call_id || item.callId))
    .map((item) => ({
      name: item.name as string,
      callId: (item.call_id || item.callId) as string,
      arguments: typeof item.arguments === 'string' ? item.arguments : '{}',
    }))
}

export function buildRealtimeFunctionOutputEvents(callId: string, output: unknown): Array<Record<string, unknown>> {
  return [
    {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output),
      },
    },
    {
      type: 'response.create',
    },
  ]
}
