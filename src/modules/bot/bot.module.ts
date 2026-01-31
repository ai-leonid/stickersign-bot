import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { PacksModule } from '../packs/packs.module';
import { UsersModule } from '../users/users.module';
import { BotService } from './bot.service';

@Module({
  imports: [UsersModule, PacksModule, JobsModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
