// src/auth/auth.controller.ts
import { Body, Controller, Post, Get, UseGuards, Request, HttpCode, HttpStatus, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { auth } from 'google-auth-library';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    console.log(registerDto);
    
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK) // Set status to 200 OK for login
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('google-login')
  googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtectedData(@Request() req) {
    // req.user is populated by the JwtStrategy's validate method
    return {
      message: 'This is a protected route.',
      user: req.user,
    };
  }

    @Get('introspect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate token and get fresh user details' })
  @ApiResponse({ status: 200, description: 'Returns user profile and new token.' })
  introspect(@Req() req) {
    // req.user is populated by JwtAuthGuard (the decoded JWT payload)
    return this.authService.introspect(req.user);
  }
   @Post('refresh')
  @ApiOperation({ summary: 'Renew access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      // We manually decode the refresh token to get the user ID and type
      // Alternatively, you can create a second JwtStrategy specifically for refresh tokens
      const decoded = await this.authService['jwtService'].verifyAsync(dto.refreshToken, {
        secret: this.authService['configService'].get('JWT_REFRESH_SECRET') || 'refresh_secret_key',
      });
      
      return this.authService.refreshTokens(decoded.sub, dto.refreshToken, decoded.userType);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
  @Post('forgot-password')
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 per minute  
@HttpCode(HttpStatus.OK)
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  return this.authService.forgotPassword(dto);
}

@Post('reset-password')
@HttpCode(HttpStatus.OK)
async resetPassword(@Body() dto: ResetPasswordDto) {
  return this.authService.resetPassword(dto);
}
}