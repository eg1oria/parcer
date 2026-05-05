FROM node:22-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder

WORKDIR /app
ARG DATABASE_URL=postgresql://testprep:testprep@localhost:5432/testprep?schema=public
ENV DATABASE_URL=${DATABASE_URL}
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm run prisma:generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
ARG DATABASE_URL=postgresql://testprep:testprep@localhost:5432/testprep?schema=public
ENV DATABASE_URL=${DATABASE_URL}
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm run prisma:generate
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
