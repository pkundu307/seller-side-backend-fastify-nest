import { Module } from '@nestjs/common';
import { HomepageAdminService } from './homepage-admin.service';
import { HomepageAdminController } from './homepage-admin.controller';
import { S3Service } from 'src/products/utils/s3Service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HomepageModule } from 'src/homepage/homepage.module';
@Module({
    imports: [PrismaModule, HomepageModule], // <-- ADD HERE

  controllers: [HomepageAdminController],
  providers: [HomepageAdminService,S3Service],
})
export class HomepageAdminModule {}
