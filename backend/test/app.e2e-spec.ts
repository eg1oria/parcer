import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp, NEST_APP_FACTORY_OPTIONS } from './../src/app.setup';
import { AppModule } from './../src/app.module';
import { AuthRateLimitService } from './../src/auth/auth-rate-limit.service';
import {
  IMPORTED_IMAGE_PREVIEW_ROUTE_PREFIX,
  IMPORTED_IMAGE_PREVIEW_STORAGE_PATH,
  IMPORTED_IMAGE_ROUTE_PREFIX,
  IMPORTED_IMAGE_STORAGE_PATH,
} from './../src/files/files.constants';
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
    imageUrls?: string[];
    variants: Array<{
      text: string;
      imageUrls?: string[];
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
    text: string;
    imageUrls?: string[];
    variants: Array<{
      id: string;
      text: string;
      imageUrls?: string[];
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
  attemptId?: string;
  score: number;
  total: number;
  percent: number;
};

describe('Backend MVP (e2e)', () => {
  let app: INestApplication<App>;
  let authRateLimitService: AuthRateLimitService;
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

    authRateLimitService = app.get(AuthRateLimitService);
    prisma = app.get(PrismaService);
    await cleanDatabase();
  });

  afterEach(async () => {
    await cleanDatabase();
    authRateLimitService.reset();
  });

  afterAll(async () => {
    await cleanImportedImages();
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

    const firstQuestion = started.questions.find((question) =>
      question.text.includes('HTTP'),
    );

    expect(firstQuestion).toBeDefined();

    const firstVariant = firstQuestion!.variants.find(
      (variant) => variant.text === 'Hypertext transfer protocol',
    );

    expect(firstVariant).toBeDefined();

    const checked = (
      await request(app.getHttpServer())
        .post(`/tests/${confirm.testId}/check-answer`)
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({
          questionId: firstQuestion!.id,
          variantId: firstVariant!.id,
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
          answers: started.questions.map((question) => {
            const correctVariant = question.variants.find((variant) =>
              isCorrectVariantText(question.text, variant.text),
            );

            if (!correctVariant) {
              throw new Error(
                `Correct variant not found for question "${question.text}"`,
              );
            }

            return {
              questionId: question.id,
              variantId: correctVariant.id,
            };
          }),
        })
        .expect(200)
    ).body as FinishBody;

    expect(finish.score).toBe(2);
    expect(finish.total).toBe(2);
    expect(finish.percent).toBe(100);
    expect(finish.attemptId).toBeDefined();
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

  it('allows another authenticated user to save a shared test into their own account', async () => {
    const owner = await register('shared-owner@example.com');
    const receiver = await register('shared-receiver@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'shared.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    const original = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Shared test',
          sourceFileId: preview.file.id,
          questions: preview.questions,
        })
        .expect(201)
    ).body as ConfirmBody;

    const copied = (
      await request(app.getHttpServer())
        .post(`/public/tests/${original.testId}/save`)
        .set('Authorization', `Bearer ${receiver.accessToken}`)
        .expect(201)
    ).body as ConfirmBody;

    expect(copied.title).toBe('Shared test');
    expect(copied.questionsCount).toBe(2);
    expect(copied.testId).not.toBe(original.testId);

    await request(app.getHttpServer())
      .get('/tests')
      .set('Authorization', `Bearer ${receiver.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ id: string }>;
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(copied.testId);
      });

    await request(app.getHttpServer())
      .get(`/tests/${copied.testId}`)
      .set('Authorization', `Bearer ${receiver.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          questions: Array<{
            text: string;
            variants: Array<{
              text: string;
              isCorrect: boolean;
            }>;
          }>;
        };
        expect(body.questions).toHaveLength(2);
        expect(body.questions[0].text).toBe('What is HTTP?');
        expect(body.questions[0].variants[0].isCorrect).toBe(true);
      });

    await request(app.getHttpServer())
      .post(`/tests/${copied.testId}/start`)
      .set('Authorization', `Bearer ${receiver.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/tests/${original.testId}`)
      .set('Authorization', `Bearer ${receiver.accessToken}`)
      .expect(404);
  });

  it('allows another authenticated user to split a shared test into smaller tests', async () => {
    const owner = await register('split-owner@example.com');
    const receiver = await register('split-receiver@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'split.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    const original = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Split test',
          sourceFileId: preview.file.id,
          questions: preview.questions,
        })
        .expect(201)
    ).body as ConfirmBody;

    const split = (
      await request(app.getHttpServer())
        .post(`/public/tests/${original.testId}/split`)
        .set('Authorization', `Bearer ${receiver.accessToken}`)
        .send({
          questionsPerPart: 1,
        })
        .expect(201)
    ).body as {
      totalParts: number;
      createdTests: Array<ConfirmBody>;
    };

    expect(split.totalParts).toBe(2);
    expect(split.createdTests).toHaveLength(2);
    expect(split.createdTests[0].questionsCount).toBe(1);
    expect(split.createdTests[1].questionsCount).toBe(1);

    await request(app.getHttpServer())
      .get('/tests')
      .set('Authorization', `Bearer ${receiver.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as Array<{ id: string }>;
        expect(body).toHaveLength(2);
        expect(body.map((test) => test.id).sort()).toEqual(
          split.createdTests.map((test) => test.testId).sort(),
        );
      });

    for (const createdTest of split.createdTests) {
      await request(app.getHttpServer())
        .get(`/tests/${createdTest.testId}`)
        .set('Authorization', `Bearer ${receiver.accessToken}`)
        .expect(200)
        .expect((response) => {
          const body = response.body as {
            title: string;
            questions: Array<{ text: string }>;
          };
          expect(body.title).toContain('Split test');
          expect(body.questions).toHaveLength(1);
        });
    }
  });

  it('allows the owner to delete a test and blocks deletion from another user', async () => {
    const owner = await register('delete-owner@example.com');
    const stranger = await register('delete-stranger@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'delete-me.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    const createdTest = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          title: 'Delete me',
          sourceFileId: preview.file.id,
          questions: preview.questions,
        })
        .expect(201)
    ).body as ConfirmBody;

    const started = (
      await request(app.getHttpServer())
        .post(`/tests/${createdTest.testId}/start`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200)
    ).body as StartBody;

    await request(app.getHttpServer())
      .post(`/tests/${createdTest.testId}/finish`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        answers: started.questions.map((question) => {
          const correctVariant = question.variants.find((variant) =>
            isCorrectVariantText(question.text, variant.text),
          );

          if (!correctVariant) {
            throw new Error(
              `Correct variant not found for question "${question.text}"`,
            );
          }

          return {
            questionId: question.id,
            variantId: correctVariant.id,
          };
        }),
      })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/tests/${createdTest.testId}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/tests/${createdTest.testId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get('/tests')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([]);
      });

    await request(app.getHttpServer())
      .get(`/tests/${createdTest.testId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(404);

    expect(await prisma.test.count()).toBe(0);
    expect(await prisma.question.count()).toBe(0);
    expect(await prisma.variant.count()).toBe(0);
    expect(await prisma.attempt.count()).toBe(0);
    expect(await prisma.attemptAnswer.count()).toBe(0);
    expect(await prisma.uploadedFile.count()).toBe(0);
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

  it('removes preview images when the imported preview is discarded', async () => {
    const auth = await register('discard-preview@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'discard.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    const draftImageBuffer = Buffer.from('discard-preview-image');
    const draftImageHash = createHash('sha256')
      .update(draftImageBuffer)
      .digest('hex');
    const draftImageFileName = `${draftImageHash}.png`;
    const draftImagePath = join(
      IMPORTED_IMAGE_PREVIEW_STORAGE_PATH,
      preview.file.id,
      draftImageFileName,
    );

    await mkdir(join(IMPORTED_IMAGE_PREVIEW_STORAGE_PATH, preview.file.id), {
      recursive: true,
    });
    await writeFile(draftImagePath, draftImageBuffer);

    await request(app.getHttpServer())
      .delete(`/import/file-preview/${preview.file.id}`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(204);

    expect(await prisma.uploadedFile.count()).toBe(0);
    await expect(fileExists(draftImagePath)).resolves.toBe(false);
  });

  it('promotes preview image urls to permanent storage only after import confirm', async () => {
    const auth = await register('promote-preview@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'promote.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    const draftImageBuffer = Buffer.from('promote-preview-image');
    const draftImageHash = createHash('sha256')
      .update(draftImageBuffer)
      .digest('hex');
    const draftImageFileName = `${draftImageHash}.png`;
    const draftImageUrl = `${IMPORTED_IMAGE_PREVIEW_ROUTE_PREFIX}/${preview.file.id}/${draftImageFileName}`;
    const draftImagePath = join(
      IMPORTED_IMAGE_PREVIEW_STORAGE_PATH,
      preview.file.id,
      draftImageFileName,
    );
    const expectedPermanentImageUrl = `${IMPORTED_IMAGE_ROUTE_PREFIX}/${draftImageHash.slice(0, 2)}/${draftImageFileName}`;
    const expectedPermanentImagePath = join(
      IMPORTED_IMAGE_STORAGE_PATH,
      draftImageHash.slice(0, 2),
      draftImageFileName,
    );

    await mkdir(join(IMPORTED_IMAGE_PREVIEW_STORAGE_PATH, preview.file.id), {
      recursive: true,
    });
    await writeFile(draftImagePath, draftImageBuffer);

    const confirm = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({
          title: 'Promoted preview image test',
          sourceFileId: preview.file.id,
          questions: [
            {
              text: 'Choose the preview image',
              imageUrls: [draftImageUrl],
              variants: [
                {
                  text: 'Correct answer',
                  isCorrect: true,
                },
                {
                  text: 'Wrong answer',
                  isCorrect: false,
                },
              ],
            },
          ],
        })
        .expect(201)
    ).body as ConfirmBody;

    await request(app.getHttpServer())
      .get(`/tests/${confirm.testId}`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          questions: Array<{
            imageUrls?: string[];
          }>;
        };

        expect(body.questions[0].imageUrls).toEqual([expectedPermanentImageUrl]);
      });

    await expect(fileExists(draftImagePath)).resolves.toBe(false);
    await expect(fileExists(expectedPermanentImagePath)).resolves.toBe(true);
  });

  it('promotes absolute preview image urls to permanent storage on confirm', async () => {
    const auth = await register('promote-absolute-preview@example.com');

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .attach('file', Buffer.from(sampleRawText(), 'utf8'), {
          filename: 'promote-absolute.txt',
          contentType: 'text/plain',
        })
        .expect(200)
    ).body as PreviewBody;

    const draftImageBuffer = Buffer.from('promote-absolute-preview-image');
    const draftImageHash = createHash('sha256')
      .update(draftImageBuffer)
      .digest('hex');
    const draftImageFileName = `${draftImageHash}.png`;
    const absoluteDraftImageUrl = `http://localhost:3000${IMPORTED_IMAGE_PREVIEW_ROUTE_PREFIX}/${preview.file.id}/${draftImageFileName}`;
    const draftImagePath = join(
      IMPORTED_IMAGE_PREVIEW_STORAGE_PATH,
      preview.file.id,
      draftImageFileName,
    );
    const expectedPermanentImageUrl = `${IMPORTED_IMAGE_ROUTE_PREFIX}/${draftImageHash.slice(0, 2)}/${draftImageFileName}`;
    const expectedPermanentImagePath = join(
      IMPORTED_IMAGE_STORAGE_PATH,
      draftImageHash.slice(0, 2),
      draftImageFileName,
    );

    await mkdir(join(IMPORTED_IMAGE_PREVIEW_STORAGE_PATH, preview.file.id), {
      recursive: true,
    });
    await writeFile(draftImagePath, draftImageBuffer);

    const confirm = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({
          title: 'Promoted absolute preview image test',
          sourceFileId: preview.file.id,
          questions: [
            {
              text: 'Choose the preview image',
              imageUrls: [absoluteDraftImageUrl],
              variants: [
                {
                  text: 'Correct answer',
                  isCorrect: true,
                },
                {
                  text: 'Wrong answer',
                  isCorrect: false,
                },
              ],
            },
          ],
        })
        .expect(201)
    ).body as ConfirmBody;

    await request(app.getHttpServer())
      .get(`/tests/${confirm.testId}`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          questions: Array<{
            imageUrls?: string[];
          }>;
        };

        expect(body.questions[0].imageUrls).toEqual([expectedPermanentImageUrl]);
      });

    await expect(fileExists(draftImagePath)).resolves.toBe(false);
    await expect(fileExists(expectedPermanentImagePath)).resolves.toBe(true);
  });

  it('preserves question and variant image urls through preview, import, and start', async () => {
    const auth = await register('relative-images@example.com');
    const questionImageUrl = '/media/imported-tests/aa/question.png';
    const variantImageUrl = '/media/imported-tests/bb/variant.png';

    const preview = (
      await request(app.getHttpServer())
        .post('/import/file-preview')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .attach(
          'file',
          Buffer.from(
            `
<question> Choose the correct scheme
[[image:${questionImageUrl}]]
<variant> [[image:${variantImageUrl}]]
<variant> Text answer
`,
            'utf8',
          ),
          {
            filename: 'relative-images.txt',
            contentType: 'text/plain',
          },
        )
        .field('format', 'TAGGED_FIRST_CORRECT')
        .expect(200)
    ).body as PreviewBody;

    expect(preview.questions).toHaveLength(1);
    expect(preview.questions[0].imageUrls).toEqual([questionImageUrl]);
    expect(preview.questions[0].variants[0].imageUrls).toEqual([
      variantImageUrl,
    ]);

    const confirm = (
      await request(app.getHttpServer())
        .post('/import/confirm')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({
          title: 'Relative image test',
          sourceFileId: preview.file.id,
          questions: preview.questions,
        })
        .expect(201)
    ).body as ConfirmBody;

    const detail = await request(app.getHttpServer())
      .get(`/tests/${confirm.testId}`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200);
    const detailBody = detail.body as {
      questions: Array<{
        imageUrls?: string[];
        variants: Array<{
          imageUrls?: string[];
        }>;
      }>;
    };

    expect(detailBody.questions[0].imageUrls).toEqual([questionImageUrl]);
    expect(detailBody.questions[0].variants[0].imageUrls).toEqual([
      variantImageUrl,
    ]);

    const started = (
      await request(app.getHttpServer())
        .post(`/tests/${confirm.testId}/start`)
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200)
    ).body as StartBody;

    expect(started.questions[0].imageUrls).toEqual([questionImageUrl]);
    expect(
      started.questions[0].variants.some(
        (variant) =>
          Array.isArray(variant.imageUrls) &&
          variant.imageUrls.includes(variantImageUrl),
      ),
    ).toBe(true);
  });

  it('rate limits repeated login attempts from the same client', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'missing-user@example.com',
          password: 'strongPassword123',
        })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'missing-user@example.com',
        password: 'strongPassword123',
      })
      .expect(429)
      .expect((response) => {
        const body = response.body as { message?: string | string[] };
        expect(response.headers['retry-after']).toBeDefined();
        expect(String(body.message)).toContain(
          'Too many authentication attempts',
        );
      });
  });

  it('blocks unsafe browser-originated cross-site POST requests', async () => {
    await request(app.getHttpServer())
      .post('/public/tests/00000000-0000-4000-8000-000000000001/start')
      .set('Origin', 'http://evil.example')
      .expect(403)
      .expect((response) => {
        const body = response.body as { message?: string };
        expect(body.message).toBe('Cross-site unsafe requests are not allowed');
      });
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
    await cleanImportedImages();
  }

  async function cleanImportedImages(): Promise<void> {
    await rm(IMPORTED_IMAGE_STORAGE_PATH, {
      recursive: true,
      force: true,
    });
  }

  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
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

  function isCorrectVariantText(
    questionText: string,
    variantText: string,
  ): boolean {
    if (questionText.includes('HTTP')) {
      return variantText === 'Hypertext transfer protocol';
    }

    if (questionText.includes('CSS')) {
      return variantText === 'Style language';
    }

    return false;
  }
});
