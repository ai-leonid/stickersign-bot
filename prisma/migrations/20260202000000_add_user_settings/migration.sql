ALTER TABLE "StylePreset" ADD COLUMN "name" TEXT;

UPDATE "StylePreset" SET "name" = "fontFamily" WHERE "name" IS NULL;

ALTER TABLE "StylePreset" ALTER COLUMN "name" SET NOT NULL;

CREATE UNIQUE INDEX "StylePreset_name_key" ON "StylePreset"("name");

CREATE TABLE "UserSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stylePresetId" TEXT NOT NULL,
  "fontColor" TEXT NOT NULL,
  "strokeColor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_stylePresetId_fkey" FOREIGN KEY ("stylePresetId") REFERENCES "StylePreset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
