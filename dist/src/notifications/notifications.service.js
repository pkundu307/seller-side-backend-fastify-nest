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
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let NotificationService = class NotificationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleDestroy() {
    }
    async createForCustomer(user, title, message, type = client_1.NotificationType.SYSTEM, metadata) {
        const notification = await this.prisma.customerNotification.create({
            data: { customerUserId: user.id, title, message, type, metadata },
        });
        const payload = {
            recipientId: user.id,
            recipientEmail: user.email,
            recipientType: 'customer',
            notificationId: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            metadata: notification.metadata,
        };
        return notification;
    }
    async createForSeller(user, title, message, type = client_1.NotificationType.SYSTEM, metadata) {
        const notification = await this.prisma.sellerNotification.create({
            data: { userId: user.id, title, message, type, metadata },
        });
        const payload = {
            recipientId: user.id,
            recipientEmail: user.email,
            recipientType: 'seller',
            notificationId: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            metadata: notification.metadata,
        };
        return notification;
    }
    async findForCustomer(customerUserId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await this.prisma.$transaction([
            this.prisma.customerNotification.findMany({
                where: { customerUserId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.customerNotification.count({ where: { customerUserId } }),
        ]);
        return {
            notifications,
            pagination: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async findForSeller(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [notifications, total] = await this.prisma.$transaction([
            this.prisma.sellerNotification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.sellerNotification.count({ where: { userId } }),
        ]);
        return {
            notifications,
            pagination: {
                total,
                page,
                limit,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notifications.service.js.map