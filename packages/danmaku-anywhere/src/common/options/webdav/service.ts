import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ConfigBackupService } from '@/common/options/configBackup/service'
import type { ConfigBackup } from '@/common/options/configBackup/types'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { WebDAVClient } from './client'
import type { WebDAVConfig, WebDAVTestResult } from './types'
import { defaultWebDAVConfig } from './types'

@injectable('Singleton')
export class WebDAVService implements IStoreService {
  public readonly options: OptionsService<WebDAVConfig>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory,
    @inject(ConfigBackupService)
    private readonly configBackupService: ConfigBackupService
  ) {
    this.options = this.optionServiceFactory(
      'webdavConfig',
      defaultWebDAVConfig,
      this.logger,
      'local' // Store in local storage, not sync
    ).version(1, {
      upgrade: (data) => data,
    })
  }

  async getConfig(): Promise<WebDAVConfig> {
    return this.options.get()
  }

  async setConfig(config: WebDAVConfig): Promise<void> {
    await this.options.set(config)
  }

  async updateConfig(config: Partial<WebDAVConfig>): Promise<void> {
    await this.options.update(config)
  }

  async testConnection(config?: WebDAVConfig): Promise<WebDAVTestResult> {
    const cfg = config ?? await this.getConfig()
    if (!cfg.url) {
      return { success: false, message: 'URL is required' }
    }
    const client = new WebDAVClient(cfg)
    return client.testConnection()
  }

  async uploadConfig(): Promise<void> {
    const config = await this.getConfig()
    if (!config.enabled || !config.url) {
      throw new Error('WebDAV is not configured')
    }

    const backup = await this.configBackupService.exportConfig()
    const client = new WebDAVClient(config)
    await client.upload(config.remotePath, JSON.stringify(backup, null, 2))
    this.logger.debug('Config uploaded to WebDAV')
  }

  async downloadConfig(): Promise<ConfigBackup> {
    const config = await this.getConfig()
    if (!config.enabled || !config.url) {
      throw new Error('WebDAV is not configured')
    }

    const client = new WebDAVClient(config)
    const content = await client.download(config.remotePath)
    const backup = JSON.parse(content) as ConfigBackup

    if (!backup.version || !backup.danmakuOptions) {
      throw new Error('Invalid config file')
    }

    return backup
  }

  async syncFromRemote(): Promise<void> {
    const backup = await this.downloadConfig()
    await this.configBackupService.importConfig(backup)
    this.logger.debug('Config synced from WebDAV')
  }

  async hasRemoteConfig(): Promise<boolean> {
    const config = await this.getConfig()
    if (!config.enabled || !config.url) {
      return false
    }
    const client = new WebDAVClient(config)
    return client.exists(config.remotePath)
  }

  onChange(listener: (config: WebDAVConfig) => void): void {
    this.options.onChange(listener)
  }
}
