import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ParseFormat } from '../../parser/parser.types';

export class FilePreviewDto {
  @ApiPropertyOptional({ example: 'Test about networking' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    enum: ParseFormat,
    default: ParseFormat.AUTO,
    example: ParseFormat.PARENS_MARKERS,
  })
  @IsOptional()
  @IsEnum(ParseFormat)
  format?: ParseFormat;
}
