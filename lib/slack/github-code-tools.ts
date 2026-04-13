/**
 * GitHub Code Tools for Slack Agent
 *
 * Allows Claude in Slack to read, search, and modify code in the repo.
 * Uses the GitHub REST API directly.
 *
 * Requires:
 * - GITHUB_TOKEN: Personal access token with repo scope
 * - GITHUB_REPO: "owner/name" format
 */

import { logger } from '@/lib/logger'

const GITHUB_API = 'https://api.github.com'

function getConfig(): { token: string; repo: string; owner: string; name: string } | null {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token || !repo) return null
  const [owner, name] = repo.split('/')
  if (!owner || !name) return null
  return { token, repo, owner, name }
}

async function githubFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = getConfig()
  if (!config) throw new Error('GitHub not configured (missing GITHUB_TOKEN or GITHUB_REPO)')

  return fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'KonditionsApp-SlackAgent/1.0',
      ...(options.headers || {}),
    },
  })
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Read a file from the repo's default branch.
 */
async function readFile(path: string): Promise<{ success: boolean; content?: string; error?: string }> {
  const config = getConfig()
  if (!config) return { success: false, error: 'GitHub not configured' }

  try {
    const response = await githubFetch(`/repos/${config.repo}/contents/${path}`)
    if (!response.ok) {
      if (response.status === 404) return { success: false, error: `File not found: ${path}` }
      return { success: false, error: `GitHub API ${response.status}` }
    }

    const data = await response.json() as { content?: string; encoding?: string; size?: number }
    if (!data.content) return { success: false, error: 'Empty file or directory' }

    // GitHub returns base64-encoded content
    const content = Buffer.from(data.content, 'base64').toString('utf-8')

    // Truncate very large files to avoid context bloat
    const MAX_CHARS = 15_000
    if (content.length > MAX_CHARS) {
      return {
        success: true,
        content: content.slice(0, MAX_CHARS) + `\n\n... [truncated, total ${content.length} chars]`,
      }
    }

    return { success: true, content }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Search the codebase for a string.
 */
async function searchCode(query: string): Promise<{
  success: boolean
  results?: { path: string; matches: string[] }[]
  error?: string
}> {
  const config = getConfig()
  if (!config) return { success: false, error: 'GitHub not configured' }

  try {
    // text-match+json header enables text_matches in response
    const response = await githubFetch(
      `/search/code?q=${encodeURIComponent(query)}+repo:${config.repo}&per_page=10`,
      { headers: { 'Accept': 'application/vnd.github.v3.text-match+json' } }
    )

    if (!response.ok) {
      return { success: false, error: `Search failed: ${response.status}` }
    }

    const data = await response.json() as {
      items: Array<{
        path: string
        text_matches?: Array<{ fragment: string }>
      }>
    }

    const results = data.items.map(item => ({
      path: item.path,
      matches: (item.text_matches || []).map(m => m.fragment).slice(0, 3),
    }))

    return { success: true, results }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Create a branch, push file changes as a single atomic commit, and open a PR.
 *
 * Uses the Git Trees API instead of the Contents API so that all file
 * changes land in one commit (clean history, no partial states).
 *
 * Flow: get base tree → create blobs → create new tree → create commit → create branch → create PR
 */
async function createBranchAndPushFix(options: {
  branchName: string
  prTitle: string
  prBody: string
  files: Array<{ path: string; content: string }>
}): Promise<{ success: boolean; prUrl?: string; prNumber?: number; error?: string }> {
  const config = getConfig()
  if (!config) return { success: false, error: 'GitHub not configured' }

  try {
    // 1. Get the SHA of main branch head commit
    const mainRef = await githubFetch(`/repos/${config.repo}/git/ref/heads/main`)
    if (!mainRef.ok) {
      return { success: false, error: `Failed to get main branch: ${mainRef.status}` }
    }
    const mainData = await mainRef.json() as { object: { sha: string } }
    const baseCommitSha = mainData.object.sha

    // 2. Get the base tree SHA from the head commit
    const commitRes = await githubFetch(`/repos/${config.repo}/git/commits/${baseCommitSha}`)
    if (!commitRes.ok) {
      return { success: false, error: `Failed to get base commit: ${commitRes.status}` }
    }
    const commitData = await commitRes.json() as { tree: { sha: string } }
    const baseTreeSha = commitData.tree.sha

    // 3. Create blobs for each file and build tree entries
    const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = []

    for (const file of options.files) {
      const blobRes = await githubFetch(`/repos/${config.repo}/git/blobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        }),
      })

      if (!blobRes.ok) {
        const err = await blobRes.text()
        return { success: false, error: `Failed to create blob for ${file.path}: ${err.slice(0, 200)}` }
      }

      const blobData = await blobRes.json() as { sha: string }
      treeEntries.push({
        path: file.path,
        mode: '100644', // Regular file
        type: 'blob',
        sha: blobData.sha,
      })
    }

    // 4. Create new tree with the file changes
    const treeRes = await githubFetch(`/repos/${config.repo}/git/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeEntries,
      }),
    })

    if (!treeRes.ok) {
      const err = await treeRes.text()
      return { success: false, error: `Failed to create tree: ${err.slice(0, 200)}` }
    }

    const treeData = await treeRes.json() as { sha: string }

    // 5. Create the commit (single atomic commit for all files)
    const newCommitRes = await githubFetch(`/repos/${config.repo}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `fix: ${options.prTitle}`,
        tree: treeData.sha,
        parents: [baseCommitSha],
      }),
    })

    if (!newCommitRes.ok) {
      const err = await newCommitRes.text()
      return { success: false, error: `Failed to create commit: ${err.slice(0, 200)}` }
    }

    const newCommitData = await newCommitRes.json() as { sha: string }

    // 6. Create branch pointing to the new commit
    const branchRes = await githubFetch(`/repos/${config.repo}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: `refs/heads/${options.branchName}`,
        sha: newCommitData.sha,
      }),
    })

    if (!branchRes.ok) {
      const err = await branchRes.text()
      return { success: false, error: `Failed to create branch: ${err.slice(0, 200)}` }
    }

    // 7. Create PR
    const prRes = await githubFetch(`/repos/${config.repo}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: options.prTitle,
        body: options.prBody + '\n\n_Created by Slack AI Agent_',
        head: options.branchName,
        base: 'main',
      }),
    })

    if (!prRes.ok) {
      const err = await prRes.text()
      return { success: false, error: `Failed to create PR: ${err.slice(0, 200)}` }
    }

    const prData = await prRes.json() as { html_url: string; number: number }

    logger.info('[slack-github] Created PR', {
      prUrl: prData.html_url,
      prNumber: prData.number,
      branch: options.branchName,
      files: options.files.length,
    })

    return {
      success: true,
      prUrl: prData.html_url,
      prNumber: prData.number,
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Merge a pull request.
 */
async function mergePR(prNumber: number): Promise<{ success: boolean; error?: string }> {
  const config = getConfig()
  if (!config) return { success: false, error: 'GitHub not configured' }

  try {
    const response = await githubFetch(`/repos/${config.repo}/pulls/${prNumber}/merge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merge_method: 'squash' }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { success: false, error: `Failed to merge PR #${prNumber}: ${err.slice(0, 200)}` }
    }

    logger.info('[slack-github] Merged PR', { prNumber })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * List open PRs.
 */
async function listOpenPRs(): Promise<{
  success: boolean
  prs?: Array<{ number: number; title: string; url: string; author: string; created: string }>
  error?: string
}> {
  const config = getConfig()
  if (!config) return { success: false, error: 'GitHub not configured' }

  try {
    const response = await githubFetch(`/repos/${config.repo}/pulls?state=open&per_page=20`)
    if (!response.ok) {
      return { success: false, error: `GitHub API ${response.status}` }
    }

    const data = await response.json() as Array<{
      number: number
      title: string
      html_url: string
      user: { login: string }
      created_at: string
    }>

    return {
      success: true,
      prs: data.map(pr => ({
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        author: pr.user.login,
        created: pr.created_at,
      })),
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// TOOL ROUTER
// ============================================================================

export async function executeGitHubTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'readFile':
      return readFile(input.path as string)
    case 'searchCode':
      return searchCode(input.query as string)
    case 'createBranchAndPushFix':
      return createBranchAndPushFix({
        branchName: input.branchName as string,
        prTitle: input.prTitle as string,
        prBody: input.prBody as string,
        files: input.files as Array<{ path: string; content: string }>,
      })
    case 'mergePR':
      return mergePR(input.prNumber as number)
    case 'listOpenPRs':
      return listOpenPRs()
    default:
      return { success: false, error: `Unknown GitHub tool: ${name}` }
  }
}
