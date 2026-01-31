import { Injectable } from '@nestjs/common';
import type { CreatePackInput, Pack, Sticker } from '../../common/types';

@Injectable()
export class PackManagerService {
  createPack(input: CreatePackInput): Promise<Pack> {
    return Promise.resolve({
      id: '',
      ownerId: input.ownerId,
      title: input.title,
      slug: input.slug,
      telegramPackId: null,
      isCustomButtonEnabled: false,
      phrase: input.phrase,
      gridSize: input.gridSize,
      stylePresetId: input.stylePresetId,
      createdAt: new Date(),
    });
  }

  updatePackStickers(packId: string, stickers: Sticker[]): Promise<Pack> {
    void packId;
    void stickers;
    return Promise.resolve({
      id: packId,
      ownerId: '',
      title: '',
      slug: '',
      telegramPackId: null,
      isCustomButtonEnabled: false,
      phrase: '',
      gridSize: 25,
      stylePresetId: null,
      createdAt: new Date(),
    });
  }
}
