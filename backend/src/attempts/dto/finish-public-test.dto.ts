import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FinishTestDto } from './finish-test.dto';

export class FinishPublicTestDto extends FinishTestDto {
  @ApiProperty({ example: 'alex' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nickname: string;
}
