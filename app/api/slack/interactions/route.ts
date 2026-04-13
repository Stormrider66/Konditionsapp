/**
 * Slack Interactions Handler
 *
 * POST /api/slack/interactions — Handles interactive component payloads
 * (button clicks from approval requests, modal submissions, etc.)
 *
 * When the bot posts an approval request (e.g., "Merge PR #312?"),
 * and the founder clicks "Approve", Slack sends the payload here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySlackRequest, replyInThread, updateMessage } from '@/lib/slack/client'
import { executeGitHubTool } from '@/lib/slack/github-code-tools'
import { executeOperatorTool } from '@/lib/operator-agents/tool-executor'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verify the request
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (signingSecret) {
    const timestamp = req.headers.get('x-slack-request-timestamp') || ''
    const signature = req.headers.get('x-slack-signature') || ''
    if (!verifySlackRequest(signingSecret, timestamp, rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // Slack sends interactions as form-encoded with a `payload` field
  const params = new URLSearchParams(rawBody)
  const payloadStr = params.get('payload')
  if (!payloadStr) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }

  const payload = JSON.parse(payloadStr)
  const { type, actions, channel, message, user } = payload

  if (type === 'block_actions' && actions?.length > 0) {
    const action = actions[0]
    const actionId = action.action_id as string // 'approve' or 'reject'
    const blockId = action.block_id as string   // callback ID (e.g., "merge_pr", "send_email")
    const contextStr = action.value as string

    let context: Record<string, string> = {}
    try {
      context = JSON.parse(contextStr)
    } catch {
      context = {}
    }

    const channelId = channel?.id as string
    const threadTs = message?.thread_ts || message?.ts
    const messageTs = message?.ts

    logger.info('[slack/interactions] Button clicked', {
      actionId,
      blockId,
      context,
      user: user?.username,
    })

    // Process the action asynchronously
    processInteraction({
      actionId,
      blockId,
      context,
      channelId,
      threadTs,
      messageTs,
      userId: user?.id,
    }).catch(error => {
      logger.error('[slack/interactions] Processing failed', {}, error)
    })
  }

  // Return 200 immediately to acknowledge
  return NextResponse.json({ ok: true })
}

async function processInteraction(options: {
  actionId: string
  blockId: string
  context: Record<string, string>
  channelId: string
  threadTs: string
  messageTs: string
  userId: string
}): Promise<void> {
  const { actionId, blockId, context, channelId, threadTs, messageTs } = options

  if (actionId === 'reject') {
    // User clicked Skip/Reject — acknowledge and do nothing
    await updateMessage(channelId, messageTs, `~~${blockId}~~ — Skipped`)
    return
  }

  if (actionId === 'approve') {
    // Route to the appropriate handler based on blockId
    switch (blockId) {
      case 'merge_pr': {
        const prNumber = parseInt(context.prNumber, 10)
        if (!prNumber) {
          await replyInThread(channelId, threadTs, 'Missing PR number.')
          return
        }
        await updateMessage(channelId, messageTs, `:hourglass_flowing_sand: Merging PR #${prNumber}...`)
        const result = await executeGitHubTool('mergePR', { prNumber }) as { success: boolean; error?: string }
        if (result.success) {
          await updateMessage(channelId, messageTs, `:white_check_mark: PR #${prNumber} merged successfully.`)
        } else {
          await replyInThread(channelId, threadTs, `:x: Failed to merge PR #${prNumber}: ${result.error}`)
        }
        break
      }

      case 'send_email': {
        const { to, subject, body } = context
        if (!to || !subject || !body) {
          await replyInThread(channelId, threadTs, 'Missing email details.')
          return
        }
        try {
          const { sendEmail } = await import('@/lib/email')
          await sendEmail({ to, subject, html: body })
          await updateMessage(channelId, messageTs, `:white_check_mark: Email sent to ${to}.`)
        } catch (error) {
          await replyInThread(channelId, threadTs, `:x: Failed to send email: ${String(error)}`)
        }
        break
      }

      case 'create_github_issue': {
        const { title, body: issueBody, labels: labelsStr } = context
        const labels = labelsStr ? labelsStr.split(',') : []
        const result = await executeOperatorTool('createGitHubIssue', {
          title,
          body: issueBody,
          labels,
        }) as { success: boolean; data?: { url?: string }; error?: string }
        if (result.success && result.data?.url) {
          await updateMessage(channelId, messageTs, `:white_check_mark: Issue created: ${result.data.url}`)
        } else {
          await replyInThread(channelId, threadTs, `:x: Failed to create issue: ${result.error || 'Unknown'}`)
        }
        break
      }

      default: {
        await replyInThread(channelId, threadTs, `Unknown action: ${blockId}. Approved but no handler found.`)
        break
      }
    }
  }
}
