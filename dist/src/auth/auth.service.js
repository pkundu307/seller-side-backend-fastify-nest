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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const customer_user_service_1 = require("../customer-user/customer-user.service");
const bcrypt = require("bcrypt");
const google_auth_library_1 = require("google-auth-library");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../notifications/notifications.service");
let AuthService = class AuthService {
    customerUserService;
    jwtService;
    notificationService;
    configService;
    googleClient;
    constructor(customerUserService, jwtService, notificationService, configService) {
        this.customerUserService = customerUserService;
        this.jwtService = jwtService;
        this.notificationService = notificationService;
        this.configService = configService;
        this.googleClient = new google_auth_library_1.OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
    }
    createToken(user) {
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.type,
        };
        return {
            token: this.jwtService.sign(payload),
            name: user.name,
            role: user.type,
        };
    }
    async register(registerDto) {
        const { name, email, password } = registerDto;
        const existingUser = await this.customerUserService.findByEmail(email);
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.customerUserService.create({
            name,
            email,
            password: hashedPassword,
            authSource: client_1.AuthSource.self,
            type: client_1.CustomerType.user,
        });
        await this.notificationService.createForCustomer(user, 'Welcome to Jottosop!', 'We are excited to have you. Explore our amazing collection and enjoy your shopping experience.', client_1.NotificationType.SYSTEM);
        return this.createToken(user);
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.customerUserService.findByEmail(email);
        if (!user || !user.password) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordMatching = await bcrypt.compare(password, user.password);
        if (!isPasswordMatching) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return this.createToken(user);
    }
    async googleLogin(googleLoginDto) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: googleLoginDto.googleToken,
                audience: this.configService.get('GOOGLE_CLIENT_ID'),
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                throw new common_1.UnauthorizedException('Invalid Google token');
            }
            let user = await this.customerUserService.findByEmail(payload.email);
            if (!user) {
                user = await this.customerUserService.create({
                    email: payload.email,
                    name: payload.name || 'Google User',
                    picture: payload.picture,
                    authSource: client_1.AuthSource.google,
                    type: client_1.CustomerType.user,
                });
                await this.notificationService.createForCustomer(user, 'Welcome to Jottosop!', 'We are excited to have you. Explore our amazing collection and enjoy your shopping experience.', client_1.NotificationType.SYSTEM);
            }
            return this.createToken(user);
        }
        catch (error) {
            console.error('Google Login Error:', error);
            throw new common_1.InternalServerErrorException('Google authentication failed');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [customer_user_service_1.CustomerUserService,
        jwt_1.JwtService,
        notifications_service_1.NotificationService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map