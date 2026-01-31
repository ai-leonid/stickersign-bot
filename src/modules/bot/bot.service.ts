import { Injectable } from '@nestjs/common';
import type { Pack } from '../../common/types';
import { JobsService } from '../jobs/jobs.service';
import { PackManagerService } from '../packs/pack-manager.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class BotService {
  constructor(
    private readonly usersService: UsersService,
    private readonly packManagerService: PackManagerService,
    private readonly jobsService: JobsService,
  ) {}

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
      title: phrase,
      slug: '',
      phrase,
      gridSize: 25,
      stylePresetId: null,
    });

    await this.jobsService.enqueuePackGeneration(pack.id);
    return pack;
  }
}
