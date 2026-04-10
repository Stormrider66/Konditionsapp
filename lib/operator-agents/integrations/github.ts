/**
 * GitHub REST API client
 *
 * Minimal wrapper around GitHub's REST API for creating issues from
 * operator agents. Uses fetch directly to avoid adding a dependency.
 *
 * Requires env vars:
 * - GITHUB_TOKEN: Personal access token with `repo` scope (or fine-grained
 *   token with "Issues: Read and write" permission)
 * - GITHUB_REPO: Target repo in "owner/name" format (e.g. "stormrider66/konditionsapp")
 *
 * If either is missing, calls return { configured: false } and the agent
 * workflow degrades gracefully.
 */

import { logger } from '@/lib/logger'

export interface GitHubIssueResult {
  configured: boolean
  created: boolean
  url?: string
  issueNumber?: number
  error?: string
}

const GITHUB_API = 'https://api.github.com'

function getConfig(): { token: string; repo: string } | null {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token || !repo) return null
  return { token, repo }
}

export function isGitHubConfigured(): boolean {
  return getConfig() !== null
}

/**
 * Create a new GitHub issue in the configured repo.
 * Returns the issue URL on success.
 */
export async function createIssue(options: {
  title: string
  body: string
  labels?: string[]
}): Promise<GitHubIssueResult> {
  const config = getConfig()
  if (!config) {
    logger.warn('[github] GITHUB_TOKEN or GITHUB_REPO not set — issue creation skipped', {
      title: options.title,
    })
    return { configured: false, created: false, error: 'GitHub not configured' }
  }

  try {
    const response = await fetch(`${GITHUB_API}/repos/${config.repo}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'KonditionsAppOperatorAgents/1.0',
      },
      body: JSON.stringify({
        title: options.title.slice(0, 256),
        body: options.body.slice(0, 65536), // GitHub max body is 65536 chars
        labels: options.labels?.slice(0, 100) || [],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'no body')
      logger.error('[github] Issue creation failed', {
        status: response.status,
        error: errorText.slice(0, 500),
      })
      return {
        configured: true,
        created: false,
        error: `GitHub API ${response.status}: ${errorText.slice(0, 200)}`,
      }
    }

    const data = await response.json() as { html_url: string; number: number }

    logger.info('[github] Issue created', {
      url: data.html_url,
      number: data.number,
    })

    return {
      configured: true,
      created: true,
      url: data.html_url,
      issueNumber: data.number,
    }
  } catch (error) {
    logger.error('[github] Issue creation threw', {}, error)
    return {
      configured: true,
      created: false,
      error: String(error),
    }
  }
}
