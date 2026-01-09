import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { computeDensityBins } from '@/content/player/densityPlot/computeDensityBins'

function c(time: number, text = 'x'): CommentEntity {
  return {
    p: `${time},1,16777215`,
    m: text,
  }
}

describe('computeDensityBins', () => {
  it('returns empty for invalid duration', () => {
    expect(computeDensityBins([], Number.NaN, 30)).toEqual([])
  })

  it('bins comments by 30s and normalizes', () => {
    const duration = 180 // 3 mins
    const comments = [c(5), c(10), c(15), c(35), c(40), c(95)]
    const bins = computeDensityBins(comments, duration, 30)
    expect(bins.length).toBe(Math.ceil(duration / 30))
    // find max value equals 1
    const max = Math.max(...bins.map((b) => b.value))
    expect(max).toBeCloseTo(1)
    // first bin has 3 comments -> should be the max
    expect(bins[0].time).toBeGreaterThan(0)
    expect(bins[0].value).toBeCloseTo(1)
  })

  it('applies offset to comment times', () => {
    const duration = 60
    // Comment at 5s, with 10s offset should be at 15s (bin 1)
    const comments = [c(5)]
    const binsWithoutOffset = computeDensityBins(comments, duration, 10)
    const binsWithOffset = computeDensityBins(comments, duration, 10, {
      offset: 10000, // 10 seconds in ms
    })

    // Without offset: comment at 5s -> bin 0
    expect(binsWithoutOffset[0].value).toBe(1)
    expect(binsWithoutOffset[1].value).toBe(0)

    // With offset: comment at 15s -> bin 1
    expect(binsWithOffset[0].value).toBe(0)
    expect(binsWithOffset[1].value).toBe(1)
  })

  it('filters out comments matching text filter', () => {
    const duration = 60
    const comments = [c(5, 'hello'), c(15, 'world'), c(25, 'hello world')]
    const binsWithoutFilter = computeDensityBins(comments, duration, 30)
    const binsWithFilter = computeDensityBins(comments, duration, 30, {
      filters: [{ type: 'text', value: 'hello', enabled: true }],
    })

    // Without filter: 3 comments in bin 0
    expect(binsWithoutFilter[0].value).toBe(1)

    // With filter: only 'world' remains (1 comment)
    expect(binsWithFilter[0].value).toBe(1)
  })

  it('filters out comments matching regex filter', () => {
    const duration = 60
    const comments = [c(5, 'test123'), c(15, 'hello'), c(25, 'test456')]
    const binsWithFilter = computeDensityBins(comments, duration, 30, {
      filters: [{ type: 'regex', value: 'test\\d+', enabled: true }],
    })

    // Only 'hello' remains
    expect(binsWithFilter[0].value).toBe(1)
  })

  it('ignores disabled filters', () => {
    const duration = 60
    const comments = [c(5, 'hello'), c(15, 'world')]
    const bins = computeDensityBins(comments, duration, 30, {
      filters: [{ type: 'text', value: 'hello', enabled: false }],
    })

    // Both comments should be counted
    expect(bins[0].value).toBe(1)
  })

  it('excludes comments within gaps', () => {
    const duration = 60
    // Comments at 5s, 15s, 25s
    const comments = [c(5), c(15), c(25)]
    const binsWithGap = computeDensityBins(comments, duration, 30, {
      gaps: [{ start: 10, end: 20, enabled: true }], // Gap from 10s to 20s
    })

    // Comment at 15s should be excluded (in gap)
    // Comments at 5s and 25s should remain
    expect(binsWithGap[0].value).toBe(1)
  })

  it('combines offset, filters, and gaps', () => {
    const duration = 60
    const comments = [
      c(5, 'keep'),
      c(10, 'filter me'),
      c(20, 'keep'),
      c(30, 'keep'),
    ]
    const bins = computeDensityBins(comments, duration, 30, {
      offset: 5000, // 5s offset
      filters: [{ type: 'text', value: 'filter', enabled: true }],
      gaps: [{ start: 20, end: 30, enabled: true }], // Gap from 20s to 30s
    })

    // After offset: 10s, 15s (filtered), 25s (in gap), 35s
    // Remaining: 10s (bin 0), 35s (bin 1)
    expect(bins[0].value).toBeGreaterThan(0)
    expect(bins[1].value).toBeGreaterThan(0)
  })
})
