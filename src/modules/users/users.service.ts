import { Injectable } from '@nestjs/common';
import { fontPresets } from '../../common/font-presets';
import type { StylePreset, User, UserSettings } from '../../common/types';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class UsersService {
  private static readonly DEFAULT_FONT_COLOR = '#ffffff';
  private static readonly DEFAULT_STROKE_COLOR = '#000000';
  private static readonly DEFAULT_FONT_SIZE = 220;
  private static readonly DEFAULT_BACKGROUND = 'transparent';
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateUser(
    telegramUserId: bigint,
    username: string | null,
  ): Promise<User> {
    const user = await this.prisma.user.upsert({
      where: { telegramUserId },
      update: { username },
      create: { telegramUserId, username },
    });
    return {
      id: user.id,
      telegramUserId: user.telegramUserId,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  async listStylePresets(): Promise<StylePreset[]> {
    return this.ensureStylePresets();
  }

  async getUserSettings(
    telegramUserId: bigint,
    username: string | null,
  ): Promise<{
    user: User;
    settings: UserSettings;
    stylePreset: StylePreset;
  }> {
    const user = await this.getOrCreateUser(telegramUserId, username);
    const presets = await this.ensureStylePresets();
    const defaultPreset = presets[0];
    const settings = await this.prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        stylePresetId: defaultPreset.id,
        fontColor: UsersService.DEFAULT_FONT_COLOR,
        strokeColor: UsersService.DEFAULT_STROKE_COLOR,
      },
    });
    const stylePreset =
      presets.find((preset) => preset.id === settings.stylePresetId) ??
      defaultPreset;
    if (stylePreset.id !== settings.stylePresetId) {
      await this.prisma.userSettings.update({
        where: { userId: user.id },
        data: { stylePresetId: stylePreset.id },
      });
    }
    return {
      user,
      settings: {
        id: settings.id,
        userId: settings.userId,
        stylePresetId: settings.stylePresetId,
        fontColor: settings.fontColor,
        strokeColor: settings.strokeColor,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
      stylePreset,
    };
  }

  async updateUserFont(
    telegramUserId: bigint,
    username: string | null,
    presetId: string,
  ): Promise<UserSettings> {
    const { user } = await this.getUserSettings(telegramUserId, username);
    const settings = await this.prisma.userSettings.update({
      where: { userId: user.id },
      data: { stylePresetId: presetId },
    });
    return {
      id: settings.id,
      userId: settings.userId,
      stylePresetId: settings.stylePresetId,
      fontColor: settings.fontColor,
      strokeColor: settings.strokeColor,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async updateUserColors(
    telegramUserId: bigint,
    username: string | null,
    input: { fontColor?: string; strokeColor?: string },
  ): Promise<UserSettings> {
    const { user } = await this.getUserSettings(telegramUserId, username);
    const settings = await this.prisma.userSettings.update({
      where: { userId: user.id },
      data: input,
    });
    return {
      id: settings.id,
      userId: settings.userId,
      stylePresetId: settings.stylePresetId,
      fontColor: settings.fontColor,
      strokeColor: settings.strokeColor,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async getUserStyleForGeneration(
    telegramUserId: bigint,
    username: string | null,
  ): Promise<{ user: User; style: StylePreset; stylePresetId: string }> {
    const { user, settings, stylePreset } = await this.getUserSettings(
      telegramUserId,
      username,
    );
    const style: StylePreset = {
      ...stylePreset,
      fontColor: settings.fontColor,
      strokeColor: settings.strokeColor,
    };
    return { user, style, stylePresetId: stylePreset.id };
  }

  resolveStylePreset(
    input: string,
    presets: StylePreset[],
  ): StylePreset | null {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }
    const index = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(index) && index >= 1 && index <= presets.length) {
      return presets[index - 1];
    }
    const normalized = trimmed.toLowerCase();
    return (
      presets.find((preset) => preset.name.toLowerCase() === normalized) ?? null
    );
  }

  private async ensureStylePresets(): Promise<StylePreset[]> {
    const result: StylePreset[] = [];
    for (const preset of fontPresets) {
      const fontSize = preset.fontSize ?? UsersService.DEFAULT_FONT_SIZE;
      const created = await this.prisma.stylePreset.upsert({
        where: { name: preset.name },
        update: {
          fontFamily: preset.fontFamily,
          fontSize,
          fontColor: UsersService.DEFAULT_FONT_COLOR,
          strokeColor: UsersService.DEFAULT_STROKE_COLOR,
          backgroundColor: UsersService.DEFAULT_BACKGROUND,
        },
        create: {
          name: preset.name,
          fontFamily: preset.fontFamily,
          fontSize,
          fontColor: UsersService.DEFAULT_FONT_COLOR,
          strokeColor: UsersService.DEFAULT_STROKE_COLOR,
          backgroundColor: UsersService.DEFAULT_BACKGROUND,
        },
      });
      result.push({
        id: created.id,
        name: created.name,
        fontFamily: created.fontFamily,
        fontSize: created.fontSize,
        fontColor: created.fontColor,
        strokeColor: created.strokeColor,
        backgroundColor: created.backgroundColor,
        createdAt: created.createdAt,
      });
    }
    return result;
  }
}
