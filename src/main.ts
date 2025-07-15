import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import multipart from '@fastify/multipart'; // <-- Use 'multipart' as the import name for clarity

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // 1. Use NestJS's built-in CORS handling
  // This is the platform-agnostic and recommended way.
  app.enableCors({
    origin:'http://localhost:5173', // For development. In production, list specific domains.
    credentials: true,
  });

  // 2. Register Fastify plugins
  // It's good practice to include limits for security.
  app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB file size limit
      files: 5, // Max number of files
    },
  });

  // 3. Apply global pipes
  app.useGlobalPipes(new ValidationPipe());
  
  // 4. Configure Swagger with JWT Bearer Authentication
  // This will add an "Authorize" button to your Swagger UI.
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('NestJS Fastify API with Prisma and PostgreSQL')
    .setVersion('1.0')
    .addTag('products') // Changed tag to 'products' to match your endpoint
    .addTag('users')
    .addBearerAuth() // <-- This is the key for JWT support in Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 5. Start the application
  await app.listen(3000, '0.0.0.0'); // Listen on all network interfaces
}
bootstrap();