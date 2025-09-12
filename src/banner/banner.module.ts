import { Module } from '@nestjs/common';
import { BannersController } from './banner.controller';
import { BannersService } from './banner.service';
// You likely have a shared PrismaModule you can import
// import { PrismaModule } from '../prisma/prisma.module';

@Module({
  // imports: [PrismaModule], // If you have a PrismaModule
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannerModule {}
