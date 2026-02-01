import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CreatePackInput, Pack, StylePreset } from '../../common/types';
import { StickerGeneratorService } from '../stickers/sticker-generator.service';

type TelegramApiResponse<T> = {
  ok: boolean;
  result: T;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
  };
};

type TelegramSticker = {
  file_id: string;
};

type TelegramStickerSet = {
  name: string;
  stickers: TelegramSticker[];
};

type StickerPayload = {
  buffer: Buffer;
  emojiList: string[];
};

type TelegramConfig = {
  token: string;
  botName: string;
};

const MAX_STATIC_STICKERS = 120;
const MAX_STICKER_SIZE_BYTES = 512 * 1024;
const MAX_PACK_TITLE_LENGTH = 64;

function sanitizeBotName(name: string): string {
  return name.replace(/^@/, '').trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, Math.max(0, maxLength));
}

function normalizeSlugValue(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

function buildSlug(phrase: string): string {
  const base = normalizeSlugValue(phrase) || 'pack';
  return `${base}_${randomUUID().slice(0, 8)}`;
}

function buildPackTitle(phrase: string): string {
  const normalized = phrase.replace(/\s+/g, ' ').trim() || 'Sticker Pack';
  return truncate(normalized, MAX_PACK_TITLE_LENGTH);
}

function buildSetName(slug: string, botName: string): string {
  const cleanBotName = sanitizeBotName(botName);
  const suffix = `_by_${cleanBotName}`;
  const maxSlugLength = Math.max(1, 64 - suffix.length);
  const trimmedSlug = truncate(
    normalizeSlugValue(slug) || 'pack',
    maxSlugLength,
  );
  return `${trimmedSlug}${suffix}`;
}

function getTelegramConfig(): TelegramConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const botName = process.env.TELEGRAM_BOT_NAME ?? '';
  if (!token || !botName) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_NAME is not set');
  }
  return { token, botName };
}

function getDefaultStyle(): StylePreset {
  return {
    id: 'default',
    fontFamily: 'Arial',
    fontSize: 220,
    fontColor: '#ffffff',
    strokeColor: '#000000',
    backgroundColor: 'transparent',
    createdAt: new Date(),
  };
}

function buildEmojiList(isPlaceholder: boolean): string[] {
  return isPlaceholder ? ['⬜️'] : ['🔤'];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

@Injectable()
export class PackManagerService {
  constructor(
    private readonly stickerGeneratorService: StickerGeneratorService,
  ) {}

  async createPack(input: CreatePackInput): Promise<Pack> {
    const config = getTelegramConfig();
    const baseTitle = input.title || input.phrase;
    const slug = input.slug
      ? normalizeSlugValue(input.slug)
      : buildSlug(baseTitle);
    const title = buildPackTitle(baseTitle);
    const telegramPackId = buildSetName(slug, config.botName);
    const style = getDefaultStyle();
    const stickers = await this.buildStickerPayloads(input.phrase, style);

    await this.createTelegramStickerSet({
      name: telegramPackId,
      title,
      userId: input.telegramUserId,
      stickers,
    });

    return {
      id: randomUUID(),
      ownerId: input.ownerId,
      title,
      slug,
      telegramPackId,
      isCustomButtonEnabled: false,
      phrase: input.phrase,
      gridSize: input.gridSize,
      stylePresetId: input.stylePresetId,
      createdAt: new Date(),
    };
  }

  async updatePackStickers(
    pack: Pack,
    telegramUserId: bigint,
    phrase: string,
  ): Promise<Pack> {
    if (!pack.telegramPackId) {
      throw new Error('Telegram pack id is missing');
    }

    const style = getDefaultStyle();
    const stickers = await this.buildStickerPayloads(phrase, style);
    await this.updateTelegramStickerSet({
      name: pack.telegramPackId,
      userId: telegramUserId,
      stickers,
    });

    return {
      ...pack,
      phrase,
    };
  }

  private async buildStickerPayloads(
    phrase: string,
    style: StylePreset,
  ): Promise<StickerPayload[]> {
    const cells = this.stickerGeneratorService.buildGrid(phrase);
    const buffers = await Promise.all(
      cells.map((cell) => {
        if (cell.isPlaceholder || !cell.letter) {
          return this.stickerGeneratorService.generatePlaceholderSticker(style);
        }
        return this.stickerGeneratorService.generateLetterSticker(
          cell.letter,
          style,
        );
      }),
    );

    return buffers.map((buffer, index) => {
      if (buffer.byteLength > MAX_STICKER_SIZE_BYTES) {
        throw new Error('Sticker size exceeds Telegram limit');
      }
      const cell = cells[index];
      return {
        buffer,
        emojiList: buildEmojiList(cell.isPlaceholder || !cell.letter),
      };
    });
  }

  private async createTelegramStickerSet(input: {
    name: string;
    title: string;
    userId: bigint;
    stickers: StickerPayload[];
  }): Promise<void> {
    if (input.stickers.length === 0) {
      throw new Error('Sticker set requires at least one sticker');
    }
    if (input.stickers.length > MAX_STATIC_STICKERS) {
      throw new Error('Sticker set exceeds Telegram limit');
    }

    const buildBody = () => {
      const form = new FormData();
      form.append('user_id', input.userId.toString());
      form.append('name', input.name);
      form.append('title', input.title);
      form.append('sticker_format', 'static');

      const stickers = input.stickers.map((payload, index) => {
        const attachName = `sticker_${index}`;
        form.append(
          attachName,
          new Blob([toArrayBuffer(payload.buffer)], { type: 'image/webp' }),
          `${attachName}.webp`,
        );
        return {
          sticker: `attach://${attachName}`,
          emoji_list: payload.emojiList,
        };
      });

      form.append('stickers', JSON.stringify(stickers));
      return form;
    };

    await this.callTelegram<boolean>('createNewStickerSet', buildBody);
  }

  private async updateTelegramStickerSet(input: {
    name: string;
    userId: bigint;
    stickers: StickerPayload[];
  }): Promise<void> {
    const stickerSet = await this.getStickerSet(input.name);
    const existingStickers = stickerSet.stickers;
    const additionalCount = Math.max(
      0,
      input.stickers.length - existingStickers.length,
    );

    if (existingStickers.length + additionalCount > MAX_STATIC_STICKERS) {
      throw new Error('Sticker set exceeds Telegram limit');
    }

    const replaceCount = Math.min(
      existingStickers.length,
      input.stickers.length,
    );

    for (let index = 0; index < replaceCount; index += 1) {
      const payload = input.stickers[index];
      const oldStickerId = existingStickers[index].file_id;
      await this.replaceStickerInSet({
        name: input.name,
        userId: input.userId,
        oldStickerId,
        payload,
      });
    }

    for (let index = replaceCount; index < input.stickers.length; index += 1) {
      const payload = input.stickers[index];
      await this.addStickerToSet({
        name: input.name,
        userId: input.userId,
        payload,
      });
    }
  }

  private async getStickerSet(name: string): Promise<TelegramStickerSet> {
    const buildBody = () => {
      const params = new URLSearchParams();
      params.append('name', name);
      return params;
    };

    return this.callTelegram<TelegramStickerSet>('getStickerSet', buildBody);
  }

  private async replaceStickerInSet(input: {
    name: string;
    userId: bigint;
    oldStickerId: string;
    payload: StickerPayload;
  }): Promise<void> {
    const buildBody = () => {
      const form = new FormData();
      const attachName = 'sticker';
      form.append('user_id', input.userId.toString());
      form.append('name', input.name);
      form.append('old_sticker', input.oldStickerId);
      form.append(
        attachName,
        new Blob([toArrayBuffer(input.payload.buffer)], { type: 'image/webp' }),
        'sticker.webp',
      );
      form.append(
        'sticker',
        JSON.stringify({
          sticker: `attach://${attachName}`,
          emoji_list: input.payload.emojiList,
        }),
      );
      return form;
    };

    await this.callTelegram<boolean>('replaceStickerInSet', buildBody);
  }

  private async addStickerToSet(input: {
    name: string;
    userId: bigint;
    payload: StickerPayload;
  }): Promise<void> {
    const buildBody = () => {
      const form = new FormData();
      const attachName = 'sticker';
      form.append('user_id', input.userId.toString());
      form.append('name', input.name);
      form.append(
        attachName,
        new Blob([toArrayBuffer(input.payload.buffer)], { type: 'image/webp' }),
        'sticker.webp',
      );
      form.append(
        'sticker',
        JSON.stringify({
          sticker: `attach://${attachName}`,
          emoji_list: input.payload.emojiList,
        }),
      );
      return form;
    };

    await this.callTelegram<boolean>('addStickerToSet', buildBody);
  }

  private async callTelegram<T>(
    method: string,
    bodyFactory: () => FormData | URLSearchParams,
  ): Promise<T> {
    const { token } = getTelegramConfig();
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(url, {
        method: 'POST',
        body: bodyFactory(),
      });

      const data = (await response.json()) as TelegramApiResponse<T>;
      if (data.ok) {
        return data.result;
      }

      const errorCode = data.error_code ?? response.status;
      const retryAfter = data.parameters?.retry_after;
      const canRetry = errorCode === 429 || errorCode >= 500;
      if (!canRetry || attempt >= maxAttempts - 1) {
        throw new Error(
          data.description ?? `Telegram API error (${errorCode})`,
        );
      }

      const delayMs =
        errorCode === 429 && retryAfter
          ? retryAfter * 1000
          : Math.min(1000 * 2 ** attempt, 8000);
      await delay(delayMs);
    }

    throw new Error('Telegram API retry limit reached');
  }
}
