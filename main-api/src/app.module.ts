// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-ioredis-yet';

import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CheckModule } from './check/check.module';
import { KeepAliveModule } from './utils/keep-alive.module';
import { KeepAliveService } from './utils/keep-alive.service';
import { CategoryModule } from './category/category.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { BusinessModule } from './business/business.module';
import { ProductsModule } from './products/products.module';
import { CustomerUserModule } from './customer-user/customer-user.module';
import { CustomerModule } from './customer/customer.module';
import { AttributesModule } from './attributes/attributes.module';
import { AdminModule } from './admin/admin.module';
import { BannerModule } from './banner/banner.module';
import { CartModule } from './cart/cart.module';
import { CustomizationImageModule } from './customization-image/customization-image.module';
import { ProductSearchModule } from './product-search/product-search.module';
import { OrderModule } from './order/order.module';
import { HomepageAdminModule } from './homepage-admin/homepage-admin.module';
import { HomepageModule } from './homepage/homepage.module';
import { PaymentModule } from './payment/payment.module';
import { CouponModule } from './coupon/coupon.module';
import { SellerModule } from './seller/seller.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SeoModule } from './seo/seo.module';
import { BankCashChequeModule } from './bank-cash-cheque/bank-cash-cheque.module';
import { QuotationModule } from './seller/quotation/quotation.module';
import { ProformaInvoiceModule } from './seller/proforma-invoice/proforma-invoice.module';

@Module({
  imports: [
    // ── Core infra ───────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    // ── Rate limiting ────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },
      { name: 'medium', ttl: 10000, limit: 50  },
      { name: 'long',   ttl: 60000, limit: 200 },
    ]),

    // ── Redis Cache ──────────────────────────────────────────────────────
    // cache-manager-ioredis-yet v7: store must be AWAITED in useFactory.
    // Passing it as a reference (store: redisStore) silently falls back to
    // in-memory, which is why KEYS * returns empty in Redis.
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', '127.0.0.1');
        const port = configService.get<number>('REDIS_PORT', 6379);

        console.log(`🚀 [REDIS] Connecting to ${host}:${port}`);

        // ✅ MUST await redisStore() — calling it as a factory, not a reference
     const store = await redisStore({
  socket: {
    host:   host,
    port:   Number(port),
    family: 4,      // force IPv4, prevents ::1 fallback
  },
  ttl: 86400,
});

        // Wire up error logging on the underlying ioredis client
        store.client.on('connect', () =>
          console.log(`✅ [REDIS] Connected to ${host}:${port}`),
        );
        store.client.on('error', (err) =>
          console.error('❌ [REDIS] Client error:', err),
        );

        return { store };
      },
    }),

    // ── Data layer ───────────────────────────────────────────────────────
    PrismaModule,

    // ── Auth ─────────────────────────────────────────────────────────────
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),

    // ── Feature modules ──────────────────────────────────────────────────
    CheckModule,
    KeepAliveModule,
    CategoryModule,
    UserModule,
    AuthModule,
    BusinessModule,
    ProductsModule,
    CustomerUserModule,
    QuotationModule,
    CustomerModule,
    AttributesModule,
    AdminModule,
    BannerModule,
    CartModule,
    ProformaInvoiceModule,
    CustomizationImageModule,
    ProductSearchModule,
    OrderModule,
    HomepageAdminModule,
    HomepageModule,
    PaymentModule,
    CouponModule,
    SellerModule,
    WishlistModule,
    NotificationsModule,
    SeoModule,
    BankCashChequeModule,
  ],

  providers: [
    PrismaService,
    KeepAliveService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}