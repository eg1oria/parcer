import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { PublicAttemptsController } from './public-attempts.controller';

@Module({
  controllers: [AttemptsController, PublicAttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
