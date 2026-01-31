CREATE TYPE "GenerationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "telegramUserId" BIGINT NOT NULL,
  "username" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StylePreset" (
  "id" TEXT NOT NULL,
  "fontFamily" TEXT NOT NULL,
  "fontSize" INTEGER NOT NULL,
  "fontColor" TEXT NOT NULL,
  "strokeColor" TEXT NOT NULL,
  "backgroundColor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StylePreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaFile" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "hash" TEXT,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pack" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "telegramPackId" TEXT,
  "isCustomButtonEnabled" BOOLEAN NOT NULL DEFAULT false,
  "phrase" TEXT NOT NULL,
  "gridSize" INTEGER NOT NULL DEFAULT 25,
  "stylePresetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sticker" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "letter" TEXT,
  "fileId" TEXT,
  "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GenerationJob" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "status" "GenerationJobStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_telegramUserId_key" ON "User"("telegramUserId");
CREATE UNIQUE INDEX "Pack_slug_key" ON "Pack"("slug");
CREATE UNIQUE INDEX "Pack_telegramPackId_key" ON "Pack"("telegramPackId");
CREATE UNIQUE INDEX "Sticker_packId_position_key" ON "Sticker"("packId", "position");
CREATE UNIQUE INDEX "MediaFile_hash_key" ON "MediaFile"("hash");

ALTER TABLE "Pack" ADD CONSTRAINT "Pack_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "StylePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
