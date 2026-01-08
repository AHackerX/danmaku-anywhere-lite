import type { Manager } from '@mr-quin/danmu'
import type { DanmakuGap, DanmakuOptions } from '../options'
import type { ParsedComment } from '../parser'
import { useFixedDanmaku } from './fixedDanmaku'

const binarySearch = (comments: ParsedComment[], time: number): number => {
  let low = 0
  let high = comments.length - 1
  let ans = comments.length

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const commentTime = comments[mid].time

    if (commentTime >= time) {
      ans = mid
      high = mid - 1
    } else {
      low = mid + 1
    }
  }
  return ans
}

/**
 * Calculate the effective video time considering gaps
 * This maps the actual video time to the "danmaku timeline"
 * 
 * For example, if there's a gap from 60-120s (duration 60s):
 * - Video time 50s -> effective time 50s (before gap)
 * - Video time 90s -> effective time 60s (inside gap, clamped to gap start)
 * - Video time 150s -> effective time 90s (after gap, subtract gap duration)
 */
const getEffectiveTime = (videoTime: number, gaps: DanmakuGap[]): number => {
  let effectiveTime = videoTime
  for (const gap of gaps) {
    if (!gap.enabled) continue
    const gapDuration = gap.end - gap.start
    
    if (videoTime >= gap.end) {
      // Video is past this gap, subtract the gap duration
      effectiveTime -= gapDuration
    } else if (videoTime >= gap.start) {
      // Video is inside this gap, clamp to gap start
      effectiveTime -= (videoTime - gap.start)
    }
  }
  return effectiveTime
}

/**
 * Check if the video time is currently inside any gap
 */
const isInsideGap = (videoTime: number, gaps: DanmakuGap[]): boolean => {
  for (const gap of gaps) {
    if (gap.enabled && videoTime >= gap.start && videoTime < gap.end) {
      return true
    }
  }
  return false
}

const DURATION_MS = 5000
const DURATION_S = DURATION_MS / 1000

export const bindVideo =
  (
    video: HTMLMediaElement,
    comments: ParsedComment[],
    getConfig: () => DanmakuOptions
  ) =>
  (manager: Manager<ParsedComment>) => {
    const { plugin, isFull, getDanmakuOptions } = useFixedDanmaku(manager)

    // index of the next comment
    let cursor = 0
    // user-defined offset in seconds
    let offset = getConfig().offset / 1000
    let documentVisible = true

    const updateCursor = () => {
      // include danmaku that are within the duration range
      // so that we can "catch up" with the last
      const gaps = getConfig().gaps || []
      const effectiveTime = getEffectiveTime(video.currentTime - offset, gaps)
      cursor = binarySearch(comments, effectiveTime - DURATION_S)
    }

    updateCursor()

    const emitDanmaku = (comment: ParsedComment, progress = 0) => {
      switch (comment.mode) {
        case 'rtl': {
          // since comments are time-sensitive, use unshift to prioritize the latest comment
          manager.unshift(comment, { progress })
          break
        }
        case 'ltr': {
          manager.unshift(comment, {
            direction: 'right',
            progress,
          })
          break
        }
        case 'top':
        case 'bottom': {
          if (manager.isFreeze()) {
            break
          }

          // check the render mode for the comment
          const config = getConfig()
          const fixedCommentMode = config.specialComments[comment.mode]
          if (fixedCommentMode === 'normal') {
            if (config.allowOverlap || !isFull(comment.mode)) {
              manager.pushFlexibleDanmaku(comment, {
                duration: DURATION_MS,
                direction: 'none',
                ...getDanmakuOptions(comment.mode),
              })
            }
          } else if (fixedCommentMode === 'scroll') {
            manager.unshift({ ...comment, mode: 'rtl' }, { progress })
          }

          break
        }
      }
    }

    const handleTimeupdate = () => {
      const offsetTime = video.currentTime - offset
      const gaps = getConfig().gaps || []

      // Check if we're currently in a gap - if so, don't emit any danmaku
      if (isInsideGap(offsetTime, gaps)) {
        return
      }

      // Calculate the effective time on the danmaku timeline
      // This accounts for gaps that have already passed
      const effectiveTime = getEffectiveTime(offsetTime, gaps)

      if (cursor >= comments.length) {
        return
      }

      // Process comments based on effective time
      while (cursor < comments.length) {
        const comment = comments[cursor]
        const commentTime = comment.time

        // If we haven't reached this comment's time on the effective timeline, stop
        if (commentTime > effectiveTime) {
          return
        }

        // Calculate progress based on how far past the comment time we are
        let progress = (effectiveTime - commentTime) / DURATION_S
        if (progress < 0.1) {
          progress = 0
        }

        if (documentVisible) {
          emitDanmaku(comment, progress)
        }

        cursor++
      }
    }

    const handleSeek = () => {
      manager.clear()
      updateCursor()
      handleTimeupdate()
    }

    const handlePause = () => {
      manager.freeze()
      manager.stopPlaying()
    }

    const handlePlay = () => {
      if (manager.isFreeze()) {
        manager.unfreeze()
      }
      manager.startPlaying()
      handleTimeupdate()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        documentVisible = false
      } else if (document.visibilityState === 'visible') {
        documentVisible = true
      }
    }

    video.addEventListener('timeupdate', handleTimeupdate)
    video.addEventListener('seeking', handleSeek)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handlePause)
    video.addEventListener('play', handlePlay)
    video.addEventListener('playing', handlePlay)

    document.addEventListener('visibilitychange', handleVisibilityChange)

    manager.use({
      name: 'bind-video',
      unmount() {
        video.removeEventListener('timeupdate', handleTimeupdate)
        video.removeEventListener('seeking', handleSeek)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('playing', handlePlay)
        video.removeEventListener('pause', handlePause)
        video.removeEventListener('waiting', handlePause)
      },
      updateOptions() {
        // the offset changes only when the config changes
        if (getConfig().offset !== offset) {
          offset = getConfig().offset / 1000
          updateCursor()
          manager.clear()
        }
      },
    })
    manager.use(plugin)
  }
