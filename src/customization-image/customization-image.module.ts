import { Module, ValidationPipe } from '@nestjs/common';
import { PredefinedAssetsService } from './predefined-assets.service';
import { PredefinedAssetsController } from './customization-image.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from '../products/utils/s3Service'; // Adjust path if needed
import { GenericImageService } from './generic-image.service';
import { GenericImageController } from './generic-image.controller';
import { UserPredefinedAssetsController } from './customization-image-for-user.controller';

@Module({
  imports: [PrismaModule], // Import PrismaModule to use PrismaService
  controllers: [PredefinedAssetsController,GenericImageController,UserPredefinedAssetsController],
  providers: [
    PredefinedAssetsService, 
    GenericImageService,
    S3Service, // Provide S3Service so it can be injected
    ValidationPipe, // Provide ValidationPipe for manual validation in controller
  ],
})
export class CustomizationImageModule {}