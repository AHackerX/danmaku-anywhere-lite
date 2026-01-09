import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { ConfigBackup } from './types'
import { CONFIG_BACKUP_VERSION } from './types'

@injectable('Singleton')
export class ConfigBackupService {
  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(DanmakuOptionsService)
    private readonly danmakuOptionsService: DanmakuOptionsService,
    @inject(ExtensionOptionsService)
    private readonly extensionOptionsService: ExtensionOptionsService
  ) {}

  async exportConfig(): Promise<ConfigBackup> {
    const danmakuOptions = await this.danmakuOptionsService.get()
    const extensionOptions = await this.extensionOptionsService.get()

    // Exclude sensitive/instance-specific fields
    const { id, ...safeExtensionOptions } = extensionOptions

    return {
      version: CONFIG_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      danmakuOptions,
      extensionOptions: safeExtensionOptions,
    }
  }

  async importConfig(backup: ConfigBackup): Promise<void> {
    if (backup.version !== CONFIG_BACKUP_VERSION) {
      this.logger.warn('Config backup version mismatch', {
        expected: CONFIG_BACKUP_VERSION,
        actual: backup.version,
      })
    }

    if (backup.danmakuOptions) {
      // Use update to merge with existing options, preserving any missing fields
      await this.danmakuOptionsService.update(backup.danmakuOptions)
    }

    if (backup.extensionOptions) {
      // Preserve instance-specific fields and merge with existing options
      const currentOptions = await this.extensionOptionsService.get()
      const { id: _id, ...importedOptions } = backup.extensionOptions as typeof currentOptions
      await this.extensionOptionsService.update({
        ...importedOptions,
      })
    }

    this.logger.debug('Config imported successfully')
  }

  downloadAsFile(backup: ConfigBackup, filename?: string): void {
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ?? `danmaku-anywhere-config-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async readFromFile(file: File): Promise<ConfigBackup> {
    const text = await file.text()
    const backup = JSON.parse(text) as ConfigBackup

    if (!backup.version || !backup.danmakuOptions) {
      throw new Error('Invalid config backup file')
    }

    return backup
  }
}
