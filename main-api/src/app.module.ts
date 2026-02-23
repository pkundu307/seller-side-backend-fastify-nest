import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { CheckModule } from './check/check.module';
import { KeepAliveService } from './utils/keep-alive.service';
import { PrismaService } from './prisma/prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
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
import { KeepAliveModule } from './utils/keep-alive.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SeoModule } from './seo/seo.module';
import { BankCashChequeModule } from './bank-cash-cheque/bank-cash-cheque.module';
import { QuotationModule } from './seller/quotation/quotation.module';
import { ProformaInvoiceModule } from './seller/proforma-invoice/proforma-invoice.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(
      {
        isGlobal: true
      }
    ),
    PrismaModule,

     JwtModule.registerAsync({
          useFactory: () => ({
             global: true,
            secret: "prasanna",
            signOptions: { expiresIn: '1h' },
          }),
        }),
    
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
   
    BankCashChequeModule    
  ],
  providers: [PrismaService],

})
export class AppModule {}
