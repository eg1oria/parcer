import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ConfirmImportVariantDto {
  @ApiProperty({ example: 'Hypertext transfer protocol' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect: boolean;
}

export class ConfirmImportQuestionDto {
  @ApiProperty({ example: 'What is HTTP?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @ApiProperty({ type: [ConfirmImportVariantDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ConfirmImportVariantDto)
  variants: ConfirmImportVariantDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnings?: string[];
}

export class ConfirmImportDto {
  @ApiProperty({ example: 'Networking test' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @ApiPropertyOptional({
    example: '0d0184d6-7b0a-4bb2-8f2b-b65ad39667cc',
  })
  @IsOptional()
  @IsUUID('4')
  sourceFileId?: string;

  @ApiProperty({ type: [ConfirmImportQuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmImportQuestionDto)
  questions: ConfirmImportQuestionDto[];
}
