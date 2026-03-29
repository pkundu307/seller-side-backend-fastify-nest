// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    PrismaModule,
    JwtModule.register({
      secret: 'prasanna', // or process.env.JWT_SECRET
      signOptions: { expiresIn: '100h' },
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Optional, if needed elsewhere
})
export class UserModule {}
