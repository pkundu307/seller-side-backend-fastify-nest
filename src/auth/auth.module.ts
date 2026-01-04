// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { CustomerUserModule } from 'src/customer-user/customer-user.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    CustomerUserModule,
    NotificationsModule, // <-- MOVED HERE to the main imports array
    JwtModule.registerAsync({
      imports: [ConfigModule], // NotificationsModule is not needed here
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '90h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, JwtAuthGuard, AuthService],
  exports: [PassportModule, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}