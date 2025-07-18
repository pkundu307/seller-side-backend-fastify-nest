// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, JwtAuthGuard,AuthService],
  exports: [PassportModule, JwtStrategy, JwtAuthGuard],   // 👈 export them
})
export class AuthModule {}
