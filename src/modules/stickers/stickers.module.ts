import { Module } from '@nestjs/common';
import { FontRegistryService } from './font-registry.service';
import { StickerGeneratorService } from './sticker-generator.service';

@Module({
  providers: [StickerGeneratorService, FontRegistryService],
  exports: [StickerGeneratorService],
})
export class StickersModule {}
