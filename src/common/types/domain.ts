export type GenerationJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type User = {
  id: string;
  telegramUserId: bigint;
  username: string | null;
  createdAt: Date;
};

export type Pack = {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  telegramPackId: string | null;
  isCustomButtonEnabled: boolean;
  phrase: string;
  gridSize: number;
  stylePresetId: string | null;
  createdAt: Date;
};

export type Sticker = {
  id: string;
  packId: string;
  position: number;
  letter: string | null;
  fileId: string | null;
  isPlaceholder: boolean;
  createdAt: Date;
};

export type MediaType = 'letter' | 'placeholder' | 'custom-button' | 'raw';

export type MediaFile = {
  id: string;
  type: MediaType;
  storagePath: string;
  hash: string | null;
  size: number;
  createdAt: Date;
};

export type StylePreset = {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  strokeColor: string;
  backgroundColor: string;
  createdAt: Date;
};

export type UserSettings = {
  id: string;
  userId: string;
  stylePresetId: string;
  fontColor: string;
  strokeColor: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GenerationJob = {
  id: string;
  packId: string;
  status: GenerationJobStatus;
  errorMessage: string | null;
  createdAt: Date;
};

export type CreatePackInput = {
  ownerId: string;
  telegramUserId: bigint;
  title: string;
  slug: string;
  phrase: string;
  gridSize: number;
  stylePresetId: string | null;
  style: StylePreset;
};

export type MediaFileInput = {
  type: MediaType;
  storagePath: string;
  hash: string | null;
  size: number;
};
