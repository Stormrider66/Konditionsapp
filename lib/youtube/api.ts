// lib/youtube/api.ts
/**
 * YouTube Data API v3 Integration
 *
 * Fetches playlist information and videos from YouTube.
 * Requires YOUTUBE_API_KEY environment variable.
 *
 * @see https://developers.google.com/youtube/v3/docs
 */

import { logger } from '@/lib/logger'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// Types
export interface YouTubeVideo {
  id: string
  title: string
  url: string
  thumbnailUrl: string | null
  duration: string | null
  publishedAt: string
  position: number
}

export interface YouTubePlaylist {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  videoCount: number
  channelTitle: string
}

interface YouTubePlaylistItemResponse {
  items: Array<{
    snippet: {
      title: string
      description: string
      thumbnails: {
        default?: { url: string }
        medium?: { url: string }
        high?: { url: string }
      }
      resourceId: {
        videoId: string
      }
      position: number
      publishedAt: string
    }
    contentDetails?: {
      videoId: string
    }
  }>
  nextPageToken?: string
  pageInfo: {
    totalResults: number
  }
}

interface YouTubeVideoDetailsResponse {
  items: Array<{
    id: string
    contentDetails: {
      duration: string // ISO 8601 duration (e.g., "PT2M30S")
    }
  }>
}

interface YouTubePlaylistResponse {
  items: Array<{
    id: string
    snippet: {
      title: string
      description: string
      thumbnails: {
        default?: { url: string }
        medium?: { url: string }
        high?: { url: string }
      }
      channelTitle: string
    }
    contentDetails: {
      itemCount: number
    }
  }>
}

/**
 * Check if YouTube API is configured
 */
export function isYouTubeConfigured(): boolean {
  return !!process.env.YOUTUBE_API_KEY
}

/**
 * Extract playlist ID from various YouTube URL formats
 *
 * Supported formats:
 * - https://www.youtube.com/playlist?list=PLxxxxxxx
 * - https://youtube.com/playlist?list=PLxxxxxxx
 * - https://www.youtube.com/watch?v=xxx&list=PLxxxxxxx
 * - PLxxxxxxx (direct ID)
 */
export function extractPlaylistId(url: string): string | null {
  if (!url) return null

  // Already a playlist ID
  if (/^PL[a-zA-Z0-9_-]+$/.test(url.trim())) {
    return url.trim()
  }

  // URL format
  try {
    const urlObj = new URL(url)
    const listParam = urlObj.searchParams.get('list')
    if (listParam) {
      return listParam
    }
  } catch {
    // Not a valid URL
  }

  // Try to extract from non-standard formats
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  if (match) {
    return match[1]
  }

  return null
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null

  // Already a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    return url.trim()
  }

  // youtube.com/watch?v=xxx
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname.includes('youtube.com')) {
      const vParam = urlObj.searchParams.get('v')
      if (vParam) return vParam
    }
    // youtu.be/xxx
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1)
    }
  } catch {
    // Not a valid URL
  }

  return null
}

/**
 * Convert ISO 8601 duration to human-readable format
 * PT2M30S -> "2:30"
 * PT1H2M30S -> "1:02:30"
 */
export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Build YouTube watch URL
 */
export function buildVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/**
 * Build YouTube embed URL
 */
export function buildEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

/**
 * Fetch playlist details from YouTube API
 */
export async function getPlaylistDetails(playlistId: string): Promise<YouTubePlaylist | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured')
  }

  const url = new URL(`${YOUTUBE_API_BASE}/playlists`)
  url.searchParams.set('part', 'snippet,contentDetails')
  url.searchParams.set('id', playlistId)
  url.searchParams.set('key', apiKey)

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      const error = await response.json()
      logger.error('YouTube API error', { playlistId, error })
      throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`)
    }

    const data: YouTubePlaylistResponse = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    const playlist = data.items[0]
    return {
      id: playlist.id,
      title: playlist.snippet.title,
      description: playlist.snippet.description || null,
      thumbnailUrl: playlist.snippet.thumbnails?.high?.url ||
                    playlist.snippet.thumbnails?.medium?.url ||
                    playlist.snippet.thumbnails?.default?.url || null,
      videoCount: playlist.contentDetails.itemCount,
      channelTitle: playlist.snippet.channelTitle,
    }
  } catch (error: unknown) {
    logger.error('Failed to fetch playlist details', { playlistId }, error)
    throw error
  }
}

/**
 * Fetch all videos from a YouTube playlist
 * Handles pagination automatically
 */
export async function fetchPlaylistVideos(playlistId: string): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured')
  }

  const videos: YouTubeVideo[] = []
  let nextPageToken: string | undefined

  try {
    // Fetch all playlist items (paginated)
    do {
      const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`)
      url.searchParams.set('part', 'snippet,contentDetails')
      url.searchParams.set('playlistId', playlistId)
      url.searchParams.set('maxResults', '50') // Max allowed
      url.searchParams.set('key', apiKey)
      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        const error = await response.json()
        logger.error('YouTube API error', { playlistId, error })
        throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`)
      }

      const data: YouTubePlaylistItemResponse = await response.json()

      for (const item of data.items) {
        const videoId = item.snippet.resourceId.videoId
        videos.push({
          id: videoId,
          title: item.snippet.title,
          url: buildVideoUrl(videoId),
          thumbnailUrl: item.snippet.thumbnails?.medium?.url ||
                        item.snippet.thumbnails?.default?.url || null,
          duration: null, // Will be fetched separately
          publishedAt: item.snippet.publishedAt,
          position: item.snippet.position,
        })
      }

      nextPageToken = data.nextPageToken
    } while (nextPageToken)

    // Fetch video durations in batches of 50
    await fetchVideoDurations(videos, apiKey)

    return videos
  } catch (error: unknown) {
    logger.error('Failed to fetch playlist videos', { playlistId }, error)
    throw error
  }
}

/**
 * Fetch durations for a list of videos
 * Updates the videos array in place
 */
async function fetchVideoDurations(videos: YouTubeVideo[], apiKey: string): Promise<void> {
  const batchSize = 50

  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize)
    const videoIds = batch.map(v => v.id).join(',')

    const url = new URL(`${YOUTUBE_API_BASE}/videos`)
    url.searchParams.set('part', 'contentDetails')
    url.searchParams.set('id', videoIds)
    url.searchParams.set('key', apiKey)

    try {
      const response = await fetch(url.toString())
      if (!response.ok) {
        logger.warn('Failed to fetch video durations', { batchIndex: i })
        continue
      }

      const data: YouTubeVideoDetailsResponse = await response.json()

      for (const item of data.items) {
        const video = videos.find(v => v.id === item.id)
        if (video) {
          video.duration = formatDuration(item.contentDetails.duration)
        }
      }
    } catch (error) {
      logger.warn('Error fetching video durations', { batchIndex: i, error })
    }
  }
}

/**
 * Validate that a playlist is accessible
 */
export async function validatePlaylist(playlistId: string): Promise<{
  valid: boolean
  playlist?: YouTubePlaylist
  error?: string
}> {
  try {
    const playlist = await getPlaylistDetails(playlistId)
    if (!playlist) {
      return { valid: false, error: 'Playlist not found or is private' }
    }
    if (playlist.videoCount === 0) {
      return { valid: false, error: 'Playlist is empty', playlist }
    }
    return { valid: true, playlist }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { valid: false, error: message }
  }
}
