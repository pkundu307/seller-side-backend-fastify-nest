// src/homepage/homepage.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HomepageService } from './homepage.service';
import { HomepageController } from './homepage.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [HomepageController],
  providers: [HomepageService],
  exports: [HomepageService], // Exporting for use in HomepageAdminService
})
export class HomepageModule {}