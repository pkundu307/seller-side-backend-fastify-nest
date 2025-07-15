// src/keep-alive.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class KeepAliveService {
  constructor(private prisma: PrismaService) {}

  @Cron('*/4 * * * *') // every 4 minutes
  async keepDbAlive() {
    try {
      await this.prisma.user.findMany(); // simple DB call
      console.log('✅ DB ping successful');
    } catch (err) {
      console.error('❌ DB keep-alive failed:', err.message);
    }
  }
}
