import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { FinishPublicTestDto } from './dto/finish-public-test.dto';
import { AttemptsService } from './attempts.service';

@ApiTags('public tests')
@Controller('public/tests/:id')
export class PublicAttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Get()
  @ApiOkResponse({ description: 'Public test summary and leaderboard.' })
  summary(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.attemptsService.getPublicSummary(id);
  }

  @Get('leaderboard')
  @ApiOkResponse({ description: 'Public test leaderboard.' })
  leaderboard(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.attemptsService.getLeaderboard(id);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Start public test without correct answer flags.',
  })
  start(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.attemptsService.startPublic(id);
  }

  @Post('check-answer')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Check one public answer.' })
  checkAnswer(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.attemptsService.checkAnswerPublic(id, dto);
  }

  @Post('finish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Finish public test and persist guest attempt.',
  })
  finish(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: FinishPublicTestDto,
  ) {
    return this.attemptsService.finishPublic(id, dto);
  }
}
