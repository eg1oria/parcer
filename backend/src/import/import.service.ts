import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextExtractorService } from '../files/text-extractor.service';
import { ParsedQuestion, ParseFormat } from '../parser/parser.types';
import { ParserService } from '../parser/parser.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfirmImportDto,
  ConfirmImportQuestionDto,
} from './dto/confirm-import.dto';
import { FilePreviewDto } from './dto/file-preview.dto';
import { getPositiveIntConfig } from '../common/config/env-number';

@Injectable()
export class ImportService {
  constructor(
    private readonly configService: ConfigService,
    private readonly parserService: ParserService,
    private readonly prisma: PrismaService,
    private readonly textExtractorService: TextExtractorService,
  ) {}

  async filePreview(
    userId: string,
    file: Express.Multer.File,
    dto: FilePreviewDto,
  ) {
    const extractedText = await this.textExtractorService.extractText(file);
    this.ensureRawTextSize(extractedText);

    const uploadedFile = await this.prisma.uploadedFile.create({
      data: {
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        extractedText,
        status: 'PROCESSED',
      },
    });

    const format = dto.format ?? ParseFormat.AUTO;
    const questions = this.parserService.parseTextToQuestions(extractedText, {
      format,
    });
    const warnings = this.flattenWarnings(questions);
    const validQuestions = questions.filter(
      (question) => this.questionWarnings(question).length === 0,
    ).length;

    return {
      file: {
        id: uploadedFile.id,
        originalName: uploadedFile.originalName,
        mimeType: uploadedFile.mimeType,
        size: uploadedFile.size,
      },
      title: dto.title?.trim() || this.titleFromFileName(file.originalname),
      format,
      questionsFound: questions.length,
      validQuestions,
      invalidQuestions: questions.length - validQuestions,
      questions,
      warnings,
    };
  }

  async confirm(userId: string, dto: ConfirmImportDto) {
    if (dto.sourceFileId) {
      await this.ensureSourceFileOwnedByUser(userId, dto.sourceFileId);
    }

    this.validateQuestions(dto.questions);

    const test = await this.prisma.test.create({
      data: {
        userId,
        title: dto.title.trim(),
        sourceFileId: dto.sourceFileId,
        type: 'SINGLE_CHOICE',
        questions: {
          create: dto.questions.map((question, questionIndex) => ({
            text: question.text.trim(),
            order: questionIndex + 1,
            variants: {
              create: question.variants.map((variant, variantIndex) => ({
                text: variant.text.trim(),
                isCorrect: variant.isCorrect,
                order: variantIndex + 1,
              })),
            },
          })),
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    return {
      testId: test.id,
      title: test.title,
      questionsCount: dto.questions.length,
    };
  }

  private ensureRawTextSize(rawText: string): void {
    const maxChars = getPositiveIntConfig(
      this.configService,
      'RAW_IMPORT_MAX_CHARS',
      100000,
    );

    if (rawText.length > maxChars) {
      throw new BadRequestException(
        `Extracted text is too large. Max size is ${maxChars} characters`,
      );
    }
  }

  private async ensureSourceFileOwnedByUser(
    userId: string,
    sourceFileId: string,
  ): Promise<void> {
    const sourceFile = await this.prisma.uploadedFile.findFirst({
      where: { id: sourceFileId, userId },
      select: { id: true },
    });

    if (!sourceFile) {
      throw new NotFoundException('Uploaded file not found');
    }
  }

  private validateQuestions(questions: ConfirmImportQuestionDto[]): void {
    const warnings = this.flattenWarnings(
      questions.map((question) => ({
        text: question.text,
        variants: question.variants,
      })),
    );

    if (warnings.length > 0) {
      throw new BadRequestException({
        message: 'Import questions are invalid',
        warnings,
      });
    }
  }

  private flattenWarnings(
    questions: Pick<ParsedQuestion, 'text' | 'variants' | 'warnings'>[],
  ): string[] {
    return questions.flatMap((question, index) =>
      this.questionWarnings(question).map(
        (warning) => `Question ${index + 1}: ${warning}`,
      ),
    );
  }

  private questionWarnings(
    question: Pick<ParsedQuestion, 'text' | 'variants' | 'warnings'>,
  ): string[] {
    const warnings: string[] = [];

    if (!question.text.trim()) {
      warnings.push('text is empty');
    }

    if (question.variants.length < 2) {
      warnings.push('fewer than 2 variants');
    }

    const correctCount = question.variants.filter(
      (variant) => variant.isCorrect,
    ).length;

    if (correctCount !== 1) {
      warnings.push('expected exactly one correct answer');
    }

    for (const [variantIndex, variant] of question.variants.entries()) {
      if (!variant.text.trim()) {
        warnings.push(`variant ${variantIndex + 1} text is empty`);
      }
    }

    if (Array.isArray(question.warnings)) {
      warnings.push(...question.warnings);
    }

    return Array.from(new Set(warnings));
  }

  private titleFromFileName(originalName: string): string {
    return originalName.replace(/\.[^.]+$/, '').trim() || 'Imported test';
  }
}
