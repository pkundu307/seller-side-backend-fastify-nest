import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
export declare class UserService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    create(createUserDto: CreateUserDto): Promise<{
        email: string;
        role: string;
        name: string | null;
        createdAt: Date;
    }>;
    loginUser(email: string, password: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: string;
        };
    }>;
    getUserProfile(userId: string): Promise<{
        id: string;
        email: string;
        role: string;
        name: string | null;
    }>;
}
