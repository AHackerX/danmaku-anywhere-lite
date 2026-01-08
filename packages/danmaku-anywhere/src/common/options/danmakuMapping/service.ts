import { injectable } from 'inversify'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import {
  type DanmakuMappingData,
  type DanmakuMappingEntry,
  defaultDanmakuMappingData,
  normalizeUrl,
} from './schema'

const STORAGE_KEY = 'danmakuMapping'
// Maximum number of mappings to keep
const MAX_MAPPINGS = 500
// Maximum age of mappings in milliseconds (30 days)
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

@injectable()
export class DanmakuMappingService {
  private storage = new ExtStorageService<DanmakuMappingData>(STORAGE_KEY, {
    storageType: 'local',
  })

  constructor() {
    this.storage.setup()
  }

  /**
   * Get all danmaku mappings
   */
  async getAll(): Promise<DanmakuMappingData> {
    const data = await this.storage.read()
    return data ?? defaultDanmakuMappingData
  }

  /**
   * Get mapping for a specific URL
   */
  async getMapping(url: string): Promise<DanmakuMappingEntry | undefined> {
    const normalizedUrl = normalizeUrl(url)
    const data = await this.getAll()
    return data.mappings[normalizedUrl]
  }

  /**
   * Save or update a mapping for a URL
   */
  async saveMapping(
    url: string,
    episodeIds: number[],
    isCustom: boolean[]
  ): Promise<void> {
    const normalizedUrl = normalizeUrl(url)
    const data = await this.getAll()

    data.mappings[normalizedUrl] = {
      url: normalizedUrl,
      episodeIds,
      isCustom,
      timestamp: Date.now(),
    }

    // Clean up old mappings if necessary
    this.cleanupMappings(data)

    await this.storage.set(data)
  }

  /**
   * Remove mapping for a URL
   */
  async removeMapping(url: string): Promise<void> {
    const normalizedUrl = normalizeUrl(url)
    const data = await this.getAll()

    delete data.mappings[normalizedUrl]

    await this.storage.set(data)
  }

  /**
   * Clear all mappings
   */
  async clearAll(): Promise<void> {
    await this.storage.set(defaultDanmakuMappingData)
  }

  /**
   * Subscribe to changes
   */
  onChange(callback: (data: DanmakuMappingData | undefined) => void): void {
    this.storage.subscribe(callback)
  }

  /**
   * Clean up old mappings to prevent storage from growing too large
   */
  private cleanupMappings(data: DanmakuMappingData): void {
    const now = Date.now()
    const entries = Object.entries(data.mappings)

    // Remove mappings older than MAX_AGE_MS
    for (const [url, mapping] of entries) {
      if (now - mapping.timestamp > MAX_AGE_MS) {
        delete data.mappings[url]
      }
    }

    // If still too many mappings, remove the oldest ones
    const remainingEntries = Object.entries(data.mappings)
    if (remainingEntries.length > MAX_MAPPINGS) {
      // Sort by timestamp (oldest first)
      remainingEntries.sort((a, b) => a[1].timestamp - b[1].timestamp)

      // Remove oldest entries until we're under the limit
      const toRemove = remainingEntries.length - MAX_MAPPINGS
      for (let i = 0; i < toRemove; i++) {
        delete data.mappings[remainingEntries[i][0]]
      }
    }
  }
}
