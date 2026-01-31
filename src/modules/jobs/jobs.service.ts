import { Injectable } from '@nestjs/common';
import type { GenerationJob } from '../../common/types';

@Injectable()
export class JobsService {
  enqueuePackGeneration(packId: string): Promise<GenerationJob> {
    void packId;
    return Promise.resolve({
      id: '',
      packId,
      status: 'PENDING',
      errorMessage: null,
      createdAt: new Date(),
    });
  }
}
