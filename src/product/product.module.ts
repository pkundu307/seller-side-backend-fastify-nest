// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsController } from './product.controller';
import { ProductsService } from './product.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from './utils/S3Service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],   // 👈 add AuthModule
  controllers: [ProductsController],
  providers: [ProductsService, S3Service],
})
export class ProductModule {}
