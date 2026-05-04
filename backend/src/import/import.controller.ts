import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthUser } from '../common/types/auth-user.type';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../files/files.constants';
import { ParseFormat } from '../parser/parser.types';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { FilePreviewDto } from './dto/file-preview.dto';
import { ImportService } from './import.service';

@ApiTags('import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('file-preview')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
          example: 'Networking test',
        },
        format: {
          type: 'string',
          enum: Object.values(ParseFormat),
          default: ParseFormat.AUTO,
          example: ParseFormat.PARENS_MARKERS,
        },
      },
      required: ['file'],
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Parsed file preview.' })
  filePreview(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: FilePreviewDto,
  ) {
    return this.importService.filePreview(user.id, file, dto);
  }

  @Post('confirm')
  @ApiCreatedResponse({ description: 'Imported questions saved as a test.' })
  confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmImportDto) {
    return this.importService.confirm(user.id, dto);
  }
}
