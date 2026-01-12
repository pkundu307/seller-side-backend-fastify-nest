import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    getProtectedData(req: any): {
        message: string;
        user: any;
    };
}
