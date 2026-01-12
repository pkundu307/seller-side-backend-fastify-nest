"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const jwt_1 = require("@nestjs/jwt");
const check_module_1 = require("./check/check.module");
const prisma_service_1 = require("./prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
const category_module_1 = require("./category/category.module");
const user_module_1 = require("./user/user.module");
const auth_module_1 = require("./auth/auth.module");
const business_module_1 = require("./business/business.module");
const products_module_1 = require("./products/products.module");
const customer_user_module_1 = require("./customer-user/customer-user.module");
const customer_module_1 = require("./customer/customer.module");
const attributes_module_1 = require("./attributes/attributes.module");
const admin_module_1 = require("./admin/admin.module");
const banner_module_1 = require("./banner/banner.module");
const cart_module_1 = require("./cart/cart.module");
const customization_image_module_1 = require("./customization-image/customization-image.module");
const product_search_module_1 = require("./product-search/product-search.module");
const order_module_1 = require("./order/order.module");
const homepage_admin_module_1 = require("./homepage-admin/homepage-admin.module");
const homepage_module_1 = require("./homepage/homepage.module");
const payment_module_1 = require("./payment/payment.module");
const coupon_module_1 = require("./coupon/coupon.module");
const seller_module_1 = require("./seller/seller.module");
const keep_alive_module_1 = require("./utils/keep-alive.module");
const wishlist_module_1 = require("./wishlist/wishlist.module");
const notifications_module_1 = require("./notifications/notifications.module");
const seo_module_1 = require("./seo/seo.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            config_1.ConfigModule.forRoot({
                isGlobal: true
            }),
            prisma_module_1.PrismaModule,
            jwt_1.JwtModule.registerAsync({
                useFactory: () => ({
                    global: true,
                    secret: "prasanna",
                    signOptions: { expiresIn: '1h' },
                }),
            }),
            check_module_1.CheckModule,
            keep_alive_module_1.KeepAliveModule,
            category_module_1.CategoryModule,
            user_module_1.UserModule,
            auth_module_1.AuthModule,
            business_module_1.BusinessModule,
            products_module_1.ProductsModule,
            customer_user_module_1.CustomerUserModule,
            customer_module_1.CustomerModule,
            attributes_module_1.AttributesModule,
            admin_module_1.AdminModule,
            banner_module_1.BannerModule,
            cart_module_1.CartModule,
            customization_image_module_1.CustomizationImageModule,
            product_search_module_1.ProductSearchModule,
            order_module_1.OrderModule,
            homepage_admin_module_1.HomepageAdminModule,
            homepage_module_1.HomepageModule,
            payment_module_1.PaymentModule,
            coupon_module_1.CouponModule,
            seller_module_1.SellerModule,
            wishlist_module_1.WishlistModule,
            notifications_module_1.NotificationsModule,
            seo_module_1.SeoModule
        ],
        providers: [prisma_service_1.PrismaService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map