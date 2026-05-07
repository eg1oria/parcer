import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { ImportedImageStorageService } from '../files/imported-image-storage.service';
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
  constructor(
    private readonly configService: ConfigService,
    private readonly importedImageStorageService: ImportedImageStorageService,
    private readonly parserService: ParserService,
    private readonly prisma: PrismaService,
    private readonly textExtractorService: TextExtractorService,
  ) {}

  async filePreview(
    userId: string,
    file: Express.Multer.File,
    dto: FilePreviewDto,
  ) {
    await this.cleanupStalePreviewDrafts();

    const uploadedFileId = randomUUID();
    let extractedText: string;

    try {
      extractedText = await this.textExtractorService.extractText(file, {
        draftId: uploadedFileId,
      });
    } catch (error) {
      await this.importedImageStorageService.discardPreviewImages(
        uploadedFileId,
      );
      throw error;
    }

    try {
      this.ensureRawTextSize(extractedText);
    } catch (error) {
      await this.importedImageStorageService.discardPreviewImages(
        uploadedFileId,
      );
      throw error;
    }

    let uploadedFile: {
      id: string;
      originalName: string;
      mimeType: string;
      size: number;
    };

    try {
      uploadedFile = await this.prisma.uploadedFile.create({
        data: {
          id: uploadedFileId,
          userId,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          extractedText,
          status: 'PROCESSED',
        },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
        },
      });
    } catch (error) {
      await this.importedImageStorageService.discardPreviewImages(
        uploadedFileId,
      );
      throw error;
    }

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
    const finalizedImport = await this.finalizePreviewImages(
      dto.sourceFileId,
      dto.questions,
    );

    let test: {
      id: string;
      title: string;
    };

    try {
      test = await this.prisma.test.create({
        data: {
          userId,
          title: dto.title.trim(),
          sourceFileId: dto.sourceFileId,
          type: 'SINGLE_CHOICE',
          questions: {
            create: finalizedImport.questions.map((question, questionIndex) => ({
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
    } catch (error) {
      await Promise.all(
        finalizedImport.createdPermanentImageUrls.map((imageUrl) =>
          this.importedImageStorageService.deletePermanentImageByUrl(imageUrl),
        ),
      );
      throw error;
    }

    if (dto.sourceFileId) {
      await this.importedImageStorageService
        .discardPreviewImages(dto.sourceFileId)
        .catch(() => undefined);
    }

    return {
      testId: test.id,
      title: test.title,
      questionsCount: dto.questions.length,
    };
  }

  async discardPreview(userId: string, sourceFileId: string): Promise<void> {
    await this.cleanupStalePreviewDrafts();

    const sourceFile = await this.prisma.uploadedFile.findFirst({
      where: { id: sourceFileId, userId },
      select: {
        id: true,
        tests: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!sourceFile) {
      throw new NotFoundException('Uploaded file not found');
    }

    await this.importedImageStorageService.discardPreviewImages(sourceFileId);

    if (sourceFile.tests.length === 0) {
      await this.prisma.uploadedFile.delete({
        where: { id: sourceFileId },
      });
    }
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

  private async finalizePreviewImages(
    sourceFileId: string | undefined,
    questions: ConfirmImportQuestionDto[],
  ): Promise<{
    createdPermanentImageUrls: string[];
    questions: ConfirmImportQuestionDto[];
  }> {
    const createdPermanentImageUrls = new Set<string>();
    const promotedImageUrls = new Map<string, string>();

    const promoteImageUrl = async (imageUrl: string): Promise<string> => {
      const cachedImageUrl = promotedImageUrls.get(imageUrl);

      if (cachedImageUrl) {
        return cachedImageUrl;
      }

      if (!this.importedImageStorageService.isPreviewImageUrl(imageUrl)) {
        return imageUrl;
      }

      if (!sourceFileId) {
        throw new BadRequestException(
          'Preview images can only be saved together with their imported file',
        );
      }

      const promotedImage = await this.importedImageStorageService.promotePreviewImage(
        sourceFileId,
        imageUrl,
      );

      if (!promotedImage) {
        return imageUrl;
      }

      promotedImageUrls.set(imageUrl, promotedImage.url);

      if (promotedImage.created) {
        createdPermanentImageUrls.add(promotedImage.url);
      }

      return promotedImage.url;
    };

    const finalizedQuestions = await Promise.all(
      questions.map(async (question) => ({
        ...question,
        imageUrls: await Promise.all(
          (question.imageUrls ?? []).map((imageUrl) => promoteImageUrl(imageUrl)),
        ),
        variants: await Promise.all(
          question.variants.map(async (variant) => ({
            ...variant,
            imageUrls: await Promise.all(
              (variant.imageUrls ?? []).map((imageUrl) =>
                promoteImageUrl(imageUrl),
              ),
            ),
          })),
        ),
      })),
    );

    return {
      createdPermanentImageUrls: [...createdPermanentImageUrls],
      questions: finalizedQuestions,
    };
  }

  private async cleanupStalePreviewDrafts(): Promise<void> {
    const ttlMs = getPositiveIntConfig(
      this.configService,
      'IMPORTED_PREVIEW_TTL_MS',
      24 * 60 * 60 * 1000,
    );
    const cutoffDate = new Date(Date.now() - ttlMs);
    const staleUploads = await this.prisma.uploadedFile.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        tests: {
          none: {},
        },
      },
      select: {
        id: true,
      },
    });

    if (staleUploads.length === 0) {
      return;
    }

    const staleUploadIds = staleUploads.map((upload) => upload.id);

    await Promise.all(
      staleUploadIds.map((uploadId) =>
        this.importedImageStorageService.discardPreviewImages(uploadId),
      ),
    );
    await this.prisma.uploadedFile.deleteMany({
      where: {
        id: {
          in: staleUploadIds,
        },
        tests: {
          none: {},
        },
      },
    });
  }
}
