import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { FinishTestDto } from './dto/finish-test.dto';
import { AttemptsService } from './attempts.service';

@ApiTags('attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tests/:id')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Start test without correct answer flags.' })
  start(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.attemptsService.start(user.id, id);
  }

  @Post('check-answer')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Check one answer.' })
  checkAnswer(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.attemptsService.checkAnswer(user.id, id, dto);
  }

  @Post('finish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Finish test and persist attempt.' })
  finish(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: FinishTestDto,
  ) {
    return this.attemptsService.finish(user.id, id, dto);
  }
}
