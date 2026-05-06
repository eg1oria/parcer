import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextExtractorService } from '../files/text-extractor.service';
import { ParsedQuestion, ParseFormat } from '../parser/parser.types';
import { ParserService } from '../parser/parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { isQuestionImageUrl } from '../common/image-url';
import {
  ConfirmImportDto,
  ConfirmImportQuestionDto,
} from './dto/confirm-import.dto';
import { FilePreviewDto } from './dto/file-preview.dto';
import { getPositiveIntConfig } from '../common/config/env-number';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

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
    this.logger.log(
      `Extracted text (first 5000 chars):\n${extractedText.slice(0, 5000)}`,
    );
    const questions = this.parserService.parseTextToQuestions(extractedText, {
      format,
    });
    for (const [index, question] of questions.entries()) {
      const qWarnings = this.questionWarnings(question);
      if (qWarnings.length > 0) {
        this.logger.warn(
          `Q${index + 1} warnings: ${qWarnings.join(', ')}\n` +
          `  text: ${JSON.stringify(question.text.slice(0, 100))}\n` +
          `  imageUrls: ${JSON.stringify(question.imageUrls)}\n` +
          `  variants(${question.variants.length}): ${JSON.stringify(
            question.variants.map((v) => ({
              text: v.text.slice(0, 60),
              imageUrls: v.imageUrls,
              isCorrect: v.isCorrect,
            })),
          )}`,
        );
      }
    }
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
            imageUrls: question.imageUrls ?? [],
            order: questionIndex + 1,
            variants: {
              create: question.variants.map((variant, variantIndex) => ({
                text: variant.text.trim(),
                imageUrls: variant.imageUrls ?? [],
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

    if (this.textWithoutEmbeddedImages(rawText).length > maxChars) {
      throw new BadRequestException(
        `Extracted text is too large. Max size is ${maxChars} characters`,
      );
    }
  }

  private textWithoutEmbeddedImages(rawText: string): string {
    return rawText
      .replace(/\[\[image:[^\]]+\]\]/giu, '')
      .replace(/<img\b[^>]*>/giu, '')
      .replace(/<image\b[^>]*>/giu, '');
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
        imageUrls: question.imageUrls,
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
    questions: Pick<
      ParsedQuestion,
      'text' | 'imageUrls' | 'variants' | 'warnings'
    >[],
  ): string[] {
    return questions.flatMap((question, index) =>
      this.questionWarnings(question).map(
        (warning) => `Question ${index + 1}: ${warning}`,
      ),
    );
  }

  private questionWarnings(
    question: Pick<
      ParsedQuestion,
      'text' | 'imageUrls' | 'variants' | 'warnings'
    >,
  ): string[] {
    const warnings: string[] = [];
    const imageUrls = question.imageUrls ?? [];

    if (!question.text.trim() && imageUrls.length === 0) {
      warnings.push('text is empty');
    }

    for (const [imageIndex, imageUrl] of imageUrls.entries()) {
      if (!isQuestionImageUrl(imageUrl)) {
        warnings.push(`image ${imageIndex + 1} is invalid`);
      }
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
      const variantImageUrls = variant.imageUrls ?? [];

      if (!variant.text.trim() && variantImageUrls.length === 0) {
        warnings.push(`variant ${variantIndex + 1} text is empty`);
      }

      for (const [imageIndex, imageUrl] of variantImageUrls.entries()) {
        if (!isQuestionImageUrl(imageUrl)) {
          warnings.push(
            `variant ${variantIndex + 1} image ${imageIndex + 1} is invalid`,
          );
        }
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
