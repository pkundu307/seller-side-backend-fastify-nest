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
import { AuthSource, CustomerType, CustomerUser, NotificationType } from '@prisma/client';
import { NotificationService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service'; // <--- IMPORT THIS

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private customerUserService: CustomerUserService,
    private jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private configService: ConfigService,
    private prisma: PrismaService, // <--- INJECT THIS
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
    );
  }

  // --- Helper to Standardize Payload ---
  private createToken(user: any, userType: 'CUSTOMER' | 'SELLER') {
    const payload = {
      email: user.email,
      sub: user.id,
      role: userType === 'CUSTOMER' ? user.type : user.role, // Handle different field names
      userType: userType, // Store type in token for easier future checks
    };
    return {
      token: this.jwtService.sign(payload),
      name: user.name,
      role: payload.role,
      type: userType
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
      type: CustomerType.user,
    });
    
    await this.notificationService.createForCustomer(
      user,
      'Welcome to Jottosop!',
      'We are excited to have you. Explore our amazing collection and enjoy your shopping experience.',
      NotificationType.SYSTEM,
    );
    const tokens = await this.getTokens(user.id, user.email, user.type, 'CUSTOMER');
    await this.updateRefreshToken(user.id, tokens.refreshToken, 'CUSTOMER');
    
    return {
      ...tokens,
      user: { 
        name: user.name, 
        role: user.type, 
        type: 'CUSTOMER' 
      }
    };
  }

  
async login(loginDto: LoginDto) {
  const { email, password } = loginDto;
  
  let user: any = null;
  let type: 'CUSTOMER' | 'SELLER' | null = null; // Initialize as null

  // 1. Try Customer Login
  const customer = await this.customerUserService.findByEmail(email);
  if (customer && customer.password && await bcrypt.compare(password, customer.password)) {
    user = customer;
    type = 'CUSTOMER';
  } 

  // 2. If not a customer, try Seller/Admin Login
  if (!user) {
    const seller = await this.prisma.user.findUnique({ where: { email } });
    if (seller && seller.password && await bcrypt.compare(password, seller.password)) {
      user = seller;
      type = 'SELLER';
    }
  }

  // 3. Strict Check: If neither found, throw exception immediately
  // This satisfies TypeScript that 'user' and 'type' are NOT null after this line
  if (!user || !type) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // 4. Now generate tokens (TypeScript now knows 'type' is either 'CUSTOMER' or 'SELLER')
  const tokens = await this.getTokens(
    user.id, 
    user.email, 
    type === 'CUSTOMER' ? user.type : user.role, 
    type
  );

  await this.updateRefreshToken(user.id, tokens.refreshToken, type);

  return {
    ...tokens,
    user: { 
      name: user.name, 
      role: type === 'CUSTOMER' ? user.type : user.role, 
      type 
    }
  };
}

  private async getTokens(userId: string, email: string, role: string, userType: 'CUSTOMER' | 'SELLER') {
    const payload = { sub: userId, email, role, userType };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1h', // Access token is short-lived
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'refresh_secret_key',
        expiresIn: '7d', // Refresh token is long-lived
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // 2. New Helper to hash and save Refresh Token to DB
  private async updateRefreshToken(userId: string, refreshToken: string, userType: 'CUSTOMER' | 'SELLER') {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    if (userType === 'CUSTOMER') {
      await this.prisma.customerUser.update({
        where: { id: userId },
        data: { refreshToken: hashedToken },
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: hashedToken },
      });
    }
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

      // 1. If user doesn't exist, create a new Customer
      if (!user) {
        user = await this.customerUserService.create({
          email: payload.email,
          name: payload.name || 'Google User',
          picture: payload.picture,
          authSource: AuthSource.google,
          type: CustomerType.user,
        });

        await this.notificationService.createForCustomer(
          user,
          'Welcome to Jottosop!',
          'We are excited to have you.',
          NotificationType.SYSTEM,
        );
      }

      // 2. Generate BOTH Tokens (Access + Refresh)
      // Since Google Login currently only supports CUSTOMER type in your code:
      const tokens = await this.getTokens(
        user.id, 
        user.email, 
        user.type, // Customer role
        'CUSTOMER'
      );

      // 3. Save the hashed Refresh Token to the database
      await this.updateRefreshToken(user.id, tokens.refreshToken, 'CUSTOMER');

      // 4. Return unified response
      return {
        ...tokens,
        user: { 
          name: user.name, 
          role: user.type, 
          type: 'CUSTOMER' 
        }
      };

    } catch (error) {
      console.error('Google Login Error:', error);
      throw new InternalServerErrorException('Google authentication failed');
    }
  }
  // --- NEW INTROSPECT METHOD ---
  async introspect(userPayload: any) {
    // 1. Safe Extraction: Check for 'sub', 'id', or 'userId' to be safe
    const userId = userPayload.sub || userPayload.id || userPayload.userId;

    if (!userId) {
      console.error('Introspect Failed: No User ID in payload', userPayload);
      throw new UnauthorizedException('Invalid token: User ID missing');
    }

    // 2. Check Customer Table
    const customer = await this.prisma.customerUser.findUnique({
      where: { id: userId },
    });

    if (customer) {
      // Regenerate Token
      const tokenResponse = this.createToken(customer, 'CUSTOMER');
      return {
        user: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          picture: customer.picture,
          type: 'CUSTOMER',
          role: customer.type, 
        },
        token: tokenResponse.token
      };
    }

    // 3. Check Seller/User Table
    const seller = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        staffProfile: { include: { role: { include: { permissions: true } } } } 
      }
    });

    if (seller) {
      const tokenResponse = this.createToken(seller, 'SELLER');
      
      const permissions = seller.staffProfile?.role?.permissions.map(p => p.action + ':' + p.subject) || [];

      return {
        user: {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          type: 'SELLER',
          role: seller.role,
          permissions: permissions
        },
        token: tokenResponse.token
      };
    }

    // 4. If neither found
    throw new UnauthorizedException('User no longer exists or account is disabled.');
  }

    async refreshTokens(userId: string, refreshToken: string, userType: 'CUSTOMER' | 'SELLER') {
    let user: any;
    if (userType === 'CUSTOMER') {
      user = await this.prisma.customerUser.findUnique({ where: { id: userId } });
    } else {
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    }

    if (!user || !user.refreshToken) throw new UnauthorizedException('Access Denied');

    // Compare the provided refresh token with the hashed one in DB
    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) throw new UnauthorizedException('Access Denied');

    // Generate new tokens
    const tokens = await this.getTokens(user.id, user.email, userType === 'CUSTOMER' ? user.type : user.role, userType);
    await this.updateRefreshToken(user.id, tokens.refreshToken, userType);

    return tokens;
  }

}