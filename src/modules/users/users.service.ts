import { Injectable } from '@nestjs/common';
import type { User } from '../../common/types';

@Injectable()
export class UsersService {
  getOrCreateUser(
    telegramUserId: bigint,
    username: string | null,
  ): Promise<User> {
    void telegramUserId;
    return Promise.resolve({
      id: '',
      telegramUserId,
      username,
      createdAt: new Date(),
    });
  }
}
