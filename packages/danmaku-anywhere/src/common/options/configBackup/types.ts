import type { DanmakuOptions } from '@/common/options/danmakuOptions/constant'
import type { ExtensionOptions } from '@/common/options/extensionOptions/schema'

export interface ConfigBackup {
  version: number
  exportedAt: string
  danmakuOptions: DanmakuOptions
  extensionOptions: Partial<ExtensionOptions>
}

export const CONFIG_BACKUP_VERSION = 1
