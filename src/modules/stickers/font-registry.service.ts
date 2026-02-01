import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GlobalFonts } from '@napi-rs/canvas';
import { fontPresets } from '../../common/font-presets';

@Injectable()
export class FontRegistryService implements OnModuleInit {
  private readonly logger = new Logger(FontRegistryService.name);

  onModuleInit(): void {
    const registeredFamilies = new Set<string>();
    for (const preset of fontPresets) {
      if (!preset.file) {
        continue;
      }
      if (registeredFamilies.has(preset.fontFamily)) {
        continue;
      }
      const filePath = resolve(process.cwd(), 'fonts', preset.file);
      if (!existsSync(filePath)) {
        throw new Error(`Font file not found: ${filePath}`);
      }
      const isRegistered = GlobalFonts.registerFromPath(
        filePath,
        preset.fontFamily,
      );
      if (!isRegistered) {
        throw new Error(`Failed to register font: ${filePath}`);
      }
      registeredFamilies.add(preset.fontFamily);
    }
    if (registeredFamilies.size > 0) {
      this.logger.log(`Loaded ${registeredFamilies.size} font files`);
    }
  }
}
