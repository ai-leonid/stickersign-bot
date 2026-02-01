import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { createCanvas } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import sharp from 'sharp';
import type { StylePreset } from '../../common/types';

export type GridCell = {
  position: number;
  letter: string | null;
  isPlaceholder: boolean;
};

const GRID_SIZE = 5;
const CANVAS_SIZE = 512;

function normalizeText(value: string): string {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .normalize('NFC');
  return normalized
    .split('\n')
    .map((line) => line.replace(/ +$/g, ''))
    .join('\n');
}

function buildGridCells(text: string): GridCell[] {
  const cells: GridCell[] = [];
  let row = 0;
  let col = 0;
  let wrapped = false;

  for (const char of Array.from(text)) {
    if (row >= GRID_SIZE) {
      break;
    }

    if (char === '\n') {
      row += 1;
      col = 0;
      wrapped = false;
      continue;
    }

    if (col >= GRID_SIZE) {
      row += 1;
      col = 0;
      wrapped = true;
      if (row >= GRID_SIZE) {
        break;
      }
    }

    if (char === ' ' && col === 0 && wrapped) {
      wrapped = false;
      continue;
    }

    const position = row * GRID_SIZE + col;
    if (position >= GRID_SIZE * GRID_SIZE) {
      break;
    }

    const isSpace = char === ' ';
    cells[position] = {
      position,
      letter: isSpace ? null : char,
      isPlaceholder: isSpace,
    };

    col += 1;
    if (col >= GRID_SIZE) {
      row += 1;
      col = 0;
      wrapped = true;
    } else {
      wrapped = false;
    }
  }

  const maxCells = GRID_SIZE * GRID_SIZE;
  for (let index = 0; index < maxCells; index += 1) {
    if (!cells[index]) {
      cells[index] = {
        position: index,
        letter: null,
        isPlaceholder: true,
      };
    }
  }

  return cells;
}

function getLetterCacheKey(letter: string, style: StylePreset): string {
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

function getStrokeWidth(fontSize: number): number {
  return Math.max(2, Math.round(fontSize * 0.08));
}

async function renderToWebp(
  render: (ctx: SKRSContext2D) => void,
  backgroundColor: string,
): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  render(ctx);

  const pngBuffer = canvas.toBuffer('image/png');
  return sharp(pngBuffer).webp({ lossless: true }).toBuffer();
}

@Injectable()
export class StickerGeneratorService {
  private readonly letterCache = new Map<string, Buffer>();

  normalizeText(phrase: string): string {
    return normalizeText(phrase);
  }

  buildGrid(phrase: string): GridCell[] {
    const normalized = normalizeText(phrase);
    return buildGridCells(normalized);
  }

  generateLetterSticker(letter: string, style: StylePreset): Promise<Buffer> {
    const cacheKey = getLetterCacheKey(letter, style);
    const cached = this.letterCache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    return renderToWebp((ctx) => {
      ctx.font = `${style.fontSize}px ${style.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = style.fontColor;
      if (style.strokeColor) {
        ctx.lineWidth = getStrokeWidth(style.fontSize);
        ctx.strokeStyle = style.strokeColor;
        ctx.strokeText(letter, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
      }
      ctx.fillText(letter, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }, style.backgroundColor).then((buffer) => {
      this.letterCache.set(cacheKey, buffer);
      return buffer;
    });
  }

  generatePlaceholderSticker(style: StylePreset): Promise<Buffer> {
    const cacheKey = getLetterCacheKey('placeholder', style);
    const cached = this.letterCache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    return renderToWebp(() => undefined, style.backgroundColor).then(
      (buffer) => {
        this.letterCache.set(cacheKey, buffer);
        return buffer;
      },
    );
  }
}
