import { Module } from '@nestjs/common';
import { StickerGeneratorService } from './sticker-generator.service';

@Module({
  providers: [StickerGeneratorService],
  exports: [StickerGeneratorService],
})
export class StickersModule {}
