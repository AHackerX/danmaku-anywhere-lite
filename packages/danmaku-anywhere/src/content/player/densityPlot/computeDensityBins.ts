import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import type { DanmakuFilter, DanmakuGap } from '@danmaku-anywhere/danmaku-engine'
import type { DensityPoint } from '@/content/player/densityPlot/types'

export interface ComputeDensityOptions {
  /** Offset in milliseconds */
  offset?: number
  /** Filters to apply */
  filters?: DanmakuFilter[]
  /** Gaps to exclude from density calculation */
  gaps?: DanmakuGap[]
}

// Check if a comment should be filtered out
const shouldFilter = (comment: string, filters: DanmakuFilter[]): boolean => {
  return filters.some(({ type, value, enabled }) => {
    if (!enabled) return false
    switch (type) {
      case 'text':
        return comment.includes(value)
      case 'regex':
        return new RegExp(value).test(comment)
      default:
        return false
    }
  })
}

// Check if a time falls within any gap
const isInGap = (time: number, gaps: DanmakuGap[]): boolean => {
  return gaps.some((gap) => time >= gap.start && time < gap.end)
}

export function computeDensityBins(
  comments: CommentEntity[],
  duration: number,
  binSizeSec = 10,
  options: ComputeDensityOptions = {}
): DensityPoint[] {
  const { offset = 0, filters = [], gaps = [] } = options

  if (!Number.isFinite(duration) || duration <= 0) {
    return []
  }
  const binSize = Math.max(1, binSizeSec)
  const binCount = Math.max(1, Math.ceil(duration / binSize))
  const counts = new Array<number>(binCount).fill(0)

  // Convert offset from ms to seconds
  const offsetSec = offset / 1000

  for (const c of comments) {
    // Apply filters
    if (filters.length > 0 && shouldFilter(c.m, filters)) {
      continue
    }

    const [timeStr] = c.p.split(',')
    // Apply offset to the time
    const t = Number.parseFloat(timeStr) + offsetSec

    if (!Number.isFinite(t) || t < 0 || t > duration) {
      continue
    }

    // Skip comments that fall within gaps
    if (gaps.length > 0 && isInGap(t, gaps)) {
      continue
    }

    const idx = Math.min(binCount - 1, Math.floor(t / binSize))
    counts[idx] += 1
  }

  const maxCount = counts.reduce((m, v) => (v > m ? v : m), 0) || 1

  return counts.map((cnt, i) => {
    const time = Math.min(duration, i * binSize + binSize / 2)
    const value = cnt / maxCount
    return { time, value }
  })
}
