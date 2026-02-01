import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { BotModule } from './modules/bot/bot.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MediaModule } from './modules/media/media.module';
import { PacksModule } from './modules/packs/packs.module';
import { StickersModule } from './modules/stickers/stickers.module';
import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    BotModule,
    PacksModule,
    StickersModule,
    MediaModule,
    UsersModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
