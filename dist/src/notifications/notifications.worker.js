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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationWorker = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationWorker = class NotificationWorker {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleCreateCustomerNotification(data) {
        console.log('Received new customer notification job:', data.title);
        await this.prisma.customerNotification.create({
            data: {
                customerUserId: data.customerUserId,
                title: data.title,
                message: data.message,
                type: data.type,
                metadata: data.metadata,
            },
        });
    }
    async handleCreateSellerNotification(data) {
        console.log('Received new seller notification job:', data.title);
        await this.prisma.sellerNotification.create({
            data: {
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                metadata: data.metadata,
            },
        });
    }
};
exports.NotificationWorker = NotificationWorker;
__decorate([
    (0, microservices_1.MessagePattern)('notification_create_customer'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationWorker.prototype, "handleCreateCustomerNotification", null);
__decorate([
    (0, microservices_1.MessagePattern)('notification_create_seller'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationWorker.prototype, "handleCreateSellerNotification", null);
exports.NotificationWorker = NotificationWorker = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationWorker);
//# sourceMappingURL=notifications.worker.js.map