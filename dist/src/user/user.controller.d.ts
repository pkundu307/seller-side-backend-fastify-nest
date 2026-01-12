import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { FastifyRequest } from 'fastify';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    register(createUserDto: CreateUserDto): Promise<{
        email: string;
        role: string;
        name: string | null;
        createdAt: Date;
    }>;
    login(loginUserDto: LoginUserDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: string;
        };
    }>;
    getProfile(req: FastifyRequest): Promise<{
        id: string;
        email: string;
        role: string;
        name: string | null;
    }>;
}
