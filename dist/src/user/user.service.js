"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = require("bcrypt");
const client_1 = require("@prisma/client");
const jwt_1 = require("@nestjs/jwt");
let UserService = class UserService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async create(createUserDto) {
        const saltRounds = 10;
        console.log('--- INSIDE SERVICE ---', createUserDto);
        console.log('--- PASSWORD PROPERTY ---', createUserDto.password);
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        console.log(hashedPassword);
        try {
            const user = await this.prisma.user.create({
                data: {
                    email: createUserDto.email,
                    name: createUserDto.name,
                    password: hashedPassword,
                },
                select: {
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true,
                },
            });
            return user;
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new common_1.ConflictException(`User with email "${createUserDto.email}" already exists.`);
            }
            console.error('Failed to create user:', error);
            throw new common_1.InternalServerErrorException('Could not create user.');
        }
    }
    async loginUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        console.log(user);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }
    async getUserProfile(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            });
            if (!user)
                throw new Error('User not found');
            return user;
        }
        catch (error) {
            throw new Error('Failed to fetch user profile');
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], UserService);
//# sourceMappingURL=user.service.js.map