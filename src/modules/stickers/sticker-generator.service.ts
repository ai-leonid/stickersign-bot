import { Injectable } from '@nestjs/common';
import type { StylePreset } from '../../common/types';

@Injectable()
export class StickerGeneratorService {
  generateLetterSticker(letter: string, style: StylePreset): Promise<Buffer> {
    void letter;
    void style;
    return Promise.resolve(Buffer.alloc(0));
  }

  generatePlaceholderSticker(style: StylePreset): Promise<Buffer> {
    void style;
    return Promise.resolve(Buffer.alloc(0));
  }
}
