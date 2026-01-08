import { Dexie } from 'dexie'
import { inject, injectable } from 'inversify'
import { DanmakuAnywhereDb } from '@/common/db/db'
import { DanmakuAnywhereImageDb } from '@/common/db/imageDb'
import { LogsDb } from '@/common/db/logsDb'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { LogService } from './Logging/Log.service'

@injectable('Singleton')
export class ResetService {
  private logger: ILogger

  constructor(
    @inject(DanmakuAnywhereDb) private db: DanmakuAnywhereDb,
    @inject(DanmakuAnywhereImageDb) private imageDb: DanmakuAnywhereImageDb,
    @inject(LogsDb) private logsDb: LogsDb,
    @inject(LogService) private logService: LogService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[ResetService]')
  }

  async resetAll(): Promise<void> {
    this.logger.info('Starting full extension reset...')

    // Disable log service to prevent write errors during reset
    this.logService.disable()

    // Close databases first to prevent write errors during deletion
    this.db.close()
    this.imageDb.close()
    this.logsDb.close()

    // Clear Chrome sync storage (all options)
    await chrome.storage.sync.clear()

    // Clear Chrome local storage
    await chrome.storage.local.clear()

    // Delete IndexedDB databases
    await Dexie.delete('danmaku-anywhere')
    await Dexie.delete('danmaku-anywhere-image')
    await Dexie.delete('danmaku-anywhere-logs')
  }
}
