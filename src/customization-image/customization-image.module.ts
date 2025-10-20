import { Module, ValidationPipe } from '@nestjs/common';
import { CustomizationImageService } from './customization-image.service';
import { CustomizationImageController } from './customization-image.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from '../products/utils/s3Service'; // Adjust path if needed

@Module({
  imports: [PrismaModule], // Import PrismaModule to use PrismaService
  controllers: [CustomizationImageController],
  providers: [
    CustomizationImageService, 
    S3Service, // Provide S3Service so it can be injected
    ValidationPipe, // Provide ValidationPipe for manual validation in controller
  ],
})
export class CustomizationImageModule {}