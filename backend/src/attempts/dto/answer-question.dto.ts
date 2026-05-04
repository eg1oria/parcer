import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AnswerQuestionDto {
  @ApiProperty({ example: 'e3e9dd5e-64b2-4a46-a37d-7bc1c2f7fd96' })
  @IsUUID('4')
  questionId: string;

  @ApiProperty({ example: 'ea586774-44c4-43b5-8cdb-59b131249dd4' })
  @IsUUID('4')
  variantId: string;
}
