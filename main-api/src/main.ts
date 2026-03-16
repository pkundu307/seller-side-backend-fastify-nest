import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }), // NestJS Logger is used; disable Fastify's duplicate logger
  );

  // ── 1. Global Exception Filter ───────────────────────────────────────────
  // Catches ALL unhandled errors — HttpExceptions, Prisma errors, and
  // unexpected 500s — and returns a clean { success, statusCode, message }
  // response. Raw stack traces are never sent to the client.
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── 2. CORS ──────────────────────────────────────────────────────────────
  // Dev: reflect any origin (same as before).
  // Prod: restrict to CORS_ORIGINS env var (comma-separated list of domains).
  //   Example .env:  CORS_ORIGINS=https://shop.example.com,https://admin.example.com
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isProduction
      ? (origin, callback) => {
          // Allow server-to-server calls (no origin) and listed domains
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS: origin '${origin}' not allowed`), false);
          }
        }
      : true, // dev: reflect any origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  // ── 3. Multipart (file uploads) ──────────────────────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 5,
    },
  });

  // ── 4. Global Validation Pipe ────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // strip unknown fields
      forbidNonWhitelisted: true,  // reject requests with unknown fields
      transform: true,             // auto-cast payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── 5. Swagger (dev only) ────────────────────────────────────────────────
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Jottosop APIs')
      .setDescription('NestJS Fastify API with Prisma and PostgreSQL')
      .setVersion('1.1')
      .addTag('products')
      .addTag('users')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // ── 6. Start ─────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Server running on http://0.0.0.0:${port}`);

  if (!isProduction) {
    logger.log(`📖 Swagger docs at http://localhost:${port}/api`);
  }
}

bootstrap();