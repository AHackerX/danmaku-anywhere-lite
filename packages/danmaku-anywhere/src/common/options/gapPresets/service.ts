import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import type { GapPreset, GapPresetsOptions } from './types'

const defaultGapPresets: GapPresetsOptions = []

@injectable('Singleton')
export class GapPresetsService implements IStoreService {
  public readonly options: OptionsService<GapPresetsOptions>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory<GapPresetsOptions>(
      'gapPresets',
      defaultGapPresets,
      this.logger
    ).version(1, {
      upgrade: (data) => data,
    })
  }

  async get() {
    return this.options.get()
  }

  async set(data: GapPresetsOptions, version?: number) {
    return this.options.set(data, version)
  }

  async addPreset(preset: GapPreset) {
    const presets = await this.get()
    return this.set([...presets, preset])
  }

  async updatePreset(id: string, preset: Partial<GapPreset>) {
    const presets = await this.get()
    const index = presets.findIndex((p) => p.id === id)
    if (index === -1) return
    presets[index] = { ...presets[index], ...preset }
    return this.set([...presets])
  }

  async deletePreset(id: string) {
    const presets = await this.get()
    return this.set(presets.filter((p) => p.id !== id))
  }

  onChange(listener: (data: GapPresetsOptions) => void) {
    return this.options.onChange(listener)
  }
}
