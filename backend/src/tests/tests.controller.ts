import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { TestsService } from './tests.service';

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  @ApiOkResponse({ description: 'Current user tests.' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.testsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Test details with questions and variants.' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.testsService.findOne(user.id, id);
  }
}
