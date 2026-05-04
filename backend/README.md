# Test Prep Platform Backend MVP

NestJS backend for a test-preparation MVP: upload a teacher-provided TXT, DOCX, or text-based PDF file, extract text, preview parsed questions, confirm import, and pass the generated test.

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma ORM 7
- JWT auth + bcrypt
- Multer file upload
- TXT/DOCX/PDF text extraction
- class-validator / class-transformer
- Swagger/OpenAPI

## Project Structure

```text
src/
  auth/       register, login, me
  users/      user persistence helpers
  prisma/     Prisma client provider
  files/      upload validation and text extraction
  import/     file-preview and confirm endpoints
  parser/     regex/parser-based question parsing
  tests/      user-owned test list/detail
  attempts/   start, check-answer, finish
  common/     guards, decorators, auth types
prisma/
  schema.prisma
```

## Setup

```bash
npm install
copy .env.example .env
docker compose up -d postgres
npx prisma migrate dev --name init
npm run start:dev
```

Local URLs:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

## Environment

```env
DATABASE_URL="postgresql://testprep:testprep@localhost:5432/testprep?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1d"
PORT=3000
RAW_IMPORT_MAX_CHARS=100000
MAX_UPLOAD_FILE_SIZE_BYTES=10485760
```

## Upload Preview

```http
POST /import/file-preview
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form fields:

- `file`: required, `.txt`, `.docx`, or `.pdf`
- `title`: optional
- `format`: optional, defaults to `AUTO`

Supported parser formats:

- `AUTO`: detects `<question>/<variant>` or `(!)/(?)`, otherwise uses `STANDARD`
- `STANDARD`: numbered questions with `A)`, `A.`, cyrillic markers, numeric markers, `*`, answer lines
- `PARENS_MARKERS`: variants marked as `(!)` correct and `(?)` incorrect
- `TAGGED_FIRST_CORRECT`: `<question>` and `<variant>` lines, first variant is correct
- `FIRST_VARIANT_CORRECT`: standard numbered format, first variant is correct when no marker is present

Limits:

- Max file size: 10MB
- PDF must contain selectable text
- No OCR for scanned PDFs
- Max extracted text length defaults to `100000` characters

## Question Formats

Standard with `*`:

```text
1. What is HTTP?
A) Hypertext transfer protocol *
B) Programming language
C) Database
```

Standard with answer line:

```text
1. What is HTTP?
A. Hypertext transfer protocol
B. Programming language
Answer: A
```

Teacher marker format:

```text
1. Inductance unit
(!) Henry
(?) Volt
(?) Ohm
```

Tag format where the first variant is correct:

```text
<question> Which Java type stores integers
<variant> int
<variant> float
<variant> double
```

First-variant-correct numbered format:

```text
1. Which Java type stores integers?
A) int
B) float
C) double
```

Parser warnings are returned for missing correct answers, fewer than 2 variants, multiple correct answers, or poorly recognized text.

## API Examples

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "strongPassword123"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "strongPassword123"
}
```

Use `accessToken` as `Bearer <token>`.

### Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

### File Preview

In Postman/Insomnia choose `multipart/form-data`:

```text
file: sample-test.docx
title: Networking basics
format: AUTO
```

Response:

```json
{
  "file": {
    "id": "uploaded-file-id",
    "originalName": "sample-test.docx",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "size": 12345
  },
  "title": "Networking basics",
  "format": "AUTO",
  "questionsFound": 20,
  "validQuestions": 18,
  "invalidQuestions": 2,
  "questions": [],
  "warnings": []
}
```

### Confirm Import

```http
POST /import/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Networking basics",
  "sourceFileId": "uploaded-file-id",
  "questions": [
    {
      "text": "What is HTTP?",
      "variants": [
        { "text": "Hypertext transfer protocol", "isCorrect": true },
        { "text": "Programming language", "isCorrect": false }
      ]
    }
  ]
}
```

Response:

```json
{
  "testId": "test-id",
  "title": "Networking basics",
  "questionsCount": 1
}
```

### List Tests

```http
GET /tests
Authorization: Bearer <token>
```

### Get Test

```http
GET /tests/:id
Authorization: Bearer <token>
```

### Start Test

```http
POST /tests/:id/start
Authorization: Bearer <token>
```

### Check Answer

```http
POST /tests/:id/check-answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "questionId": "question-id",
  "variantId": "variant-id"
}
```

### Finish Test

```http
POST /tests/:id/finish
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": [
    {
      "questionId": "question-id",
      "variantId": "variant-id"
    }
  ]
}
```

Response:

```json
{
  "score": 16,
  "total": 20,
  "percent": 80
}
```

## Testing

```bash
npm run lint
npm run build
npm run test
```

E2E tests require PostgreSQL:

```bash
docker compose up -d postgres
npx prisma db push
npm run test:e2e
```

## MVP Limitations

- No OCR for scanned PDFs
- No AI parsing
- Single-choice questions only
- Confirm import rejects malformed submitted questions
- File processing is in-memory for MVP
- No frontend, payments, roles, or advanced stats
