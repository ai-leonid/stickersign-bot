import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Bot } from 'grammy';
import type { Context } from 'grammy';
import type { Pack } from '../../common/types';
import { JobsService } from '../jobs/jobs.service';
import { PackManagerService } from '../packs/pack-manager.service';
import { UsersService } from '../users/users.service';

const MAX_PHRASE_LENGTH = 200;
const MAX_PHRASE_LINES = 5;
const MAX_CUSTOM_BUTTON_FILE_SIZE = 5 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMITS = {
  create: 3,
  update: 5,
  button: 3,
};

type PhraseValidationResult =
  | { ok: true; value: string }
  | { ok: false; errorMessage: string };

type RateLimitState = {
  count: number;
  resetAt: number;
};

function getTelegramToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  return token;
}

function buildPackLink(telegramPackId: string | null): string | null {
  if (!telegramPackId) {
    return null;
  }
  return `https://t.me/addstickers/${telegramPackId}`;
}

function extractCommandText(text: string | undefined): string {
  if (!text) {
    return '';
  }
  return text.replace(/^\/\w+(@\w+)?\s*/i, '').trim();
}

function normalizePhrase(value: string): string {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .normalize('NFC');

  return normalized
    .split('\n')
    .map((line) => line.replace(/ {2,}/g, ' '))
    .join('\n');
}

function isControlCharacter(char: string): boolean {
  if (char === '\n') {
    return false;
  }
  const code = char.codePointAt(0) ?? 0;
  return code < 0x20 || code === 0x7f;
}

function validatePhrase(value: string): PhraseValidationResult {
  const normalized = normalizePhrase(value).trim();
  if (!normalized) {
    return { ok: false, errorMessage: 'Фраза не должна быть пустой.' };
  }
  if (Array.from(normalized).length > MAX_PHRASE_LENGTH) {
    return {
      ok: false,
      errorMessage: `Фраза слишком длинная. Максимум ${MAX_PHRASE_LENGTH} символов.`,
    };
  }
  const lines = normalized.split('\n');
  if (lines.length > MAX_PHRASE_LINES) {
    return {
      ok: false,
      errorMessage: `Слишком много строк. Максимум ${MAX_PHRASE_LINES}.`,
    };
  }
  for (const char of Array.from(normalized)) {
    if (isControlCharacter(char)) {
      return {
        ok: false,
        errorMessage: 'Фраза содержит недопустимые символы.',
      };
    }
  }
  const hasLetters = Array.from(normalized).some(
    (char) => char !== ' ' && char !== '\n',
  );
  if (!hasLetters) {
    return { ok: false, errorMessage: 'Фраза должна содержать символы.' };
  }
  return { ok: true, value: normalized };
}

function buildRateLimitKey(userId: bigint, action: string): string {
  return `${userId.toString()}:${action}`;
}

function getRetryAfterSeconds(state: RateLimitState): number {
  const now = Date.now();
  return Math.max(1, Math.ceil((state.resetAt - now) / 1000));
}

function getUserErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Sticker size exceeds Telegram limit')) {
    return 'Стикер слишком большой для Telegram.';
  }
  if (message.includes('Sticker set exceeds Telegram limit')) {
    return 'Набор переполнен. Достигнут лимит 120 стикеров.';
  }
  if (message.includes('Unsupported custom button image format')) {
    return 'Поддерживаются только PNG или WebP с прозрачностью.';
  }
  if (message.includes('Custom button image must have transparency')) {
    return 'Нужна прозрачность в PNG/WebP.';
  }
  if (message.includes('Custom button image is empty')) {
    return 'Файл пустой.';
  }
  if (
    message.includes('Telegram API error') ||
    message.includes('retry limit') ||
    message.includes('retry')
  ) {
    return 'Ошибка Telegram API. Попробуйте позже.';
  }
  return 'Произошла ошибка. Попробуйте позже.';
}

function getTelegramUserId(ctx: Context): bigint | null {
  const from = ctx.from;
  if (!from) {
    return null;
  }
  return BigInt(from.id);
}

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private readonly pendingCustomButtonUsers = new Set<bigint>();
  private readonly rateLimits = new Map<string, RateLimitState>();
  private bot: Bot<Context> | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly packManagerService: PackManagerService,
    private readonly jobsService: JobsService,
  ) {}

  onModuleInit(): void {
    const token = getTelegramToken();
    const bot = new Bot<Context>(token);
    this.bot = bot;

    bot.command('start', async (ctx: Context) => {
      const message = [
        'Привет! Я создаю стикерпак из вашей фразы.',
        '',
        'Команды:',
        '/create <фраза> — создать новый набор',
        '/update <фраза> — обновить первые 25 стикеров',
        '/button — добавить кастомную кнопку-стикер',
        '',
        'Пример:',
        '/create Привет мир',
      ].join('\n');
      await ctx.reply(message);
    });

    bot.command('create', async (ctx: Context) => {
      const phrase = extractCommandText(ctx.message?.text);
      if (!phrase) {
        await ctx.reply('Укажите фразу: /create Привет мир');
        return;
      }
      const telegramUserId = getTelegramUserId(ctx);
      if (!telegramUserId) {
        await ctx.reply('Не удалось определить пользователя.');
        return;
      }
      const validation = validatePhrase(phrase);
      if (!validation.ok) {
        this.logger.warn(
          `Validation failed for create: ${validation.errorMessage}`,
        );
        await ctx.reply(validation.errorMessage);
        return;
      }
      if (!this.isAllowed(telegramUserId, 'create', RATE_LIMITS.create)) {
        const retryAfter = this.getRateLimitRetryAfter(
          telegramUserId,
          'create',
        );
        await ctx.reply(`Слишком часто. Повторите через ${retryAfter} сек.`);
        return;
      }
      const username = ctx.from?.username ?? null;
      this.logger.log(
        `Create request: user=${telegramUserId.toString()} username=${username ?? 'unknown'}`,
      );
      await ctx.reply('Принял запрос. Начинаю генерацию стикеров.');
      try {
        const pack = await this.startPackCreation(
          telegramUserId,
          username,
          validation.value,
        );
        const link = buildPackLink(pack.telegramPackId);
        const reply = link
          ? `Набор готов: ${link}`
          : 'Набор готов и создан в Telegram.';
        await ctx.reply(reply);
        this.logger.log(
          `Pack created: user=${telegramUserId.toString()} pack=${pack.telegramPackId ?? pack.id}`,
        );
      } catch (error) {
        this.logError('create', error);
        await ctx.reply(getUserErrorMessage(error));
      }
    });

    bot.command('update', async (ctx: Context) => {
      const phrase = extractCommandText(ctx.message?.text);
      if (!phrase) {
        await ctx.reply('Укажите фразу: /update Новый текст');
        return;
      }
      const telegramUserId = getTelegramUserId(ctx);
      if (!telegramUserId) {
        await ctx.reply('Не удалось определить пользователя.');
        return;
      }
      const pack = this.packManagerService.getPackForUser(telegramUserId);
      if (!pack) {
        await ctx.reply('Сначала создайте набор через /create.');
        return;
      }
      const validation = validatePhrase(phrase);
      if (!validation.ok) {
        this.logger.warn(
          `Validation failed for update: ${validation.errorMessage}`,
        );
        await ctx.reply(validation.errorMessage);
        return;
      }
      if (!this.isAllowed(telegramUserId, 'update', RATE_LIMITS.update)) {
        const retryAfter = this.getRateLimitRetryAfter(
          telegramUserId,
          'update',
        );
        await ctx.reply(`Слишком часто. Повторите через ${retryAfter} сек.`);
        return;
      }
      this.logger.log(
        `Update request: user=${telegramUserId.toString()} pack=${pack.telegramPackId ?? pack.id}`,
      );
      await ctx.reply('Обновляю первые 25 стикеров.');
      try {
        const updatedPack = await this.packManagerService.updatePackStickers(
          pack,
          telegramUserId,
          validation.value,
        );
        const link = buildPackLink(updatedPack.telegramPackId);
        const reply = link ? `Набор обновлён: ${link}` : 'Набор обновлён.';
        await ctx.reply(reply);
        this.logger.log(
          `Pack updated: user=${telegramUserId.toString()} pack=${updatedPack.telegramPackId ?? updatedPack.id}`,
        );
      } catch (error) {
        this.logError('update', error);
        await ctx.reply(getUserErrorMessage(error));
      }
    });

    bot.command('button', async (ctx: Context) => {
      const telegramUserId = getTelegramUserId(ctx);
      if (!telegramUserId) {
        await ctx.reply('Не удалось определить пользователя.');
        return;
      }
      const pack = this.packManagerService.getPackForUser(telegramUserId);
      if (!pack) {
        await ctx.reply('Сначала создайте набор через /create.');
        return;
      }
      if (!this.isAllowed(telegramUserId, 'button', RATE_LIMITS.button)) {
        const retryAfter = this.getRateLimitRetryAfter(
          telegramUserId,
          'button',
        );
        await ctx.reply(`Слишком часто. Повторите через ${retryAfter} сек.`);
        return;
      }
      this.logger.log(
        `Custom button requested: user=${telegramUserId.toString()} pack=${pack.telegramPackId ?? pack.id}`,
      );
      this.pendingCustomButtonUsers.add(telegramUserId);
      await ctx.reply(
        'Отправьте PNG или WebP с прозрачностью как файл (без сжатия).',
      );
    });

    bot.on('message:photo', async (ctx: Context) => {
      const telegramUserId = getTelegramUserId(ctx);
      if (!telegramUserId) {
        return;
      }
      if (!this.pendingCustomButtonUsers.has(telegramUserId)) {
        return;
      }
      await ctx.reply(
        'Нужен файл PNG/WebP без сжатия. Отправьте как документ.',
      );
    });

    bot.on('message:document', async (ctx: Context) => {
      const telegramUserId = getTelegramUserId(ctx);
      if (!telegramUserId) {
        return;
      }
      if (!this.pendingCustomButtonUsers.has(telegramUserId)) {
        return;
      }
      this.pendingCustomButtonUsers.delete(telegramUserId);
      const document = ctx.message?.document;
      if (!document) {
        await ctx.reply('Не удалось прочитать файл.');
        return;
      }
      const fileSize = document.file_size ?? 0;
      if (fileSize === 0) {
        await ctx.reply('Файл пустой.');
        return;
      }
      if (fileSize > MAX_CUSTOM_BUTTON_FILE_SIZE) {
        await ctx.reply('Файл слишком большой. Максимум 5 МБ.');
        return;
      }
      const mimeType = document.mime_type ?? '';
      if (!['image/png', 'image/webp'].includes(mimeType)) {
        await ctx.reply('Поддерживаются только PNG или WebP с прозрачностью.');
        return;
      }
      const pack = this.packManagerService.getPackForUser(telegramUserId);
      if (!pack) {
        await ctx.reply('Сначала создайте набор через /create.');
        return;
      }
      await ctx.reply('Проверяю и добавляю кнопку-стикер.');
      try {
        const buffer = await this.downloadTelegramFile(document.file_id);
        const updatedPack =
          await this.packManagerService.addCustomButtonSticker(
            pack,
            telegramUserId,
            buffer,
          );
        const link = buildPackLink(updatedPack.telegramPackId);
        const reply = link
          ? `Кнопка добавлена: ${link}`
          : 'Кнопка добавлена в набор.';
        await ctx.reply(reply);
        this.logger.log(
          `Custom button added: user=${telegramUserId.toString()} pack=${updatedPack.telegramPackId ?? updatedPack.id}`,
        );
      } catch (error) {
        this.logError('button', error);
        await ctx.reply(getUserErrorMessage(error));
      }
    });

    bot.catch((error) => {
      this.logError('bot', error);
    });

    void bot.start();
  }

  onModuleDestroy(): void {
    if (this.bot) {
      void this.bot.stop();
    }
  }

  async startPackCreation(
    telegramUserId: bigint,
    username: string | null,
    phrase: string,
  ): Promise<Pack> {
    const user = await this.usersService.getOrCreateUser(
      telegramUserId,
      username,
    );
    const pack = await this.packManagerService.createPack({
      ownerId: user.id,
      telegramUserId,
      title: phrase,
      slug: '',
      phrase,
      gridSize: 25,
      stylePresetId: null,
    });

    await this.jobsService.enqueuePackGeneration(pack.id);
    return pack;
  }

  private async downloadTelegramFile(fileId: string): Promise<Buffer> {
    if (!this.bot) {
      throw new Error('Telegram bot is not initialized');
    }
    const token = getTelegramToken();
    const file = await this.bot.api.getFile(fileId);
    if (!file.file_path) {
      throw new Error('Telegram file path is missing');
    }
    const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private isAllowed(userId: bigint, action: string, limit: number): boolean {
    const key = buildRateLimitKey(userId, action);
    const now = Date.now();
    const state = this.rateLimits.get(key);
    if (!state || now >= state.resetAt) {
      this.rateLimits.set(key, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }
    if (state.count >= limit) {
      return false;
    }
    state.count += 1;
    return true;
  }

  private getRateLimitRetryAfter(userId: bigint, action: string): number {
    const key = buildRateLimitKey(userId, action);
    const state = this.rateLimits.get(key);
    if (!state) {
      return 1;
    }
    return getRetryAfterSeconds(state);
  }

  private logError(action: string, error: unknown): void {
    if (error instanceof Error) {
      this.logger.error(`[${action}] ${error.message}`, error.stack);
      return;
    }
    this.logger.error(`[${action}] ${String(error)}`);
  }
}
