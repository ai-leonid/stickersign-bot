import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  MediaFile,
  MediaFileInput,
  StylePreset,
} from '../../common/types';

@Injectable()
export class MediaStorageService {
  saveFile(input: MediaFileInput): Promise<MediaFile> {
    return Promise.resolve({
      id: '',
      type: input.type,
      storagePath: input.storagePath,
      hash: input.hash,
      size: input.size,
      createdAt: new Date(),
    });
  }

  getFile(fileId: string): Promise<MediaFile | null> {
    void fileId;
    return Promise.resolve(null);
  }

  getFileBuffer(storagePath: string): Promise<Buffer> {
    void storagePath;
    return Promise.resolve(Buffer.alloc(0));
  }

  getLetterCacheKey(letter: string, style: StylePreset): string {
    const payload = [
      letter,
      style.fontFamily,
      style.fontSize,
      style.fontColor,
      style.strokeColor,
      style.backgroundColor,
    ].join('|');

    return createHash('sha256').update(payload).digest('hex');
  }
}
