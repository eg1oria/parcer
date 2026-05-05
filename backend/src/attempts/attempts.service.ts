import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { FinishTestDto } from './dto/finish-test.dto';
import { FinishPublicTestDto } from './dto/finish-public-test.dto';

type TestWithQuestions = Awaited<ReturnType<AttemptsService['getOwnedTest']>>;
const LEADERBOARD_LIMIT = 20;

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(userId: string, testId: string) {
    const test = await this.getOwnedTest(userId, testId);

    return this.toStartedTest(test);
  }

  async startPublic(testId: string) {
    const test = await this.getPublicTest(testId);

    return this.toStartedTest(test);
  }

  async getPublicSummary(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: {
        id: true,
        title: true,
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return {
      id: test.id,
      title: test.title,
      questionsCount: test._count.questions,
      leaderboard: await this.getLeaderboardEntries(test.id),
    };
  }

  async checkAnswer(userId: string, testId: string, dto: AnswerQuestionDto) {
    const test = await this.getOwnedTest(userId, testId);

    return this.checkAnswerForTest(test, dto);
  }

  async checkAnswerPublic(testId: string, dto: AnswerQuestionDto) {
    const test = await this.getPublicTest(testId);

    return this.checkAnswerForTest(test, dto);
  }

  async finish(userId: string, testId: string, dto: FinishTestDto) {
    const test = await this.getOwnedTest(userId, testId);

    return this.finishForTest(test, dto, { userId });
  }

  async finishPublic(testId: string, dto: FinishPublicTestDto) {
    const test = await this.getPublicTest(testId);

    return this.finishForTest(test, dto, { guestName: dto.nickname });
  }

  async getLeaderboard(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: { id: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return this.getLeaderboardEntries(test.id);
  }

  private async finishForTest(
    test: TestWithQuestions,
    dto: FinishTestDto,
    participant: { userId: string } | { guestName: string },
  ) {
    const answersByQuestionId = this.validateFinishAnswers(test, dto);
    const total = test.questions.length;
    let score = 0;

    const attemptAnswers = test.questions.map((question) => {
      const selectedVariantId = answersByQuestionId.get(question.id)!;
      const selectedVariant = question.variants.find(
        (variant) => variant.id === selectedVariantId,
      );

      if (!selectedVariant) {
        throw new BadRequestException('Variant does not belong to question');
      }

      if (selectedVariant.isCorrect) {
        score += 1;
      }

      return {
        questionId: question.id,
        selectedVariantId: selectedVariant.id,
        isCorrect: selectedVariant.isCorrect,
      };
    });

    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const userId = 'userId' in participant ? participant.userId : undefined;
    const guestName =
      'guestName' in participant
        ? this.normalizeGuestName(participant.guestName)
        : undefined;

    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        guestName,
        testId: test.id,
        score,
        total,
        percent,
        answers: {
          create: attemptAnswers,
        },
      },
      select: { id: true },
    });

    return {
      attemptId: attempt.id,
      score,
      total,
      percent,
    };
  }

  private async getOwnedTest(userId: string, testId: string) {
    const test = await this.prisma.test.findFirst({
      where: { id: testId, userId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            variants: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return test;
  }

  private async getPublicTest(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            variants: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return test;
  }

  private toStartedTest(test: TestWithQuestions) {
    return {
      id: test.id,
      title: test.title,
      questions: this.shuffleItems(test.questions).map((question, index) => ({
        id: question.id,
        text: question.text,
        imageUrls: question.imageUrls,
        order: index + 1,
        variants: this.shuffleItems(question.variants).map(
          (variant, index) => ({
            id: variant.id,
            text: variant.text,
            imageUrls: variant.imageUrls,
            order: index + 1,
          }),
        ),
      })),
    };
  }

  private shuffleItems<T>(items: readonly T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const targetIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[targetIndex]] = [
        shuffled[targetIndex],
        shuffled[index],
      ];
    }

    return shuffled;
  }

  private checkAnswerForTest(test: TestWithQuestions, dto: AnswerQuestionDto) {
    const question = this.findQuestion(test, dto.questionId);
    const selectedVariant = question.variants.find(
      (variant) => variant.id === dto.variantId,
    );

    if (!selectedVariant) {
      throw new BadRequestException('Variant does not belong to question');
    }

    const correctVariant = question.variants.find(
      (variant) => variant.isCorrect,
    );

    if (!correctVariant) {
      throw new BadRequestException('Question has no correct variant');
    }

    return {
      isCorrect: selectedVariant.isCorrect,
      correctVariantId: correctVariant.id,
      correctVariantText: correctVariant.text,
    };
  }

  private async getLeaderboardEntries(testId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { testId },
      orderBy: [{ percent: 'desc' }, { score: 'desc' }, { createdAt: 'asc' }],
      take: LEADERBOARD_LIMIT,
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return attempts.map((attempt, index) => ({
      rank: index + 1,
      id: attempt.id,
      name: attempt.guestName || attempt.user?.email || 'Участник',
      score: attempt.score,
      total: attempt.total,
      percent: attempt.percent,
      createdAt: attempt.createdAt,
    }));
  }

  private normalizeGuestName(name: string): string {
    return name.trim().slice(0, 40);
  }

  private findQuestion(test: TestWithQuestions, questionId: string) {
    const question = test.questions.find((item) => item.id === questionId);

    if (!question) {
      throw new BadRequestException('Question does not belong to test');
    }

    return question;
  }

  private validateFinishAnswers(
    test: TestWithQuestions,
    dto: FinishTestDto,
  ): Map<string, string> {
    if (dto.answers.length !== test.questions.length) {
      throw new BadRequestException('Submit exactly one answer per question');
    }

    const answersByQuestionId = new Map<string, string>();

    for (const answer of dto.answers) {
      if (answersByQuestionId.has(answer.questionId)) {
        throw new BadRequestException('Duplicate answer for question');
      }

      this.findQuestion(test, answer.questionId);
      answersByQuestionId.set(answer.questionId, answer.variantId);
    }

    return answersByQuestionId;
  }
}
