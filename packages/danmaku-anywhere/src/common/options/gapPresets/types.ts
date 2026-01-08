import type { DanmakuGap } from '@danmaku-anywhere/danmaku-engine'

export interface GapPreset {
  id: string
  name: string
  gaps: DanmakuGap[]
}

export type GapPresetsOptions = GapPreset[]
