import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // 1. CORS Configuration (Your setup is fine for development)
  // For production, you should restrict this to your frontend's domain.
  app.enableCors({
    origin: true, // Reflects the request origin. More flexible than '*' for credentials.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Explicitly allow PATCH
    allowedHeaders: 'Content-Type, Accept, Authorization', // Explicitly allow Authorization
    credentials: true,
  });

  // 2. Fastify Multipart Plugin (Your setup is excellent)
  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 5 MB
      files: 5,
    },
    // attachFieldsToBody: true 
  });

  // 3. CORRECTED: Apply global pipes with full configuration
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);

  // 4. Swagger Configuration (Your setup is perfect)
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('NestJS Fastify API with Prisma and PostgreSQL')
    .setVersion('1.0')
    .addTag('products')
    .addTag('users')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 5. Passport (Your commented-out lines are correct for JWT)
  // With a JWT strategy, you do not need to register passport as middleware here.
  // The AuthModule and PassportStrategy handle it.
 const port = process.env.PORT || 3001;
  // 6. Start the application
  await app.listen(port, '0.0.0.0'); 
}
bootstrap();