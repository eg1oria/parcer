import { Module } from '@nestjs/common';
import { TestsModule } from '../tests/tests.module';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { PublicAttemptsController } from './public-attempts.controller';

@Module({
  imports: [TestsModule],
  controllers: [AttemptsController, PublicAttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
