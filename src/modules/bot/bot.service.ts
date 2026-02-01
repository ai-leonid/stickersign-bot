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
      const username = ctx.from?.username ?? null;
      await ctx.reply('Принял запрос. Начинаю генерацию стикеров.');
      try {
        const pack = await this.startPackCreation(
          telegramUserId,
          username,
          phrase,
        );
        const link = buildPackLink(pack.telegramPackId);
        const reply = link
          ? `Набор готов: ${link}`
          : 'Набор готов и создан в Telegram.';
        await ctx.reply(reply);
      } catch (error) {
        this.logger.error(error);
        await ctx.reply('Не удалось создать набор. Попробуйте позже.');
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
      await ctx.reply('Обновляю первые 25 стикеров.');
      try {
        const updatedPack = await this.packManagerService.updatePackStickers(
          pack,
          telegramUserId,
          phrase,
        );
        const link = buildPackLink(updatedPack.telegramPackId);
        const reply = link ? `Набор обновлён: ${link}` : 'Набор обновлён.';
        await ctx.reply(reply);
      } catch (error) {
        this.logger.error(error);
        await ctx.reply('Не удалось обновить набор. Попробуйте позже.');
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
      } catch (error) {
        this.logger.error(error);
        await ctx.reply(
          'Не удалось добавить кнопку. Проверьте формат и прозрачность.',
        );
      }
    });

    bot.catch((error) => {
      this.logger.error(error);
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
}
