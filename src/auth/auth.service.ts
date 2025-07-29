import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomerUserService } from '../customer-user/customer-user.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { AuthSource, CustomerType, CustomerUser } from '@prisma/client';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private customerUserService: CustomerUserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
    );
  }

  private createToken(user: CustomerUser) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.type, // Maps the 'type' from db to 'role' in JWT
    };
    return {
      token: this.jwtService.sign(payload),
      name: user.name,
      role: user.type,
    };
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    const existingUser = await this.customerUserService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.customerUserService.create({
      name,
      email,
      password: hashedPassword,
      authSource: AuthSource.self,
      type: CustomerType.user, // Default type
    });

    return this.createToken(user);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.customerUserService.findByEmail(email);

    if (!user || !user.password) {
      // Deny login if user signed up with Google or doesn't exist
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createToken(user);
  }

  async googleLogin(googleLoginDto: GoogleLoginDto) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleLoginDto.googleToken,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      let user = await this.customerUserService.findByEmail(payload.email);

      // If user doesn't exist, create a new one
      if (!user) {
        user = await this.customerUserService.create({
          email: payload.email,
          name: payload.name || 'Google User',
          picture: payload.picture,
          authSource: AuthSource.google,
          type: CustomerType.user,
        });
      }

      return this.createToken(user);
    } catch (error) {
      console.error('Google Login Error:', error);
      throw new InternalServerErrorException('Google authentication failed');
    }
  }
}