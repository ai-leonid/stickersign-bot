import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { StickersModule } from '../stickers/stickers.module';
import { UsersModule } from '../users/users.module';
import { PackManagerService } from './pack-manager.service';

@Module({
  imports: [MediaModule, StickersModule, UsersModule],
  providers: [PackManagerService],
  exports: [PackManagerService],
})
export class PacksModule {}
