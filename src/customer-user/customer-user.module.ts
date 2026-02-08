import { Module } from '@nestjs/common';
import { CustomerUserService } from './customer-user.service';
import { CustomerUserController } from './customer-user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from '../products/utils/s3Service'; // <--- Import S3Service

@Module({
  imports: [PrismaModule], 
  controllers: [CustomerUserController],
  providers: [
    CustomerUserService, 
    S3Service // <--- Add S3Service as a provider
  ], 
  exports: [CustomerUserService], 
})
export class CustomerUserModule {}