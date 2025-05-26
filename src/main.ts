import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import fastifyMultipart from '@fastify/multipart';
import cors from '@fastify/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  await app.register(cors, {
    origin: '*', // frontend origin (e.g., Vite dev server)
    credentials: true,               // if you're using cookies or Authorization headers
  });
  app.useGlobalPipes(new ValidationPipe());
  app.register(fastifyMultipart); 
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('NestJS Fastify API with Prisma and PostgreSQL')
    .setVersion('1.0')
    .addTag('users')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger at /api

  await app.listen(3000);
}
bootstrap();
