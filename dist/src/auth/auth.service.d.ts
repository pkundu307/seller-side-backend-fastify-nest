import { JwtService } from '@nestjs/jwt';
import { CustomerUserService } from '../customer-user/customer-user.service';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from 'src/notifications/notifications.service';
export declare class AuthService {
    private customerUserService;
    private jwtService;
    private readonly notificationService;
    private configService;
    private googleClient;
    constructor(customerUserService: CustomerUserService, jwtService: JwtService, notificationService: NotificationService, configService: ConfigService);
    private createToken;
    register(registerDto: RegisterDto): Promise<{
        token: string;
        name: string;
        role: import(".prisma/client").$Enums.CustomerType;
    }>;
    login(loginDto: LoginDto): Promise<{
        token: string;
        name: string;
        role: import(".prisma/client").$Enums.CustomerType;
    }>;
    googleLogin(googleLoginDto: GoogleLoginDto): Promise<{
        token: string;
        name: string;
        role: import(".prisma/client").$Enums.CustomerType;
    }>;
}
