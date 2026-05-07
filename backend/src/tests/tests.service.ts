import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.test.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
          },
        },
        _count: {
          select: { questions: true, attempts: true },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const test = await this.prisma.test.findFirst({
      where: { id, userId },
      include: this.detailInclude(),
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return test;
  }

  async remove(userId: string, id: string) {
    const test = await this.prisma.test.findFirst({
      where: { id, userId },
      select: {
        id: true,
        sourceFileId: true,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.test.delete({
        where: { id: test.id },
      });

      if (!test.sourceFileId) {
        return;
      }

      const remainingTests = await tx.test.count({
        where: { sourceFileId: test.sourceFileId },
      });

      if (remainingTests === 0) {
        await tx.uploadedFile.deleteMany({
          where: {
            id: test.sourceFileId,
            userId,
          },
        });
      }
    });
  }

  async copyPublicTest(userId: string, sourceTestId: string) {
    const sourceTest = await this.getPublicSourceTest(sourceTestId);

    const copiedTest = await this.prisma.test.create({
      data: this.buildCopiedTestData(
        userId,
        sourceTest.title.trim(),
        sourceTest.type,
        sourceTest.questions,
      ),
      select: {
        id: true,
        title: true,
      },
    });

    return {
      testId: copiedTest.id,
      title: copiedTest.title,
      questionsCount: sourceTest.questions.length,
    };
  }

  async splitPublicTest(
    userId: string,
    sourceTestId: string,
    questionsPerPart: number,
  ) {
    const sourceTest = await this.getPublicSourceTest(sourceTestId);

    if (sourceTest.questions.length < 2) {
      throw new BadRequestException('Test is too small to split');
    }

    if (questionsPerPart >= sourceTest.questions.length) {
      throw new BadRequestException(
        'Questions per part must be smaller than total questions',
      );
    }

    const questionGroups = this.chunkItems(
      sourceTest.questions,
      questionsPerPart,
    );
    const createdTests = await this.prisma.$transaction(
      questionGroups.map((questions, index) =>
        this.prisma.test.create({
          data: this.buildCopiedTestData(
            userId,
            `${sourceTest.title.trim()} (${index + 1}/${questionGroups.length})`,
            sourceTest.type,
            questions,
          ),
          select: {
            id: true,
            title: true,
          },
        }),
      ),
    );

    return {
      totalParts: createdTests.length,
      createdTests: createdTests.map((test, index) => ({
        testId: test.id,
        title: test.title,
        questionsCount: questionGroups[index].length,
      })),
    };
  }

  private async getPublicSourceTest(sourceTestId: string) {
    const sourceTest = await this.prisma.test.findUnique({
      where: { id: sourceTestId },
      include: this.detailInclude(),
    });

    if (!sourceTest) {
      throw new NotFoundException('Test not found');
    }

    return sourceTest;
  }

  private buildCopiedTestData(
    userId: string,
    title: string,
    type: 'SINGLE_CHOICE',
    questions: Array<{
      text: string;
      imageUrls: string[];
      variants: Array<{
        text: string;
        imageUrls: string[];
        isCorrect: boolean;
      }>;
    }>,
  ) {
    return {
      userId,
      title,
      type,
      questions: {
        create: questions.map((question, questionIndex) => ({
          text: question.text,
          imageUrls: question.imageUrls,
          order: questionIndex + 1,
          variants: {
            create: question.variants.map((variant, variantIndex) => ({
              text: variant.text,
              imageUrls: variant.imageUrls,
              isCorrect: variant.isCorrect,
              order: variantIndex + 1,
            })),
          },
        })),
      },
    };
  }

  private chunkItems<T>(items: readonly T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += chunkSize) {
      chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
  }

  detailInclude() {
    return {
      sourceFile: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
        },
      },
      questions: {
        orderBy: { order: 'asc' as const },
        include: {
          variants: {
            orderBy: { order: 'asc' as const },
          },
        },
      },
    };
  }
}
