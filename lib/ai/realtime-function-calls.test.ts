import { describe, expect, it } from 'vitest'
import {
  buildRealtimeFunctionOutputEvents,
  extractRealtimeFunctionCalls,
} from './realtime-function-calls'

describe('realtime function call helpers', () => {
  it('extracts completed function calls from response.done events', () => {
    const calls = extractRealtimeFunctionCalls({
      type: 'response.done',
      response: {
        output: [
          {
            type: 'function_call',
            name: 'createCardioWorkout',
            call_id: 'call-1',
            arguments: '{"name":"Bike intervals"}',
          },
        ],
      },
    })

    expect(calls).toEqual([
      {
        name: 'createCardioWorkout',
        callId: 'call-1',
        arguments: '{"name":"Bike intervals"}',
      },
    ])
  })

  it('builds the function output and follow-up response events', () => {
    const events = buildRealtimeFunctionOutputEvents('call-1', {
      success: true,
      message: 'Prepared card',
    })

    const first = events[0] as { item: { output: string } }
    expect(events[0]).toMatchObject({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: 'call-1',
      },
    })
    expect(JSON.parse(first.item.output)).toEqual({
      success: true,
      message: 'Prepared card',
    })
    expect(events[1]).toEqual({ type: 'response.create' })
  })
})
