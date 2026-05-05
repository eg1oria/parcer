import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp, NEST_APP_FACTORY_OPTIONS } from './../src/app.setup';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

type AuthBody = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

type PreviewBody = {
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  questionsFound: number;
  validQuestions: number;
  invalidQuestions: number;
  format: string;
  questions: Array<{
    text: string;
    variants: Array<{
      text: string;
      isCorrect: boolean;
    }>;
    warnings: string[];
  }>;
  warnings: string[];
};

type ConfirmBody = {
  testId: string;
  title: string;
  questionsCount: number;
};

type StartBody = {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    variants: Array<{
      id: string;
      text: string;
      isCorrect?: boolean;
    }>;
  }>;
};

type AnswerBody = {
  isCorrect: boolean;
  correctVariantId: string;
  correctVariantText: string;
};

type FinishBody = {
  score: number;
  total: number;
  percent: number;
};

describe('Backend MVP (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
    process.env.RAW_IMPORT_MAX_CHARS =
      process.env.RAW_IMPORT_MAX_CHARS ?? '100000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication(NEST_APP_FACTORY_OPTIONS);
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports file upload, preview, import, test passing', async () => {
    const auth = await register('student@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .field('title', 'Networking basics')
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'networking.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    expect(preview.file.originalName).toBe('networking.txt');
    expect(preview.questionsFound).toBe(2);
    expect(preview.validQuestions).toBe(2);
    expect(preview.invalidQuestions).toBe(0);

    const confirm = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({
          title: 'Networking basics',
          sourceFileId: preview.file.id,
          questions: preview.questions,
        })
        .expect(201)
    ).body as ConfirmBody;

    expect(confirm.questionsCount).toBe(2);

    await request(app.getHttpServer())
      .get('/tests')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ id: string }>;
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(confirm.testId);
      });

    await request(app.getHttpServer())
      .get(`/tests/${confirm.testId}`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          questions: Array<{
            variants: Array<{
              isCorrect: boolean;
            }>;
          }>;
        };
        expect(body.questions).toHaveLength(2);
        expect(body.questions[0].variants[0]).toHaveProperty('isCorrect');
      });

    const started = (
      await request(app.getHttpServer())
        .post(`/tests/${confirm.testId}/start`)
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200)
    ).body as StartBody;

    expect(started.questions[0].variants[0]).not.toHaveProperty('isCorrect');

    const firstQuestion = started.questions[0];
    const firstVariant = firstQuestion.variants[0];
    const checked = (
      await request(app.getHttpServer())
        .post(`/tests/${confirm.testId}/check-answer`)
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({
          questionId: firstQuestion.id,
          variantId: firstVariant.id,
        })
        .expect(200)
    ).body as AnswerBody;

    expect(checked.isCorrect).toBe(true);
    expect(checked.correctVariantText).toBe('Hypertext transfer protocol');

    const finish = (
      await request(app.getHttpServer())
        .post(`/tests/${confirm.testId}/finish`)
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({
          answers: started.questions.map((question) => ({
            questionId: question.id,
            variantId: question.variants[0].id,
          })),
        })
        .expect(200)
    ).body as FinishBody;

    expect(finish).toEqual({
      score: 2,
      total: 2,
      percent: 100,
    });
  });

  it('does not expose uploaded files or tests across users', async () => {
    const owner = await register('owner@example.com');
    const stranger = await register('stranger@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'private.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    const confirm = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Private test',
          sourceFileId: preview.file.id,
          questions: preview.questions,
        })
        .expect(201)
    ).body as ConfirmBody;

    await request(app.getHttpServer())
      .get(`/tests/${confirm.testId}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post('/import/confirm')
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({
        title: 'Not allowed',
        sourceFileId: preview.file.id,
        questions: preview.questions,
      })
      .expect(404);
  });

  it('accepts a larger confirm payload with embedded images', async () => {
    const auth = await register('images@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'images.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    const largeImageUrl = `data:image/png;base64,${'A'.repeat(140_000)}`;

    const confirm = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({
          title: 'Large image payload',
          sourceFileId: preview.file.id,
          questions: preview.questions.map((question, index) => ({
            ...question,
            imageUrls: index === 0 ? [largeImageUrl] : [],
          })),
        })
        .expect(201)
    ).body as ConfirmBody;

    expect(confirm.questionsCount).toBe(2);
  });

  async function register(email: string): Promise<AuthBody> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'strongPassword123',
      })
      .expect(201);

    return response.body as AuthBody;
  }

  async function cleanDatabase(): Promise<void> {
    await prisma.attemptAnswer.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.variant.deleteMany();
    await prisma.question.deleteMany();
    await prisma.test.deleteMany();
    await prisma.uploadedFile.deleteMany();
    await prisma.user.deleteMany();
  }

  function sampleRawText(): string {
    return `
1. What is HTTP?
A) Hypertext transfer protocol *
B) Programming language
C) Database
D) Operating system

2. What is CSS?
A) Style language *
B) Backend framework
C) Database
D) Server
`;
  }
});
