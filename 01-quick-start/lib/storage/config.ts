import fs from 'fs/promises';
import type { StoredConfig, StoragePaths } from '@01-quick-start/core';

export class ConfigStorage {
  constructor(private paths: StoragePaths) {}

  async read(): Promise<StoredConfig | null> {
    try {
      const content = await fs.readFile(this.paths.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write(config: StoredConfig): Promise<void> {
    await fs.writeFile(
      this.paths.configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  async update(partial: Partial<StoredConfig>): Promise<void> {
    const current = await this.read() || this.getDefault();
    const updated: StoredConfig = {
      ...current,
      ...partial,
      updatedAt: Date.now(),
    };
    await this.write(updated);
  }

  private getDefault(): StoredConfig {
    return {
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}
