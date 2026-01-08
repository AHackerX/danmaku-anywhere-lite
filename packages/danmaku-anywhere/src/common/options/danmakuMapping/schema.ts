import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { z } from 'zod'

/**
 * Schema for storing the mapping between a URL and the danmaku episodes
 */
export interface DanmakuMappingEntry {
  /**
   * The URL pattern or exact URL of the page
   */
  url: string
  /**
   * The episode IDs that were mounted on this URL
   */
  episodeIds: number[]
  /**
   * Whether the episodes are custom episodes
   */
  isCustom: boolean[]
  /**
   * Timestamp when this mapping was created/updated
   */
  timestamp: number
}

export interface DanmakuMappingData {
  /**
   * Version for future migrations
   */
  version: number
  /**
   * Map of URL to danmaku mapping entries
   * Key is the normalized URL (without query params and hash)
   */
  mappings: Record<string, DanmakuMappingEntry>
}

export const defaultDanmakuMappingData: DanmakuMappingData = {
  version: 1,
  mappings: {},
}

/**
 * Normalize URL by removing query params and hash
 */
export const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    // Keep origin and pathname only
    return `${urlObj.origin}${urlObj.pathname}`
  } catch {
    return url
  }
}

/**
 * Extract episode IDs and custom flags from episodes
 */
export const extractEpisodeInfo = (
  episodes: GenericEpisodeLite[]
): { episodeIds: number[]; isCustom: boolean[] } => {
  const episodeIds: number[] = []
  const isCustom: boolean[] = []

  for (const episode of episodes) {
    episodeIds.push(episode.id)
    isCustom.push(episode.provider === 'Custom')
  }

  return { episodeIds, isCustom }
}
