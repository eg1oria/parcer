import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnswerQuestionDto } from './answer-question.dto';

export class FinishTestDto {
  @ApiProperty({ type: [AnswerQuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerQuestionDto)
  answers: AnswerQuestionDto[];
}
