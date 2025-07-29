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

@Module({
  imports: [PassportModule,ConfigModule,CustomerUserModule,JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '60m' }, // Token expires in 60 minutes
      }),
    }),],
      controllers: [AuthController],

  providers: [JwtStrategy, JwtAuthGuard,AuthService],
  exports: [PassportModule, JwtStrategy, JwtAuthGuard],   // 👈 export them
})
export class AuthModule {}
