import type { EpisodeMeta, WithSeason } from '@danmaku-anywhere/danmaku-converter'
import { useSuspenseQuery } from '@tanstack/react-query'
import { seasonQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

/**
 * Chinese ordinal suffixes for sorting (上中下)
 */
const chineseOrdinalOrder: Record<string, number> = {
  上: 1,
  中: 2,
  下: 3,
}

/**
 * Extract the first number from a string for sorting
 * Returns null if no number found
 */
const extractNumber = (str: string): number | null => {
  const match = str.match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : null
}

/**
 * Extract Chinese ordinal suffix (上/中/下) from a string
 * Returns the order value (1/2/3) or 0 if not found
 */
const extractChineseOrdinal = (str: string): number => {
  for (const [char, order] of Object.entries(chineseOrdinalOrder)) {
    if (str.includes(char)) {
      return order
    }
  }
  return 0
}

/**
 * Compare two episode titles for sorting
 * Priority: number in title > Chinese ordinal (上中下) > original order
 */
const compareEpisodeTitles = (
  a: WithSeason<EpisodeMeta>,
  b: WithSeason<EpisodeMeta>,
  aIndex: number,
  bIndex: number
): number => {
  const aNum = extractNumber(a.title)
  const bNum = extractNumber(b.title)

  // Both have numbers - sort by number
  if (aNum !== null && bNum !== null) {
    if (aNum !== bNum) {
      return aNum - bNum
    }
    // Same number, check Chinese ordinal
    const aOrdinal = extractChineseOrdinal(a.title)
    const bOrdinal = extractChineseOrdinal(b.title)
    if (aOrdinal !== bOrdinal) {
      return aOrdinal - bOrdinal
    }
    // Fall back to original order
    return aIndex - bIndex
  }

  // Only one has a number - the one with number comes first
  if (aNum !== null) return -1
  if (bNum !== null) return 1

  // Neither has a number - check Chinese ordinal
  const aOrdinal = extractChineseOrdinal(a.title)
  const bOrdinal = extractChineseOrdinal(b.title)
  if (aOrdinal !== bOrdinal && aOrdinal !== 0 && bOrdinal !== 0) {
    return aOrdinal - bOrdinal
  }

  // Fall back to original API order
  return aIndex - bIndex
}

/**
 * Sort episodes by title number and Chinese ordinal
 */
const sortEpisodes = (
  episodes: WithSeason<EpisodeMeta>[]
): WithSeason<EpisodeMeta>[] => {
  // Create array with original indices
  const indexed = episodes.map((ep, index) => ({ ep, index }))

  // Sort using the comparison function
  indexed.sort((a, b) => compareEpisodeTitles(a.ep, b.ep, a.index, b.index))

  return indexed.map(({ ep }) => ep)
}

export const useSearchEpisode = (seasonId: number) => {
  return useSuspenseQuery({
    queryKey: seasonQueryKeys.episodes(seasonId),
    queryFn: () => {
      return chromeRpcClient.episodeFetchBySeason({
        seasonId,
      })
    },
    select: (data) => sortEpisodes(data.data),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}
